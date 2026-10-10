import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { MAYA_PRODUCTION_ENDPOINT } from '../src/lib/mayaCheckout';

const server = await createServer({ server: { host: '127.0.0.1', port: 5225, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let forms = 0;
let cases = 0;
try {
  for (const locale of ['en', 'zh-TW'] as const) for (const width of [390, 768, 1440]) for (const state of ['anonymous', 'unpaid', 'paid', 'disabled'] as const) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url());
      assert.doesNotMatch(url.href, /openai|images\/generations/i);
      if (url.href === MAYA_PRODUCTION_ENDPOINT) {
        const fields = new URLSearchParams(request.postData() ?? '');
        assert.equal(fields.get('CustomField1'), MAYA_RELATIONSHIP_PRODUCT.code);
        assert.equal(fields.get('TotalAmount'), '899');
        forms++;
        return route.fulfill({ contentType: 'text/html', body: '<h1>Offline intercepted payment</h1>' });
      }
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5225' ? route.continue() : route.abort();
      const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (url.pathname === '/api/auth/me') return reply(state === 'anonymous' ? { authenticated: false } : { authenticated: true, user: { id: 'test-member', email: 'member@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/auth/google/config') return reply({ client_id: null, csrf_token: 'offline' });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: state !== 'disabled', reportAvailable: false });
      if (url.pathname === '/api/maya/relationship/entitlements') return reply({ entitlements: state === 'paid' ? [{ id: 'owned899', product_code: MAYA_RELATIONSHIP_PRODUCT.code }] : [] });
      if (url.pathname === '/api/maya/checkout') {
        assert.equal(state, 'unpaid');
        assert.equal(request.method(), 'POST');
        assert.equal(request.postDataJSON().product_code, MAYA_RELATIONSHIP_PRODUCT.code);
        assert.equal(request.postDataJSON().locale, locale);
        return reply({ order_id: 'offline-order', endpoint: MAYA_PRODUCTION_ENDPOINT, fields: {
          MerchantID: '9999999', TotalAmount: '899', CustomField1: MAYA_RELATIONSHIP_PRODUCT.code,
          CustomField2: 'offline-order', CheckMacValue: 'A'.repeat(64),
        } });
      }
      throw new Error(`Unexpected request ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5225${locale === 'en' ? '/en' : ''}/maya-calendar/relationship`, { waitUntil: 'domcontentloaded' });
    const buy = page.getByRole('button', { name: new RegExp('NT\\$899') });
    await buy.waitFor();
    if (state === 'unpaid') {
      const checkbox = page.getByRole('checkbox');
      await checkbox.waitFor();
      assert.ok(await buy.isDisabled());
      await checkbox.check();
      await page.locator('button:not([disabled])').filter({ hasText: 'NT$899' }).waitFor();
      await buy.click();
      await page.getByRole('heading', { name: 'Offline intercepted payment' }).waitFor();
    } else if (state === 'anonymous') {
      await page.locator('button:not([disabled])').filter({ hasText: 'NT$899' }).waitFor();
      await buy.click();
      await page.waitForURL(/\/login\?redirect=/);
    } else if (state === 'paid') {
      await page.getByRole('button', { name: locale === 'en' ? 'Product access granted · NT$899' : '已取得商品權限 · NT$899' }).waitFor();
      assert.ok(await buy.isDisabled());
    } else assert.ok(await buy.isDisabled());
    assert.deepEqual(errors, []);
    cases++; await page.close();
  }
  assert.equal(forms, 6);
  console.log(`PASS ${cases} bilingual responsive relationship cases; offline forms=${forms}; actual ECPay/AI calls=0`);
} finally { await browser.close(); await server.close(); }
