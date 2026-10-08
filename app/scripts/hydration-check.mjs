import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prerenderRoutes, routeOutputPath } from '../seo/prerender-routes.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const readRoute = (path) => readFile(join(distDir, routeOutputPath(path)), 'utf8');
const hydrationEntry = await readFile(join(appDir, '..', 'src', 'main.tsx'), 'utf8');

assert.match(hydrationEntry, /hydrateRoot\(root,\s*application\)/);
assert.match(hydrationEntry, /createRoot\(root\)\.render\(application\)/);
assert.doesNotMatch(hydrationEntry, /suppressHydrationWarning/);

for (const route of prerenderRoutes) {
  const html = await readRoute(route.path);
  assert.equal([...html.matchAll(/<div id="root"/gi)].length, 1, `${route.path || '/'}: exactly one root`);
  assert.match(html, /<div id="root" data-prerendered="true"[^>]*>/, `${route.path || '/'}: SSR marker`);
  assert.equal([...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length, 1, `${route.path || '/'}: exactly one H1`);
  assert.equal([...html.matchAll(/<script type="application\/ld\+json"/gi)].length, 1, `${route.path || '/'}: one initial JSON-LD`);
  assert.ok(html.length > 1000, `${route.path || '/'}: prerendered application content must not be blank`);
}

for (const path of [
  'numerology',
  'human-design',
  'vedic-astrology',
  'en/numerology',
  'en/human-design',
  'en/vedic-astrology',
]) {
  const html = await readRoute(path);
  assert.match(html, /<form\b/i, `${path}: interactive form must be server rendered`);
  assert.match(html, /<input\b/i, `${path}: interactive input must be server rendered`);
}

for (const path of ['oracle', 'en/oracle']) {
  const html = await readRoute(path);
  assert.match(html, /<button\b/i, `${path}: interactive controls must be server rendered`);
}

const notFound = await readFile(join(distDir, '404.html'), 'utf8');
assert.equal([...notFound.matchAll(/<h1(?:\s[^>]*)?>/gi)].length, 1);

console.log(`Hydration structure checks passed for ${prerenderRoutes.length} prerender routes and 404.html.`);
