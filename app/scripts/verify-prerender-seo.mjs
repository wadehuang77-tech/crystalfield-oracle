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
    assert.doesNotMatch(
      json,
      /"@type"\s*:\s*"(?:AggregateRating|Review)"|"(?:datePublished|dateModified|author|publisher)"\s*:/i,
    );
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

const vedicLanding = JSON.parse(await readFile(
  join(appDir, '..', 'src', 'data', 'vedic-astrology', 'landing.json'),
  'utf8',
));
const vedicLandingChecks = [
  {
    path: 'vedic-astrology',
    language: 'zh-Hant',
    content: vedicLanding.zhHant,
    headings: [
      '印度占星是什麼？',
      '吠陀占星（Vedic Astrology）',
      '印度占星與西洋占星有何不同？',
      '出生盤 D1 是什麼？',
      'D9 Navamsa',
      'D10 Dasamsa',
      '月宿 Nakshatra 與 Pada',
      'Vimshottari Dasha 大運系統',
      '感情、婚姻、事業與財富',
      '免費出生盤與付費九大深度解析有何差別？',
      '如何取得自己的印度占星報告？',
    ],
    languageLinks: ['/', '/oracle', '/numerology', '/human-design'],
  },
  {
    path: 'en/vedic-astrology',
    language: 'en',
    content: vedicLanding.en,
    headings: [
      'What Is Vedic Astrology (Jyotish)?',
      'Vedic and Western Astrology',
      'What Is the D1 Birth Chart?',
      'D9 Navamsa: Relationships and Maturity',
      'D10 Dasamsa: Career Themes',
      'Nakshatra and Pada',
      'Vimshottari Dasha Periods',
      'Relationships, Marriage, Career, and Wealth',
      'Free Birth Chart and Nine In-Depth Readings',
      'How to Get Your Vedic Astrology Report',
    ],
    languageLinks: ['/en/', '/en/oracle', '/en/numerology', '/en/human-design'],
  },
];
for (const { path, language, content, headings, languageLinks } of vedicLandingChecks) {
  const html = htmlByPath.get(path);
  assert.ok(html, `${path}: prerendered Vedic landing page required`);
  const escaped = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  assert.ok(html.includes(`<title>${escaped(content.title)}</title>`), `${path}: requested SEO title`);
  assert.ok(html.includes(`name="description" content="${escaped(content.description)}"`), `${path}: requested SEO description`);
  assert.ok(html.includes(`<h1`) && html.includes(`>${escaped(content.h1)}</h1>`), `${path}: requested H1`);
  for (const heading of headings) {
    assert.ok(html.includes(heading), `${path}: visible section "${heading}"`);
  }
  for (const link of languageLinks) {
    assert.ok(html.includes(`href="${link}"`), `${path}: server-rendered internal link to ${link}`);
  }
  assert.match(html, /<meta\s+property="og:title"/i, `${path}: Open Graph metadata`);
  assert.match(html, /<meta\s+name="twitter:card"/i, `${path}: Twitter Card metadata`);

  const [jsonLdBlock] = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const structuredData = JSON.parse(jsonLdBlock[1].replaceAll('\\u003c', '<'));
  const structuredNodes = Array.isArray(structuredData) ? structuredData : [structuredData];
  const webpage = structuredNodes.find((item) => item['@type'] === 'WebPage');
  const breadcrumbs = structuredNodes.find((item) => item['@type'] === 'BreadcrumbList');
  const faq = structuredNodes.find((item) => item['@type'] === 'FAQPage');
  assert.equal(webpage?.inLanguage, language, `${path}: localized WebPage JSON-LD`);
  assert.ok(breadcrumbs, `${path}: matching visible breadcrumb JSON-LD`);
  assert.deepEqual(
    breadcrumbs.itemListElement.map(({ name }) => name),
    language === 'en' ? ['Home', 'Vedic Astrology'] : ['首頁', '印度占星'],
    `${path}: BreadcrumbList matches the visible breadcrumb labels`,
  );
  assert.ok(faq, `${path}: FAQPage only for visible FAQs`);
  assert.deepEqual(
    faq.mainEntity.map(({ name, acceptedAnswer }) => [name, acceptedAnswer.text]),
    content.faq,
    `${path}: FAQ JSON-LD matches visible FAQ copy`,
  );
  assert.doesNotMatch(html.match(/<div id="root"[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '', /\b(?:birth_date|birth_time|birth_place|chart_id|chart_token|order_token)\b/i, `${path}: no private chart or order data`);
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
assert.equal(count(sourceHtml, /gtag\('config',\s*'G-FY6V8NJNHW'/g), 1, 'Initialize the existing Google tag once');
const pageTracking = await readFile(join(appDir, '..', 'src', 'hooks', 'usePageViewTracking.ts'), 'utf8');
assert.match(pageTracking, /lastPageKeyRef\.current === pageKey/);
assert.doesNotMatch(pageTracking, /\bgtag\b/, 'Enhanced Measurement owns GA4 page views; do not also emit them from the router');

console.log(`Prerender SEO checks passed for ${prerenderRoutes.length} routes, sitemap, robots, alternates, JSON-LD, utility noindex headers, and GA4 initialization.`);
