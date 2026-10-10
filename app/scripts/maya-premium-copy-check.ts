import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { mayaForDate, type MayaLocale } from '../src/lib/maya';

const server = await createServer({ server: { host: '127.0.0.1', port: 5237, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
let writes = 0;
const labels = {
  pro: { en: 'Unlock My Galactic Life Blueprint', 'zh-TW': '解鎖我的星際生命藍圖' },
  relationship: { en: 'Unlock Our Relationship Blueprint', 'zh-TW': '解鎖雙人關係藍圖' },
};
async function mock(page: Page, locale: MayaLocale, live: boolean, member: boolean, broken = false) {
  await page.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5237' ? route.continue() : route.abort();
    if (url.pathname === '/api/track') return reply({ ok: true });
    if (req.method() !== 'GET') { writes++; return route.abort(); }
    if (url.pathname === '/api/auth/me') return reply(member ? { authenticated: true, user: { id: 'owner', email: 'offline@example.test' } } : { authenticated: false });
    if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
    if (url.pathname === '/api/maya/pro/config') return broken ? reply({ error: 'Offline configuration failure' }, 503)
      : reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: live });
    if (url.pathname === '/api/maya/relationship/config') return broken ? reply({ error: 'Offline configuration failure' }, 503)
      : reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: live });
    if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
    if (url.pathname === '/api/maya/profile') return reply({ profiles: [{ ...mayaForDate('1987-07-26', locale), id: 'personal', role: 'personal', birth_date: '1987-07-26' }] });
    if (url.pathname === '/api/maya/daily') return reply({ daily: null });
    if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [] });
    if (url.pathname.endsWith('/reports')) return reply({ reports: [] });
    if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
}
try {
  for (const kind of ['pro', 'relationship'] as const) for (const locale of ['zh-TW', 'en'] as const)
    for (const width of [390, 768, 1440]) for (const live of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await mock(page, locale, live, true);
      await page.goto(`http://127.0.0.1:5237${locale === 'en' ? '/en' : ''}/maya-calendar/${kind}`, { waitUntil: 'domcontentloaded' });
      const intro = page.locator(`[data-premium-product-intro="${kind}"]`);
      const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
      const title = intro.getByRole('heading', { name: locale === 'en' ? product.en : product.zh, level: 1, exact: true });
      await title.waitFor();
      if (live) await intro.locator('[data-product-features]').waitFor();
      else await intro.getByText(locale === 'en' ? /The full report is not available yet/ : /完整報告尚未開放/).waitFor();
      const cta = intro.locator('[data-product-cta]').getByRole(live ? 'link' : 'button', { name: `${labels[kind][locale]} · NT$${product.price}`, exact: true });
      await cta.waitFor();
      assert.equal(await intro.locator('[data-product-price]').innerText(), `NT$${product.price}`);
      for (const element of [title, intro.locator('[data-product-subtitle]'), intro.locator('[data-product-price]'), cta]) {
        const bounds = await element.boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844, `${kind} ${locale} ${width}px title/value/price/CTA must fit first viewport`);
      }
      const text = await page.locator('main').innerText();
      assert.doesNotMatch(text, /MAYA_[A-Z_0-9]+|先確認資料|付費解鎖返回後自動生成|既有.*699.*權益|server-verified|Existing NT\$699|programmatic/i);
      assert.match(await intro.innerText(), locale === 'en' ? /not.*scientific prediction/ : /不是.*科學預測/);
      if (locale === 'en') assert.doesNotMatch(text.replace('繁體中文', ''), /[\u3400-\u9fff]/u);
      assert.equal(await intro.locator('[data-product-features] li').count(), live ? kind === 'pro' ? 5 : 6 : 0);
      if (live) {
        assert.match(await intro.innerText(), kind === 'pro' ? locale === 'en' ? /15 life insights/ : /15 大生命解析/ : locale === 'en' ? /12 relationship insights/ : /12 大關係解析/);
        assert.match(await intro.innerText(), locale === 'en' ? /90-day/ : /90 天/);
        assert.equal(await cta.getAttribute('href'), `#maya-premium-${kind}`);
        await cta.click();
        assert.equal(await page.locator(`[data-premium-report-manager="${kind}"]`).count(), 1);
      } else if (kind === 'relationship') {
        assert.equal(await cta.isDisabled(), true, 'Unavailable report still requires existing access-only consent');
        await page.getByRole('checkbox').check();
        await page.locator('[data-product-cta] button:not([disabled])').waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      cases++; await page.close();
    }
  for (const locale of ['zh-TW', 'en'] as const) for (const live of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mock(page, locale, live, false);
    await page.goto(`http://127.0.0.1:5237${locale === 'en' ? '/en' : ''}/maya-calendar`, { waitUntil: 'domcontentloaded' });
    for (const kind of ['pro', 'relationship'] as const) {
      const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
      const intro = page.locator(`[data-premium-product-intro="${kind}"]`);
      if (live) await intro.locator('[data-product-features]').waitFor();
      else await intro.getByText(locale === 'en' ? /The full report is not available yet/ : /完整報告尚未開放/).waitFor();
      assert.equal(await intro.getByRole('link', { name: `${labels[kind][locale]} · NT$${product.price}`, exact: true }).getAttribute('href'), `${locale === 'en' ? '/en' : ''}/maya-calendar/${kind}`);
      assert.doesNotMatch(await intro.innerText(), /MAYA_|既有.*699|自動生成|programmatic/i);
      assert.equal(await intro.locator('[data-product-features]').count(), live ? 1 : 0);
    }
    cases++; await page.close();
  }
  for (const kind of ['pro', 'relationship'] as const) {
    const page = await browser.newPage();
    await mock(page, 'en', true, true, true);
    await page.goto(`http://127.0.0.1:5237/maya-calendar/${kind}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('[data-product-features]').count(), 0, 'Unverified config must not claim available report features');
    cases++; await page.close();
  }
  assert.equal(writes, 0);
  assert.equal(cases, 30);
  console.log('PASS 30 bilingual premium copy/layout/availability cases; title/value/price/CTA fit 390/768/1440px first viewport; IDs/technical copy hidden; unavailable/error gates retained; payment/AI/profile writes=0');
} finally { await browser.close(); await server.close(); }
