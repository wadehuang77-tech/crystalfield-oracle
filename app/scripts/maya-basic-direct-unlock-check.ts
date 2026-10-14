import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate } from '../src/lib/maya';
import { mayaPremiumCopy } from '../src/lib/mayaPremiumCopy';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';

const server = await createServer({ server: { host: '127.0.0.1', port: 5247, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const price of [199, 499, 699]) {
    const page = await browser.newPage();
    const prefix = locale === 'en' ? '/en' : '';
    const product = price === 199 ? 'MAYA_BASIC_199' : price === 499 ? 'MAYA_FULL_499' : MAYA_PRO_PRODUCT.code;
    const calls: string[] = [];
    const errors: string[] = [];
    let failSave = true;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5247' ? route.continue() : route.abort();
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'test', email: 'test@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/pro/reports') return reply({ reports: [] });
      if (url.pathname === '/api/maya/relationship/config') return reply({ reportAvailable: true });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [] });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (url.pathname === '/api/maya/calculate') {
        calls.push('save');
        if (failSave) return reply({ error: 'Save failed fixture' }, 503);
        const { birth_date, role } = request.postDataJSON();
        return reply({ profile: { ...mayaForDate(birth_date, locale), id: 'saved-profile', role, birth_date } });
      }
      if (url.pathname === '/api/maya/checkout') {
        calls.push('checkout');
        assert.equal(request.postDataJSON().product_code, product);
        return reply({ error: 'Checkout reached fixture' }, 503);
      }
      throw new Error(`Unexpected request ${request.method()} ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5247${prefix}/maya-calendar/${price === 699 ? 'pro' : ''}`);
    if (price !== 699) {
    const entry = page.locator(`#full-blueprint a[href$="#${product}"]`);
    assert.ok((await entry.textContent())?.includes(`NT$${price}`));
    await entry.click();
    }
    const unlock = page.getByRole('button', { name: price === 699 ? mayaPremiumCopy('pro', locale).cta : `${locale === 'en' ? 'Pay to unlock' : '付費解鎖'} · NT$${price}`, exact: true });
    await unlock.click();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(calls, []);
    await page.locator('input[type=date]').first().fill('1987-07-26');
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: 'Save failed fixture' }).waitFor();
    assert.deepEqual(calls, ['save'], 'Failed save cannot create an order');
    failSave = false;
    calls.length = 0;
    await unlock.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await page.getByRole('alert').filter({ hasText: 'Checkout reached fixture' }).waitFor();
    assert.deepEqual(calls, ['save', 'checkout'], 'One click sequence saves then unlocks, without duplicate requests');
    calls.length = 0;
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: 'Checkout reached fixture' }).waitFor();
    assert.deepEqual(calls, ['checkout'], 'Unchanged profile is reused');
    calls.length = 0;
    await page.locator('input[type=date]').first().fill('1990-01-01');
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: 'Checkout reached fixture' }).waitFor();
    assert.deepEqual(calls, ['save', 'checkout'], 'Edited birthday is saved before checkout');
    assert.deepEqual(errors, []);
    await page.close();
    cases++;
  }
  console.log(`PASS ${cases} bilingual product flows: separate entries, date validation, save failure, direct unlock, duplicate click and birthday edits; all APIs mocked.`);
} finally { await browser.close(); await server.close(); }
