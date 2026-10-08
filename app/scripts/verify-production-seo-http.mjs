import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prerenderRoutes, canonicalUrl, createSitemap, siteUrl } from '../seo/prerender-routes.mjs';

const configuredUrl = process.argv[2] ?? process.env.SEO_PREVIEW_URL;
assert.ok(configuredUrl, 'Pass a Cloudflare Pages preview URL or set SEO_PREVIEW_URL.');

const baseUrl = new URL(configuredUrl);
const allowPreviewNoindex = process.argv.includes('--allow-preview-noindex');
assert.ok(
  baseUrl.hostname.endsWith('.pages.dev') && baseUrl.hostname !== 'pages.dev',
  'HTTP verification is restricted to *.pages.dev preview deployments.',
);

const checks = [];
const hreflangFailures = [];
const utilityFailures = [];
for (const { path } of prerenderRoutes) {
  const expectedCanonical = canonicalUrl(path);
  const routePath = new URL(expectedCanonical).pathname;
  const response = await fetch(new URL(routePath, baseUrl), { redirect: 'follow' });
  const contentType = response.headers.get('content-type') ?? '';
  const html = await response.text();

  assert.equal(response.status, 200, `${expectedCanonical}: expected HTTP 200`);
  assert.match(contentType, /^text\/html\b/i, `${expectedCanonical}: expected text/html`);
  assert.match(html, /<title(?:\s[^>]*)?>\s*[^<]+\s*<\/title>/i, `${expectedCanonical}: title required`);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${expectedCanonical}: description required`);
  assert.match(
    html,
    new RegExp(`<link\\s+rel="canonical"\\s+href="${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i'),
    `${expectedCanonical}: canonical must match route`,
  );
  assert.match(html, /<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i, `${expectedCanonical}: H1 required`);
  assert.equal([...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length, 1, `${expectedCanonical}: one H1`);
  const structuredData = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(structuredData.length, 1, `${expectedCanonical}: one JSON-LD`);
  JSON.parse(structuredData[0][1]);
  assert.match(html, /<div id="root" data-prerendered="true"[^>]*>/i, `${expectedCanonical}: prerender content required`);
  const mainContent = html.match(/<div id="root"[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
  assert.ok(mainContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length >= 80, `${expectedCanonical}: main content required`);
  const links = [...mainContent.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  const internalLinks = links.filter((href) => href.startsWith('/') || href.startsWith(`${siteUrl}/`));
  assert.ok(internalLinks.length > 0, `${expectedCanonical}: crawlable internal links required`);
  if (path.startsWith('en')) {
    assert.ok(internalLinks.some((href) => new URL(href, siteUrl).pathname.startsWith('/en/')), `${expectedCanonical}: English internal links required`);
  }
  const route = prerenderRoutes.find((entry) => entry.path === path);
  if (route.alternatePath !== undefined) {
    for (const [language, alternatePath] of [
      ['zh-Hant', route.language === 'zh-Hant' ? path : route.alternatePath],
      ['en', route.language === 'en' ? path : route.alternatePath],
      ['x-default', route.language === 'zh-Hant' ? path : route.alternatePath],
    ]) {
      if (!html.includes(`hreflang="${language}" href="${canonicalUrl(alternatePath)}"`)) {
        hreflangFailures.push(`${expectedCanonical}: ${language} hreflang missing`);
      }
    }
  }
  assert.match(html, /<meta\s+name="robots"\s+content="index,\s*follow"/i, `${expectedCanonical}: indexable robots meta required`);
  const xRobotsTag = response.headers.get('x-robots-tag') ?? '';
  if (allowPreviewNoindex) {
    assert.ok(!xRobotsTag || /^noindex$/i.test(xRobotsTag.trim()), `${expectedCanonical}: only Cloudflare's preview-specific noindex is permitted`);
  } else {
    assert.doesNotMatch(xRobotsTag, /noindex/i, `${expectedCanonical}: no noindex response header`);
  }
  assert.equal(new URL(response.url).pathname, routePath, `${expectedCanonical}: no unexpected redirect`);
  if (routePath !== '/') {
    const redirect = await fetch(new URL(routePath.replace(/\/$/, ''), baseUrl), { redirect: 'manual' });
    assert.equal(redirect.status, 308, `${expectedCanonical}: slashless route must redirect to canonical path`);
    assert.equal(new URL(redirect.headers.get('location'), baseUrl).pathname, routePath, `${expectedCanonical}: redirect location must match canonical path`);
    await redirect.body?.cancel();
  }

  checks.push({
    route: routePath,
    status: response.status,
    contentType,
    cacheControl: response.headers.get('cache-control') ?? 'NOT SET',
    xRobotsTag: response.headers.get('x-robots-tag') ?? 'NOT SET',
  });
}

for (const path of ['/this-page-does-not-exist-987654', '/foo/bar/not-real', '/en/not-real', '/oracle/not-real']) {
  const response = await fetch(new URL(path, baseUrl), { redirect: 'follow' });
  const html = await response.text();
  assert.equal(response.status, 404, `${path}: unknown route must return HTTP 404`);
  assert.equal(new URL(response.url).pathname, path, `${path}: unknown route must not redirect elsewhere`);
  assert.match(html, /<h1(?:\s[^>]*)?>[\s\S]*?(?:找不到|not be found)[\s\S]*?<\/h1>/i, `${path}: 404 UI required`);
}

const sitemapResponse = await fetch(new URL('/sitemap.xml', baseUrl));
assert.equal(sitemapResponse.status, 200, 'sitemap must return HTTP 200');
assert.match(sitemapResponse.headers.get('content-type') ?? '', /(?:application|text)\/xml/i);
assert.equal((await sitemapResponse.text()).replace(/\r\n/g, '\n'), createSitemap(), 'sitemap must match the 43-route production-canonical XML');
const robotsResponse = await fetch(new URL('/robots.txt', baseUrl));
assert.equal(robotsResponse.status, 200, 'robots.txt must return HTTP 200');
const robots = await robotsResponse.text();
const intendedRobots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
assert.equal(robots.replace(/\r\n/g, '\n'), intendedRobots.replace(/\r\n/g, '\n'), 'robots.txt must match production-intended configuration');
assert.match(robots, /Sitemap: https:\/\/www\.crystalfield101\.com\/sitemap\.xml/);

const utilityChecks = [];
const utilityPaths = ['/login', '/en/login', '/admin', '/en/admin', '/checkout/return', '/en/checkout/return'];
for (const path of [
  ...utilityPaths.flatMap((path) => [path, `${path}/`]),
  ...['/checkout/return', '/en/checkout/return'].flatMap((path) => [
    `${path}?orderId=TEST123`,
    `${path}?order_id=SEO_PREVIEW_TEST123&order_token=TEST_ONLY&return_to=%2Fen%2Ftarot%3Fspread%3Dsingle`,
  ]),
]) {
  const requestedUrl = new URL(path, baseUrl);
  const response = await fetch(requestedUrl, { redirect: 'manual' });
  const html = await response.text();
  const location = response.headers.get('location');
  if (response.status !== 200 || location || response.url !== requestedUrl.href
      || !/^text\/html\b/i.test(response.headers.get('content-type') ?? '')
      || !/<div id="root"><\/div>/.test(html) || /data-prerendered/.test(html)) {
    utilityFailures.push(`${path}: expected HTTP 200 empty React shell at the unchanged URL; got ${response.status}, Location: ${location ?? 'NONE'}, final URL: ${response.url}`);
  }
  if (!/noindex/i.test(response.headers.get('x-robots-tag') ?? '')
      || !/<meta name="robots" content="noindex, nofollow"/i.test(html)) {
    utilityFailures.push(`${path}: utility noindex response header missing`);
  }
  utilityChecks.push({ path, status: response.status, location, finalUrl: response.url });
}

console.log(`Core HTTP/content checks passed for ${checks.length} prerender routes and four unknown routes.`);
console.log(`Sitemap, robots, internal links, and canonical redirects passed. Preview-specific noindex allowance: ${allowPreviewNoindex}.`);
for (const check of checks) {
  console.log(`${check.status} ${check.route} | ${check.contentType} | Cache-Control: ${check.cacheControl} | X-Robots-Tag: ${check.xRobotsTag}`);
}
if (hreflangFailures.length > 0) {
  console.error(`Hreflang verification FAILED:\n${hreflangFailures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Hreflang verification passed.');
}
if (utilityFailures.length > 0) {
  console.error(`SPA utility route verification FAILED:\n${utilityFailures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('SPA utility route verification passed.');
}
for (const check of utilityChecks) {
  console.log(`${check.status} ${check.path} | Location: ${check.location ?? 'NONE'} | Final URL: ${check.finalUrl}`);
}
