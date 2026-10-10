import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { mayaForDate } from '../src/lib/maya';

const server = await createServer({ server: { host: '127.0.0.1', port: 5231, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
let checkoutRequests = 0;
try {
  for (const kind of ['pro', 'relationship'] as const) for (const locale of ['en', 'zh-TW'] as const)
    for (const width of [390, 768, 1440]) for (const state of ['unpaid', 'paid', 'admin']) {
      const paid = state !== 'unpaid';
      const admin = state === 'admin';
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors: string[] = [];
      const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        if (/openai|ecpay/i.test(url.hostname)) throw new Error('External payment or AI is prohibited');
        if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5231' ? route.continue() : route.abort();
        if (url.pathname === '/api/track') return reply({ ok: true });
        if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
        if (url.pathname === `/api/maya/${kind}/config`) return reply(kind === 'pro'
          ? { enabled: true, payment: true, mode: 'production_entitlement', liveAi: admin }
          : { product, payment: true, reportAvailable: admin });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
        if (url.pathname === `/api/maya/${kind}/entitlements`) return reply({ entitlements: paid ? [{ id: 'grant', product_code: product.code, ...(admin ? { source: 'admin_complimentary' } : {}) }] : [] });
        if (url.pathname === `/api/maya/${kind}/reports` && req.method() === 'GET') return reply({ reports: [], reason: 'PRO_LOCAL_ONLY' });
        if (url.pathname === '/api/maya/checkout') checkoutRequests++;
        throw new Error(`Unexpected API ${req.method()} ${url.pathname}`);
      });
      await page.goto(`http://127.0.0.1:5231${locale === 'en' ? '/en' : ''}/maya-calendar/${kind}`, { waitUntil: 'domcontentloaded' });
      const button = page.getByRole('button', { name: `${admin ? locale === 'en' ? 'Unlock free admin report' : '管理者免費解鎖' : paid ? locale === 'en' ? 'Product access granted' : '已取得商品權限' : locale === 'en' ? 'Pay to unlock' : '付費解鎖'} · NT$${product.price}`, exact: true });
      if (paid) {
        await button.waitFor();
        assert.equal(await button.isDisabled(), true);
        if (admin) {
          await page.getByText(locale === 'en' ? /Complimentary admin access is verified by the server/ : /後端已驗證管理者免費權限/).waitFor();
          await page.locator(`[data-premium-report-manager="${kind}"]`).waitFor();
        }
      } else {
        if (kind === 'relationship') await page.getByRole('checkbox').check();
        await page.locator('button:not([disabled])').filter({ hasText: `NT$${product.price}` }).waitFor();
        assert.equal(await button.isEnabled(), true, 'No birth profile is needed for entitlement-only checkout');
        const dialog = page.waitForEvent('dialog');
        const click = button.click();
        const confirmation = await dialog;
        assert.match(confirmation.message(), locale === 'en' ? /access only|entitlement only/ : /僅購買/);
        await confirmation.dismiss();
        await click;
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      cases++;
      await page.close();
    }
  assert.equal(checkoutRequests, 0);
  assert.equal(cases, 36);
  console.log(`PASS ${cases} bilingual 390/768/1440px paid/unpaid/admin button cases; checkout/AI calls=0`);
  for (const locale of ['en', 'zh-TW'] as const) for (const enabled of [false, true]) {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5231' ? route.continue() : route.abort();
      if (url.pathname === '/api/track') return reply({ ok: true });
      assert.equal(req.method(), 'GET', 'Public catalogue must never generate a report');
      if (url.pathname === '/api/auth/me') return reply({ authenticated: false });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: enabled });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: enabled });
      throw new Error(`Unexpected catalogue API ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5231${locale === 'en' ? '/en' : ''}/maya-calendar`, { waitUntil: 'domcontentloaded' });
    const phrase = enabled ? locale === 'en' ? /NT\$699 provides fifteen/ : /NT\$699 提供十五篇/
      : locale === 'en' ? /Pro checkout has a separate availability gate/ : /Pro 付款依獨立功能開關開放/;
    await page.getByText(phrase).waitFor();
    const text = await page.locator('main').innerText();
    assert.match(text, enabled ? locale === 'en' ? /NT\$899 provides twelve/ : /NT\$899 提供十二篇/
      : locale === 'en' ? /NT\$899 currently buys access only/ : /NT\$899目前僅購買商品權限/);
    await page.close();
  }
  console.log('PASS four bilingual public catalogue availability cases; API generation calls=0');
  for (const locale of ['en', 'zh-TW'] as const) for (const ai of [false, true]) for (const product of ['MAYA_BASIC_199', 'MAYA_FULL_499'] as const) {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5231' ? route.continue() : route.abort();
      assert.equal(req.method(), 'GET', 'Loading owned access must not generate');
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [{ ...mayaForDate('1987-07-26', locale), id: 'personal', role: 'personal', birth_date: '1987-07-26' }] });
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname === '/api/maya/reports') return reply({ reports: [] });
      if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: [{ id: 'grant', product_code: product }] });
      throw new Error(`Unexpected feature-gate API ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5231${locale === 'en' ? '/en' : ''}/maya-calendar/member`, { waitUntil: 'domcontentloaded' });
    const label = ai ? locale === 'en' ? 'Unlock / view report' : '解鎖／查看報告'
      : locale === 'en' ? 'Entitlement granted; AI reports unavailable' : '已取得權限；AI 報告尚未開放';
    const button = page.getByRole('button', { name: `${label} · NT$${product === 'MAYA_BASIC_199' ? 199 : 499}`, exact: true });
    await button.waitFor();
    assert.equal(await button.isDisabled(), !ai);
    await page.close();
  }
  console.log('PASS eight owned basic/full bilingual AI feature-gate cases; generation/payment=0');
} finally { await browser.close(); await server.close(); }
