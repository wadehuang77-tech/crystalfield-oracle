import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { humanDesignArticles, humanDesignHome } from '../src/lib/humanDesignSeo';
import { calculateHDChart } from '../src/lib/human-design/humanDesignCalc';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = join(root, 'app/dist');
// These implementations must remain byte-for-byte unchanged from the submitted project.
for (const path of ['app/src/lib/human-design/humanDesignCalc.ts', 'app/src/lib/api.ts',
  'app/src/contexts/AuthProvider.tsx', 'app/src/pages/human-design/ReportPage.tsx',
  'app/src/lib/numerology.ts']) {
  const expected = execFileSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
  assert.equal((await readFile(join(root, path), 'utf8')).replaceAll('\r\n', '\n'), expected, `Protected file changed: ${path}`);
}
const paths = ['/human-design/', ...Object.keys(humanDesignArticles).map(slug => `/human-design/${slug}/`)];
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const redirects = await readFile(join(dist, '_redirects'), 'utf8');
for (const path of paths) {
  assert.ok(sitemap.includes(`https://www.crystalfield101.com${path}`));
  assert.ok(!redirects.split('\n').some(line => line.startsWith(`${path} /app-shell`)));
}
assert.ok(!redirects.includes('/human-design/*'));
assert.ok(!redirects.includes('/en/human-design/how-to-read'));
assert.ok(!sitemap.includes('/en/human-design/how-to-read'));
for (const [slug, article] of Object.entries(humanDesignArticles)) {
  if (article.updated) {
    const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].find(match => match[1].includes(`/human-design/${slug}/`));
    assert.ok(entry?.[1].includes(`<lastmod>${article.updated}</lastmod>`));
  }
}
const localServer = createServer(async (req, res) => {
  let file = resolve(dist, '.' + decodeURIComponent(new URL(req.url!, 'http://localhost').pathname));
  if (!file.startsWith(resolve(dist))) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(await readFile(join(dist, '404.html'))); }
});
await new Promise<void>(done => localServer.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${(localServer.address() as { port: number }).port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let signedIn = false;
let intercepted = 0;
const screenshots = join(tmpdir(), 'crystalfield-human-design-seo');
await mkdir(screenshots, { recursive: true });
try {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 375, height: 850 } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        intercepted++;
        const body = url.pathname === '/api/auth/me'
          ? { authenticated: signedIn, user: signedIn ? { id: 'hd-seo-fictional', email: 'hd-seo@example.invalid' } : null }
          : { chart_id: 'hd-seo-mock-chart', membership: null, entitlements: [], capabilities: [], proofs: [], used: 0, remaining: 3 };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (url.origin !== origin) { intercepted++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (/hydration|did not match|Minified React error/i.test(message.text())) errors.push(message.text()); });
    for (const path of paths) {
      assert.equal((await page.goto(origin + path))?.status(), 200);
      if (javaScriptEnabled) await page.waitForTimeout(150);
      const slug = path.split('/')[2];
      const article = humanDesignArticles[slug];
      assert.equal(await page.title(), article?.title ?? humanDesignHome.title);
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), article?.description ?? humanDesignHome.description);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.crystalfield101.com${path}`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('h1').textContent(), article?.h1 ?? humanDesignHome.h1);
      assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
      assert.equal(await page.locator('script[data-seo-jsonld]').count(), 1);
      const schema = JSON.parse((await page.locator('script[data-seo-jsonld]').textContent())!);
      assert.equal(schema.filter((item: Record<string, string>) => item['@type'] === 'BreadcrumbList').length, 1);
      if (article) {
        for (const section of article.sections) assert.ok((await page.locator('article').innerText()).includes(section.paragraphs[0]));
        assert.equal(await page.locator('link[hreflang]').count(), 0);
        assert.equal(await page.locator('a[href="/human-design/#calculator"]').count(), 1);
        const entry = schema.find((item: Record<string, string>) => item['@type'] === 'Article');
        assert.equal(entry.dateModified, article.updated);
        assert.equal(entry.author, undefined);
      } else {
        assert.ok(await page.locator('#calculator form').isVisible());
        assert.ok(await page.locator('h1').evaluate(element => {
          let ancestor: Element | null = element;
          while (ancestor) { if (getComputedStyle(ancestor).opacity === '0') return false; ancestor = ancestor.parentElement; }
          return true;
        }), 'The initial heading must not be hidden before JS');
        assert.equal(await page.locator('link[hreflang="en"]').getAttribute('href'), 'https://www.crystalfield101.com/en/human-design/');
      }
      for (const width of [320, 375, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: overflow at ${width}`);
      }
      for (const href of await page.locator('a[href^="/human-design/"]').evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
        const target = new URL(href, origin);
        assert.ok(paths.includes(target.pathname), `Invalid article link ${href}`);
        if (target.hash) assert.equal(target.hash, '#calculator');
      }
      if (path.endsWith('/how-to-read/') || !slug) {
        await page.setViewportSize({ width: 375, height: 850 });
        await page.screenshot({ path: join(screenshots, `${slug || 'home'}-${javaScriptEnabled ? 'js' : 'nojs'}.png`), fullPage: true });
      }
      assert.equal((await page.reload())?.status(), 200);
    }
    assert.deepEqual(errors, []);
    if (javaScriptEnabled) {
      await page.goto(origin + '/human-design/');
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.locator('input[type="date"]').fill('1990-12-31');
      await page.locator('#calculator select').nth(0).selectOption('08');
      await page.locator('#calculator select').nth(1).selectOption('15');
      await page.locator('#calculator input[type="text"]').fill('Taipei');
      await page.locator('#calculator button[type="submit"]').click();
      await page.waitForFunction(() => !!localStorage.getItem('cf_human_design_state_v1'));
      const result = await page.evaluate(() => JSON.parse(localStorage.getItem('cf_human_design_state_v1')!));
      assert.deepEqual(result.chart, calculateHDChart('1990-12-31', '08:15', 'Taipei'));
      assert.equal(result.access, 'locked');
      assert.equal(result.chartId, '');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
      assert.equal(await page.locator(`a[href="/human-design/${result.chart.type}/"]`).count(), 1);
      assert.deepEqual(errors, []);
    }
    await context.close();
  }
  assert.equal((await fetch(origin + '/human-design/not-an-article/')).status, 404);
  assert.equal((await fetch(origin + '/en/human-design/how-to-read/')).status, 404);
  console.log(`PASS: ${paths.length} public pages, JS/no-JS, metadata/body/schema, 320/375/1280 widths, refresh/links, sitemap dates, local 404, guest calculation parity and noindex. Protected calculation/auth/payment files unchanged. ${intercepted} API/external requests intercepted. Screenshots: ${screenshots}`);
} finally {
  await browser.close(); localServer.closeAllConnections();
  await new Promise<void>((done, reject) => localServer.close(error => error ? reject(error) : done()));
}
