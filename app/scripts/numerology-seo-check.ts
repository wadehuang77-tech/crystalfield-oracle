import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { calculateNumerology } from '../src/lib/numerology';
import { numerologyArticles, numerologyHome } from '../src/lib/numerologySeo';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const paths = ['/numerology/', ...Object.keys(numerologyArticles).map(slug => `/numerology/${slug}/`)];
const sample = calculateNumerology('1990-12-31');
assert.equal(sample.lifePathNumber, 8);
assert.equal(sample.birthdayNumber, 4);
assert.equal(sample.personalYearNumber, 8);
assert.deepEqual(sample.missingNumbers, [4, 5, 6, 7, 8]);
assert.equal(sample.gridCounts[6], 1);
for (const [date, number] of [['2000-01-08', 11], ['2000-09-29', 22], ['1990-09-05', 33]] as const) {
  assert.equal(calculateNumerology(date).lifePathNumber, number);
}
assert.equal(calculateNumerology('2000-01-11').birthdayNumber, 11);
assert.equal(calculateNumerology('2000-01-22').birthdayNumber, 22);
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const redirects = await readFile(join(dist, '_redirects'), 'utf8');
for (const path of paths) {
  assert.ok(sitemap.includes(`https://www.crystalfield101.com${path}`));
  assert.ok(!redirects.includes(`${path} /app-shell`));
}
assert.ok(!sitemap.includes('/en/numerology/life-path-'));
assert.ok(!redirects.includes('/numerology/*'));
assert.ok(!redirects.includes('/en/numerology/how-to-calculate'));

// Local static hosting of build artifacts. Production HTTP status is not asserted here.
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
  let file = resolve(dist, '.' + path);
  if (!file.startsWith(resolve(dist))) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(await readFile(join(dist, '404.html'))); }
});
await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const address = server.address() as { port: number };
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let signedIn = false;
let blockedRequests = 0;
try {
  for (const js of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 375, height: 812 } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        blockedRequests++;
        const body = url.pathname === '/api/auth/me' ? { authenticated: signedIn, user: signedIn ? { id: 'seo-test-fictional', email: 'seo@example.invalid' } : null }
          : { membership: null, entitlements: [], capabilities: [], proofs: [], used: 0, remaining: 3 };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (url.origin !== origin) { blockedRequests++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const hydrationErrors: string[] = [];
    page.on('pageerror', error => hydrationErrors.push(error.message));
    page.on('console', message => { if (/hydration|did not match|Minified React error/i.test(message.text())) hydrationErrors.push(message.text()); });
    for (const path of paths) {
      await page.goto(origin + path);
      if (js) await page.waitForTimeout(400);
      assert.equal(await page.locator('h1').count(), 1);
      const slug = path.split('/')[2] as keyof typeof numerologyArticles;
      const article = numerologyArticles[slug];
      assert.equal(await page.title(), article?.title ?? numerologyHome.title);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.crystalfield101.com${path}`);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
      assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
      assert.equal(await page.locator('script[data-seo-jsonld]').count(), 1);
      if (article) {
        assert.equal(await page.locator('article h1').textContent(), article.h1);
        for (const section of article.sections) assert.ok((await page.locator('article').innerText()).includes(section.paragraphs[0]));
        assert.equal(await page.locator('link[hreflang]').count(), 0);
        assert.equal(await page.locator('a[href="/numerology/#calculator"]').count(), 1);
      } else {
        assert.equal(await page.locator('#calculator').count(), 1);
        assert.equal(await page.locator('link[hreflang="en"]').getAttribute('href'), 'https://www.crystalfield101.com/en/numerology/');
      }
      for (const width of [320, 375, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path}: overflow at ${width}, JS=${js}`);
      }
      for (const href of await page.locator('a[href^="/numerology/"]').evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
        const target = new URL(href, origin);
        assert.ok(paths.includes(target.pathname), `Unknown internal link: ${href}`);
        if (target.hash) assert.equal(target.hash, '#calculator');
      }
    }
    assert.deepEqual(hydrationErrors, []);
    if (js) {
      await page.goto(origin + '/numerology/');
      await page.getByRole('button', { name: '出生日期。請先登入會員以免費使用解盤功能。' }).click();
      assert.equal(await page.getByRole('dialog').count(), 1);
      signedIn = true;
      await page.reload();
      const inputs = page.locator('#calculator input[type="tel"]');
      await inputs.nth(0).fill('1990');
      await inputs.nth(1).fill('12');
      await inputs.nth(2).fill('31');
      await page.locator('#calculator button[type="submit"]').click();
      await page.waitForFunction(() => !!localStorage.getItem('cf_numerology_last_report_state'));
      const report = await page.evaluate(() => JSON.parse(localStorage.getItem('cf_numerology_last_report_state')!).report);
      assert.equal(report.lifePathNumber, 8);
      assert.equal(report.birthdayNumber, 4);
      assert.deepEqual(report.missingNumbers, [4, 5, 6, 7, 8]);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
      assert.equal(await page.evaluate(() => localStorage.getItem('cf_numerology_local_tier')), null);
    }
    await context.close();
  }
  assert.equal((await fetch(origin + '/numerology/does-not-exist/')).status, 404);
  assert.equal((await fetch(origin + '/en/numerology/life-path-1/')).status, 404);
  console.log(`PASS: calculation examples, 5 pages with/without JS, hydration, 320/375/1280 layouts, canonical, hreflang, links, sitemap, local 404, mocked login gate/calculation, private-result noindex. ${blockedRequests} external/API requests intercepted; no live AI/payment calls.`);
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
}
