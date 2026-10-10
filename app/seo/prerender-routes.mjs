import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readArticleSlugs = (fileName) => Object.keys(JSON.parse(
  readFileSync(fileURLToPath(new URL(`../src/data/${fileName}`, import.meta.url)), 'utf8'),
));

const publicLandingSlugs = [
  'maya-calendar',
  'oracle',
  'tarot',
  'lightworker',
  'unicorns',
  'dragons',
  'egyptian-gods',
  'work-your-light',
  'osho',
  'numerology',
  'human-design',
  'vedic-astrology',
];

const humanDesignArticleSlugs = readArticleSlugs('human-design/articles.json');
const vedicArticleSlugs = readArticleSlugs('vedic-astrology/articles.json');

const bilingualPaths = [
  { zh: '', en: 'en' },
  ...publicLandingSlugs.map((slug) => ({ zh: slug, en: `en/${slug}` })),
];

export const prerenderRoutes = [
  ...bilingualPaths.flatMap(({ zh, en }) => [
    { path: zh, language: 'zh-Hant', alternatePath: en },
    { path: en, language: 'en', alternatePath: zh },
  ]),
  ...humanDesignArticleSlugs.map((slug) => ({
    path: `human-design/${slug}`,
    language: 'zh-Hant',
  })),
  ...vedicArticleSlugs.map((slug) => ({
    path: `vedic-astrology/${slug}`,
    language: 'zh-Hant',
  })),
];

export const siteUrl = 'https://www.crystalfield101.com';

export function canonicalUrl(path) {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  return normalizedPath ? `${siteUrl}/${normalizedPath}/` : `${siteUrl}/`;
}

export function routeOutputPath(path) {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  return normalizedPath ? `${normalizedPath}/index.html` : 'index.html';
}

export function createSitemap() {
  const routes = prerenderRoutes.map((route) => {
    const alternates = route.alternatePath
      ? [
          `    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${canonicalUrl(route.language === 'zh-Hant' ? route.path : route.alternatePath)}" />`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${canonicalUrl(route.language === 'en' ? route.path : route.alternatePath)}" />`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl(route.language === 'zh-Hant' ? route.path : route.alternatePath)}" />`,
        ].join('\n')
      : '';

    return `  <url>\n    <loc>${canonicalUrl(route.path)}</loc>${alternates ? `\n${alternates}\n  ` : ''}</url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...routes,
    '</urlset>',
    '',
  ].join('\n');
}
