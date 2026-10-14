import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { mayaMemberSeo, mayaSeoContent, mayaSeoStructuredData } from '../src/lib/mayaSeo';

const root = path.resolve(process.env.MAYA_SEO_DIST ?? 'dist');
const read = (file: string) => readFile(path.join(root, file), 'utf8');
const count = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].length;
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const sitemap = await read('sitemap.xml');
const robots = await read('robots.txt');
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.match(robots, /Sitemap: https:\/\/www\.crystalfield101\.com\/sitemap\.xml/);
assert.doesNotMatch(sitemap, /\/(?:member|reports|login|checkout|results)(?:\/|<)/);
const headers = (await read('_headers')).replace(/\r\n/g, '\n');
const redirects = await read('_redirects');
for (const locale of ['zh-TW', 'en'] as const) {
  const prefix = locale === 'en' ? '/en' : '';
  const route = `${prefix}/maya-calendar/`;
  const content = mayaSeoContent(locale);
  const html = await read(`${route.slice(1)}index.html`);
  // A matching string in metadata or JSON-LD is not evidence of readable SSR content.
  const initialBody = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(initialBody, /<div id="root" data-prerendered="true"/);
  assert.doesNotMatch(initialBody, /<div id="root"[^>]*>\s*<\/div>/);
  assert.equal(count(html, /<h1\b/gi), 1);
  assert.equal(count(html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '', /<title\b/gi), 1);
  assert.match(html, /data-maya-seo-landing/);
  assert.ok(html.includes(content.h1));
  for (const text of [content.h1, ...content.intro, ...content.sections.flatMap(section => [section.heading, section.text]), content.faqHeading,
    ...content.faq.flatMap(([question, answer]) => [question, answer])]) {
    assert.ok(initialBody.includes(escapeHtml(text)), `${route}: readable initial body contains ${text}`);
  }
  assert.match(initialBody, /<form\b[^>]*class="maya-free-form"/);
  assert.match(initialBody, /<input\b[^>]*type="date"/);
  for (const href of ['#free-kin', '#full-blueprint', `${prefix}/maya-calendar/member`]) {
    assert.ok(initialBody.includes(`href="${href}"`), `${route}: initial body contains internal link ${href}`);
  }
  for (const line of redirects.trim().split(/\r?\n/)) {
    const [from] = line.split(/\s+/);
    assert.ok(![route, route.slice(0, -1), `${route}*`].includes(from), `${route}: no public-route SPA rewrite`);
    assert.notEqual(from, '/*', 'No catch-all SPA rewrite may hide the prerendered page');
  }
  assert.ok(html.includes(`<title>${content.title.replaceAll('&', '&amp;')}</title>`));
  assert.ok(html.includes(`name="description" content="${content.description.replaceAll('&', '&amp;')}"`));
  assert.ok(html.includes(`rel="canonical" href="https://www.crystalfield101.com${route}"`));
  assert.match(html, /name="robots" content="index, follow"/);
  for (const language of ['zh-Hant', 'en', 'x-default']) assert.ok(html.includes(`hreflang="${language}"`));
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  for (const tag of ['property="og:image"', 'name="twitter:image"']) {
    assert.ok(html.includes(`${tag} content="https://www.crystalfield101.com/20260315_164545.jpg"`));
  }
  assert.ok(html.includes('href="#free-kin"'));
  assert.ok(html.includes('href="#full-blueprint"'));
  assert.ok(sitemap.includes(`<loc>https://www.crystalfield101.com${route}</loc>`));
  const json = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json);
  assert.deepEqual(JSON.parse(json), mayaSeoStructuredData(locale));
  for (const [question, answer] of content.faq) { assert.ok(html.includes(question)); assert.ok(html.includes(answer)); }
  assert.doesNotMatch(html, /MAYA_RELATIONSHIP_899|birth_date|entitlement_id|synthetic-owner/);
  const shell = prefix ? 'maya-member-shell-en' : 'maya-member-shell';
  const member = await read(`${shell}.html`);
  assert.ok(member.includes(`<title>${mayaMemberSeo(locale).title.replaceAll('&', '&amp;')}</title>`));
  assert.match(member, /name="robots" content="noindex, follow"/);
  assert.equal(count(member, /<h1\b/gi), 1);
  assert.ok(member.includes(mayaMemberSeo(locale).h1.replaceAll('&', '&amp;')));
  assert.doesNotMatch(member, /hreflang=|application\/ld\+json/);
  assert.ok(member.includes('property="og:image" content="https://www.crystalfield101.com/20260315_164545.jpg"'));
  assert.ok(member.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(member.includes('name="twitter:image" content="https://www.crystalfield101.com/20260315_164545.jpg"'));
  assert.ok(member.includes(`rel="canonical" href="https://www.crystalfield101.com${prefix}/maya-calendar/member"`));
  assert.ok(headers.includes(`${prefix}/maya-calendar/member\n  X-Robots-Tag: noindex, follow`));
  assert.ok(redirects.includes(`${prefix}/maya-calendar/member /${shell} 200`));
  assert.doesNotMatch(member, /1987-07-26|birth_date|report_id|entitlement_id/);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const file = url.pathname === '/maya-calendar/member' ? 'maya-member-shell.html'
      : url.pathname === '/en/maya-calendar/member' ? 'maya-member-shell-en.html'
        : url.pathname.endsWith('/') ? `${url.pathname.slice(1)}index.html` : url.pathname.slice(1);
    if (!file || file.includes('..')) { res.writeHead(404).end(); return; }
    const bytes = await readFile(path.join(root, file));
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') res.writeHead(404).end();
    else { console.error(error); res.writeHead(500).end(); }
  }
});
await new Promise<void>(resolve => server.listen(5238, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const width of [390, 768, 1440]) for (const mode of ['no-js', 'api-failed', 'interactive', 'anonymous'] as const) {
    const en = locale === 'en', prefix = en ? '/en' : '';
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
      if (url.pathname === '/api/track') return reply({ ok: true });
      assert.equal(req.method(), 'GET', 'SEO browsing never creates a report, payment or birth profile');
      if (mode === 'api-failed') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Offline test"}' });
      if (url.pathname === '/api/auth/me') return reply(mode === 'anonymous' ? { authenticated: false, user: null }
        : { authenticated: true, user: { id: 'offline-owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/auth/google/config') return reply({ enabled: false });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: { code: 'MAYA_RELATIONSHIP_899', price: 899 }, payment: true, reportAvailable: true });
      if (url.pathname === '/api/maya/profile') {
        assert.notEqual(mode, 'anonymous', 'Anonymous SEO browsing must not request private profiles');
        return reply({ profiles: [] });
      }
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [] });
      throw new Error(`Unexpected API: ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5238${prefix}/maya-calendar/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1, name: mayaSeoContent(locale).h1, exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
    assert.equal(await page.title(), mayaSeoContent(locale).title);
    for (const section of mayaSeoContent(locale).sections) await page.getByRole('heading', { level: 2, name: section.heading, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    if (mode === 'api-failed') { await page.getByRole('alert').first().waitFor(); assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1); }
    if (mode === 'anonymous') {
      await page.goto(`http://127.0.0.1:5238${prefix}/maya-calendar/member`);
      await page.waitForURL(/\/login\?/);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
      assert.equal(await page.locator('[data-relationship-report-version]').count(), 0);
    }
    if (mode === 'no-js') {
      for (const section of mayaSeoContent(locale).sections) {
        await page.getByText(section.text, { exact: true }).waitFor({ state: 'visible' });
      }
      for (const [question, answer] of mayaSeoContent(locale).faq) {
        await page.getByRole('heading', { level: 3, name: question, exact: true }).waitFor();
        await page.getByText(answer, { exact: true }).waitFor({ state: 'visible' });
      }
      for (const href of ['#free-kin', '#full-blueprint', `${prefix}/maya-calendar/member`]) {
        assert.ok(await page.locator(`a[href="${href}"]`).count() > 0);
      }
      await page.goto(`http://127.0.0.1:5238${prefix}/maya-calendar/member`);
      assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), mayaMemberSeo(locale).h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
    }
    if (mode === 'interactive') {
      await page.locator('.maya-free-form button:not([disabled])').waitFor();
      await page.locator('.maya-free-form input').fill('1987-07-26');
      await page.locator('.maya-free-form button').click();
      await page.locator('[data-selected-kin="34"]').waitFor();
      const free = page.locator('[data-maya-hero]').getByRole('link', { name: en ? 'Free Dreamspell KIN Calculator' : '馬雅曆免費解盤', exact: true });
      assert.equal(await free.getAttribute('href'), '#free-kin', 'Free CTA must stay on the public calculator');
      const primary = page.locator('[data-maya-hero]').getByRole('link', { name: en ? 'Sign In to My Reports' : '登入查看我的報告', exact: true });
      await primary.click();
      await page.waitForURL(/\/maya-calendar\/member$/);
      await page.getByRole('heading', { name: en ? 'Discover My Galactic Identity' : '探索我的馬雅星際身份', exact: true }).waitFor();
      assert.equal(await page.title(), mayaMemberSeo(locale).title);
      assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), mayaMemberSeo(locale).h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
      assert.equal(await page.locator('script[data-seo-jsonld]').count(), 0, 'No stale public FAQ schema on private member route');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.crystalfield101.com${prefix}/maya-calendar/member`);
      assert.equal(await page.locator('link[hreflang]').count(), 0);
      await page.reload();
      await page.getByRole('heading', { name: en ? 'Discover My Galactic Identity' : '探索我的馬雅星際身份', exact: true }).waitFor();
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow', 'Direct member load must stay noindex after hydration');
      await page.locator('[data-maya-hero]').getByRole('link', { name: en ? 'Free Dreamspell KIN Calculator' : '馬雅曆免費解盤', exact: true }).click();
      await page.waitForURL(/\/maya-calendar\/?$/);
      assert.equal(await page.title(), mayaSeoContent(locale).title);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
      assert.equal(await page.locator('link[hreflang]').count(), 3);
    }
    assert.deepEqual(errors, [], 'SSR hydration must not fail');
    cases++; await context.close();
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
console.log(`PASS static bilingual HTML/FAQ schema/canonical/hreflang/sitemap/member noindex/share metadata; ${cases} no-JS/API-failed/hydrated/anonymous mobile/desktop cases; local KIN34/member navigation, reload and login protection; no actual payment/AI/profile writes`);
