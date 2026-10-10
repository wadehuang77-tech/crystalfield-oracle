import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mayaSummary, mockMayaReport, type MayaProductCode, type MayaLocale } from '../src/lib/maya';

const server = await createServer({ server: { host: '127.0.0.1', port: 5203, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const mode of ['disabled', 'paid', 'complimentary'] as const) for (const locale of ['zh-TW', 'en'] as const) {
    const live = mode !== 'disabled';
    const complimentary = mode === 'complimentary';
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const profiles = [
      { ...mayaForDate('1987-07-26', locale), id: 'own-personal', role: 'personal', birth_date: '1987-07-26', free_summary: '' },
      { ...mayaForDate('1990-01-01', locale), id: 'own-partner', role: 'relationship', birth_date: '1990-01-01', free_summary: '' },
    ];
    const calls: string[] = [];
    const products: string[] = [];
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5203' ? route.continue() : route.abort();
      calls.push(url.pathname);
      const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'admin-local', email: 'local@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: true });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: live, sandbox: false, ai: live, admin_preview: true, admin_live: complimentary });
      if (url.pathname === '/api/maya/profile') return reply({ profiles });
      if (url.pathname === '/api/maya/reports') return reply({ reports: [] });
      if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: [] });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: live, mode: 'production' });
      if (url.pathname === '/api/maya/admin-reports') {
        assert.ok(complimentary);
        const body = route.request().postDataJSON() as { product_code: string; locale: MayaLocale; entitlement_id?: string };
        assert.equal(body.entitlement_id, undefined);
        assert.equal(body.locale, locale);
        products.push(body.product_code);
        return reply({ id: 'admin-live-report', status: 'processing', report: null });
      }
      if (url.pathname === '/api/maya/reports/admin-live-report') return reply({ id: 'admin-live-report', status: 'processing', report: null });
      if (url.pathname === '/api/maya/checkout') {
        assert.ok(live);
        const body = route.request().postDataJSON() as { product_code: string; locale: MayaLocale };
        assert.equal(body.locale, locale);
        const amounts: Record<string, string> = { MAYA_BASIC_199: '199', MAYA_FULL_499: '499', MAYA_RELATIONSHIP_699: '699' };
        assert.ok(amounts[body.product_code]);
        products.push(body.product_code);
        return reply({ order_id: 'synthetic-order', endpoint: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5',
          fields: { MerchantID: '9999999', CustomField1: body.product_code, CustomField2: 'synthetic-order',
            TotalAmount: amounts[body.product_code], CheckMacValue: 'A'.repeat(64) } });
      }
      if (url.pathname === '/api/maya/daily') {
        const signature = mayaForDate('2026-10-10', locale);
        return reply({ daily: { ...signature, date: '2026-10-10', timezone: 'Asia/Taipei', free_summary: mayaSummary(signature, locale), awareness_prompt: 'Mock', special_day: null } });
      }
      if (url.pathname === '/api/maya/admin-preview') {
        const body = route.request().postDataJSON() as { product_code: MayaProductCode; locale: MayaLocale; profile_id: string };
        assert.equal(body.profile_id, 'own-personal');
        return reply({ mode: 'admin_mock_preview', persisted: false, report: mockMayaReport(mayaForDate('1987-07-26', locale), body.product_code === 'MAYA_RELATIONSHIP_699' ? mayaForDate('1990-01-01', locale) : null, locale, body.product_code) });
      }
      throw new Error(`Unexpected API call ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5203${locale === 'en' ? '/en' : ''}/maya-calendar/member`);
    const buttons = page.getByRole('button', { name: locale === 'en' ? 'Free admin preview (Mock, not payment)' : '管理者免費測試（Mock，非付款）', exact: true });
    await buttons.nth(2).waitFor();
    await buttons.nth(2).click({ trial: true });
    assert.equal(await buttons.count(), 3);
    const originalButtons = page.getByRole('button', { name: locale === 'en' ? 'No report entitlement' : '尚無報告權限', exact: true });
    await originalButtons.first().waitFor();
    assert.equal(await originalButtons.count(), 3, JSON.stringify(await page.getByRole('button').allTextContents()));
    const paymentButtons = page.getByRole('button', { name: complimentary
      ? locale === 'en' ? /Complimentary admin AI report/ : /管理者免費 AI 報告/
      : live
      ? locale === 'en' ? /^ECPay checkout · NT\$/ : /^綠界付款 · NT\$/
      : locale === 'en' ? /ECPay checkout: coming soon/ : /綠界付款：即將開放/ });
    assert.equal(await paymentButtons.count(), 3);
    for (let i = 0; i < 3; i++) {
      assert.equal(await paymentButtons.nth(i).isDisabled(), !live);
      assert.ok((await paymentButtons.nth(i).textContent())?.includes(`NT$${[199, 499, 699][i]}`));
      assert.ok(await originalButtons.nth(i).isDisabled());
      assert.ok((await originalButtons.nth(i).getAttribute('class'))?.includes('bg-cyan-300'));
      assert.ok(!(await buttons.nth(i).getAttribute('class'))?.includes('bg-cyan-300'));
    }
    for (let i = 0; i < 3; i++) {
      await buttons.nth(i).click();
      await page.getByRole('heading', { name: locale === 'en' ? 'Admin Mock preview (not paid AI)' : '管理者 Mock 測試報告（非付費 AI）', exact: true }).waitFor();
      await page.getByText(locale === 'en' ? 'Admin Mock preview ready below: no payment, no AI calls, no saved report.' : '管理者 Mock 預覽已產生；未付款、未呼叫 AI、未儲存報告。請往下閱讀。', { exact: true }).waitFor();
    }
    assert.equal(calls.filter(path => path === '/api/maya/admin-preview').length, 3);
    if (complimentary) {
      assert.equal(await page.getByRole('button', { name: locale === 'en' ? /^ECPay checkout ·/ : /^綠界付款 ·/ }).count(), 0);
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          page.waitForResponse(response => new URL(response.url()).pathname === '/api/maya/admin-reports'),
          paymentButtons.nth(i).click(),
        ]);
        await page.waitForURL(/reports\/admin-live-report/);
        await paymentButtons.nth(2).click({ trial: true });
      }
      assert.deepEqual(products, ['MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699']);
      assert.ok(!calls.includes('/api/maya/checkout'));
    } else if (live) {
      await page.evaluate(() => {
        HTMLFormElement.prototype.submit = function () {
          this.setAttribute('data-offline-submitted', 'true');
        };
      });
      page.on('dialog', dialog => {
        assert.ok(dialog.message().includes(locale === 'en' ? 'not a test transaction' : '不是測試交易'));
        void dialog.accept();
      });
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          page.waitForResponse(response => new URL(response.url()).pathname === '/api/maya/checkout'),
          paymentButtons.nth(i).click(),
        ]);
        await buttons.nth(2).click({ trial: true });
      }
      assert.deepEqual(products, ['MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699']);
      assert.ok(calls.includes('/api/maya/entitlements'));
      assert.ok(calls.includes('/api/maya/checkout/config'));
    } else assert.ok(!calls.some(path => /checkout|entitlements|\/reports/.test(path)));
    const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.width + 1);
    await page.close();
  }
  console.log('PASS: bilingual admin Mock isolation, gated payment buttons and enabled live-product UI using synthetic checkout only; all external payment submissions blocked. Not real OAuth/payment acceptance.');
} finally { await browser.close(); await server.close(); }
