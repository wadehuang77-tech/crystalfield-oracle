import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalUrl,
  prerenderRoutes,
  routeOutputPath,
  siteUrl,
} from '../seo/prerender-routes.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const readDist = (path) => readFile(join(distDir, routeOutputPath(path)), 'utf8');
const count = (text, expression) => [...text.matchAll(expression)].length;
const visibleText = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const htmlByPath = new Map();
const titles = new Set();
for (const route of prerenderRoutes) {
  const html = await readDist(route.path);
  htmlByPath.set(route.path, html);
  assert.equal(count(html, /<div id="root"/gi), 1, `${route.path || '/'}: one React root`);
  assert.match(html, /<div id="root" data-prerendered="true"[^>]*>/, `${route.path || '/'}: hydrateable root marker`);
  assert.doesNotMatch(html, /id="seo-prerendered"/, `${route.path || '/'}: no parallel static SEO subtree`);
  assert.equal(count(html, /<title(?:\s[^>]*)?>/gi), 1, `${route.path || '/'}: exactly one title`);
  assert.equal(count(html, /<meta\s+name="description"/gi), 1, `${route.path || '/'}: one description`);
  assert.equal(count(html, /<link\s+rel="canonical"/gi), 1, `${route.path || '/'}: one canonical`);
  assert.equal(count(html, /<h1(?:\s[^>]*)?>/gi), 1, `${route.path || '/'}: exactly one H1`);

  const title = html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  assert.ok(title, `${route.path || '/'}: title must not be empty`);
  assert.ok(!titles.has(title), `${route.path || '/'}: title must be unique`);
  titles.add(title);
  assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="${canonicalUrl(route.path)}"`));
  assert.match(html, /<meta\s+name="robots"\s+content="index,\s*follow"\s*\/?>/i);

  assert.ok(visibleText(html).length >= 80, `${route.path || '/'}: prerendered page content is too short`);
  assert.ok(count(html, /<a\s+[^>]*href="[^"]+"/gi) > 0, `${route.path || '/'}: crawlable links required`);

  const structuredData = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(structuredData.length > 0, `${route.path || '/'}: JSON-LD must be in initial HTML`);
  for (const [, json] of structuredData) {
    const parsed = JSON.parse(json.replaceAll('\\u003c', '<'));
    assert.ok(parsed && typeof parsed === 'object', `${route.path || '/'}: valid JSON-LD`);
    assert.doesNotMatch(json, /AggregateRating|Review|datePublished|dateModified|"author"|"publisher"/i);
  }

  const expectedAlternate = route.alternatePath;
  if (expectedAlternate !== undefined) {
    const translatedRoute = route.language === 'zh-Hant' ? expectedAlternate : route.path;
    const chineseRoute = route.language === 'zh-Hant' ? route.path : expectedAlternate;
    for (const [language, path] of [
      ['zh-Hant', chineseRoute],
      ['en', translatedRoute],
      ['x-default', chineseRoute],
    ]) {
      assert.ok(
        html.includes(`hreflang="${language}" href="${canonicalUrl(path)}"`),
        `${route.path || '/'}: missing ${language} alternate`,
      );
    }
  }
}

const sitemap = await readFile(join(distDir, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url);
assert.equal(sitemapUrls.length, prerenderRoutes.length, 'sitemap route count must match manifest');
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap URLs must be unique');
assert.deepEqual(
  [...sitemapUrls].sort(),
  prerenderRoutes.map(({ path }) => canonicalUrl(path)).sort(),
  'sitemap URLs must exactly match generated public routes',
);
assert.doesNotMatch(sitemap, /<lastmod>/i, 'do not invent lastmod values');
assert.doesNotMatch(sitemap, /\/(?:admin|login|register|account|payment|callback|private)(?:\/|<)/i);

const robots = await readFile(join(appDir, '..', 'public', 'robots.txt'), 'utf8');
assert.equal(count(robots, /^Sitemap:\s+/gim), 1, 'robots.txt must declare exactly one sitemap');
assert.ok(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`));
assert.doesNotMatch(robots, /^\s*Disallow:\s*\/(?:assets|.*\.(?:js|css|png|jpg|svg|webp))/gim);
assert.doesNotMatch(robots, /^\s*Disallow:\s*\/(?:oracle|numerology|human-design|vedic-astrology|en\/)/gim);

const notFound = await readFile(join(distDir, '404.html'), 'utf8');
assert.match(notFound, /<meta name="robots" content="noindex, nofollow"/i);
assert.equal(count(notFound, /<h1(?:\s[^>]*)?>/gi), 1, '404 page must contain one heading');
const redirects = await readFile(join(distDir, '_redirects'), 'utf8');
assert.doesNotMatch(redirects, /^\s*\*\//m, 'do not create a catch-all SPA rewrite');
assert.doesNotMatch(redirects, /\/index\.html\s+200/, 'do not rewrite to the normalized/prerendered homepage');
const shell = await readFile(join(distDir, 'app-shell.html'), 'utf8');
assert.match(shell, /<div id="root"><\/div>/, 'SPA shell must have an empty React root');
assert.doesNotMatch(shell, /data-prerendered|<h1\b|application\/ld\+json/i, 'SPA shell must not contain prerendered SEO content');
assert.match(shell, /<meta name="robots" content="noindex, nofollow"/i);
assert.match(shell, /<script type="module"[^>]+src="\/assets\//, 'SPA shell must load the built application');
for (const route of ['/login', '/en/login', '/admin', '/en/admin', '/checkout/return', '/en/checkout/return']) {
  for (const path of [route, `${route}/`]) {
    assert.ok(redirects.split(/\r?\n/).includes(`${path} /app-shell 200`), `${path}: SPA route must have an explicit extensionless rewrite`);
  }
}
for (const line of redirects.trim().split(/\r?\n/)) {
  const [path, target, status] = line.split(/\s+/);
  assert.equal(target, '/app-shell', `${path}: use the dedicated SPA shell`);
  assert.equal(status, '200', `${path}: internal rewrite, not redirect`);
  assert.ok(!prerenderRoutes.some((route) => canonicalUrl(route.path) === `${siteUrl}${path}`), `${path}: do not rewrite public prerender routes`);
}

const headers = (await readFile(join(appDir, '..', 'public', '_headers'), 'utf8')).replace(/\r\n/g, '\n');
for (const privatePath of [
  '/admin',
  '/en/admin',
  '/login',
  '/en/login',
  '/register',
  '/en/register',
  '/auth',
  '/en/auth',
  '/membership',
  '/en/membership',
  '/checkout/*',
  '/en/checkout/*',
  '/payment',
  '/payment/*',
  '/en/payment',
  '/en/payment/*',
]) {
  assert.ok(
    headers.includes(`${privatePath}\n  X-Robots-Tag: noindex, nofollow`),
    `${privatePath}: Cloudflare Pages must send a noindex response header`,
  );
}

const sourceHtml = await readFile(join(appDir, '..', 'index.html'), 'utf8');
assert.match(sourceHtml, /gtag\('config',\s*'G-[^']+',\s*\{\s*send_page_view:\s*false\s*\}\)/);
const pageTracking = await readFile(join(appDir, '..', 'src', 'hooks', 'usePageViewTracking.ts'), 'utf8');
assert.match(pageTracking, /lastPageKeyRef\.current === pageKey/);
assert.equal(count(pageTracking, /gtag\('event',\s*'page_view'/g), 1, 'SPA route tracking must emit one GA4 page_view');

console.log(`Prerender SEO checks passed for ${prerenderRoutes.length} routes, sitemap, robots, alternates, JSON-LD, utility noindex headers, and GA4 initialization.`);
