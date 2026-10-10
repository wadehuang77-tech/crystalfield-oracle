import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { calculationLoginRedirect, isSafeAuthRedirect } from '../src/lib/authLocale';
import { calculateNumerology } from '../src/lib/numerology';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  root,
  resolve: { alias: [
    { find: /^react-router-dom$/, replacement: join(root, 'node_modules', 'react-router-dom', 'dist', 'index.mjs') },
    { find: /^react-router$/, replacement: join(root, 'node_modules', 'react-router', 'dist', 'development', 'index.mjs') },
  ] },
  server: { middlewareMode: true }, appType: 'custom',
  ssr: { noExternal: ['react-router', 'react-router-dom'] },
});
try {
  const [{ StaticRouter }, { default: Page }, { AuthContext }, { appRoutePaths }] = await Promise.all([
    vite.ssrLoadModule('react-router-dom'),
    vite.ssrLoadModule('/src/pages/MayaCalendarPage.tsx'),
    vite.ssrLoadModule('/src/contexts/AuthContext.tsx'),
    vite.ssrLoadModule('/src/App.tsx'),
  ]);
  const { default: LandingPage } = await vite.ssrLoadModule('/src/pages/LandingPage.tsx');
  for (const language of ['', '/en']) {
    const landingHtml = renderToString(createElement(StaticRouter, { location: language || '/' }, createElement(LandingPage)));
    assert.match(landingHtml, new RegExp(`href="${language}/maya-calendar"`));
    assert.ok(landingHtml.includes(language ? 'Open the Maya Calendar homepage' : '進入瑪雅曆首頁'));
    for (const route of ['/oracle', '/numerology', '/human-design', '/vedic-astrology']) {
      assert.ok(landingHtml.includes(`href="${language}${route}"`));
    }
    for (const suffix of ['', '/member', '/results', '/daily', '/reports', '/reports/:id']) {
      assert.ok(appRoutePaths.includes(`${language}/maya-calendar${suffix}`));
    }
    const context = {
      user: null, loading: false, signInWithGoogle: async () => ({ error: null }),
    };
    const html = renderToString(createElement(StaticRouter, { location: `${language}/maya-calendar` },
      createElement(AuthContext.Provider, { value: context }, createElement(Page)))).replace(/<!--[\s\S]*?-->/g, '');
    assert.match(html, /Checking feature availability|正在確認功能狀態/);
    assert.doesNotMatch(html, /type="date"|NT\$199|report_content/);
    if (language) assert.doesNotMatch(html.replace('繁體中文', ''), /[\u3400-\u9fff]/u);
    else assert.match(html, /功能狀態/);
    const privateHtml = renderToString(createElement(StaticRouter, { location: `${language}/maya-calendar/member` },
      createElement(AuthContext.Provider, { value: context }, createElement(Page))));
    assert.doesNotMatch(privateHtml, /type="date"|KIN 34|report_content/);
    const path = `${language}/maya-calendar/member`;
    assert.equal(calculationLoginRedirect(false, path), `${language}/login?redirect=${encodeURIComponent(path)}`);
    assert.equal(calculationLoginRedirect(true, path), null);
  }
  for (const unsafe of ['https://evil.test', '//evil.test', '/\\evil.test', '/en/login']) assert.equal(isSafeAuthRedirect(unsafe), false);
  const headers = (await readFile(new URL('../public/_headers', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  for (const path of ['/maya-calendar/member', '/en/maya-calendar/member', '/maya-calendar/reports/*', '/en/maya-calendar/reports/*']) {
    assert.ok(headers.includes(`${path}\n  X-Robots-Tag: noindex, nofollow`));
  }
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.match(sitemap, /https:\/\/www\.crystalfield101\.com\/maya-calendar\//);
  assert.match(sitemap, /https:\/\/www\.crystalfield101\.com\/en\/maya-calendar\//);
  assert.doesNotMatch(sitemap, /maya-calendar\/(?:member|reports|results)/);
  for (const [date, lifePath, birthday] of [
    ['1987-07-26', 4, 8], ['2000-01-08', 11, 8], ['2000-09-29', 22, 11], ['1999-01-04', 33, 4],
  ] as const) {
    const report = calculateNumerology(date);
    assert.equal(report.lifePathNumber, lifePath);
    assert.equal(report.birthdayNumber, birthday);
    assert.equal(report.presentNumbers.length + report.missingNumbers.length, 9);
    assert.ok(report.activeGridLines.every(line => line.numbers.every(number => report.gridCounts[number] > 0)));
  }
  console.log('PASS: bilingual Maya homepage entry, existing tool links, fail-closed page rendering, protected routes, safe localized login, noindex and sitemap.');
  console.log('PASS: existing numerology arithmetic, master numbers and grid consistency (four fixed regression cases).');
} finally { await vite.close(); }
