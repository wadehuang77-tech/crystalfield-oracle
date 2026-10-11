import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate } from '../src/lib/maya';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { mayaPremiumCopy } from '../src/lib/mayaPremiumCopy';

const server = await createServer({ server: { host: '127.0.0.1', port: 5241, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const price of [199, 499, 899]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const en = locale === 'en', pair = price === 899;
    const product = pair ? MAYA_RELATIONSHIP_PRODUCT.code : price === 199 ? 'MAYA_BASIC_199' : 'MAYA_FULL_499';
    let saves = 0, checkouts = 0;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5241' ? route.continue() : route.abort();
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [] });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname === '/api/maya/calculate') {
        saves++;
        const input = req.postDataJSON();
        return reply({ profile: { ...mayaForDate(input.birth_date, locale), id: input.role,
          role: input.role, birth_date: input.birth_date } });
      }
      if (url.pathname === '/api/maya/checkout') {
        checkouts++;
        assert.equal(req.postDataJSON().product_code, product);
        return reply({ error: 'Offline checkout reached' }, 503);
      }
      throw new Error(`Unexpected API ${req.method()} ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5241${en ? '/en' : ''}/maya-calendar/${pair ? 'relationship' : 'member'}`);
    const unlock = page.getByRole('button', { name: pair ? mayaPremiumCopy('relationship', locale).cta
      : `${en ? 'Pay to unlock' : '付費解鎖'} · NT$${price}`, exact: true });
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: en ? /birth data|birth date/ : /出生資料|出生日期/ }).waitFor();
    assert.equal(await page.locator('input[type=date]').first().evaluate(el => el === document.activeElement), true);
    assert.equal(checkouts, 0, 'Missing profiles cannot create an order');
    const dates = page.locator('input[type=date]');
    await dates.first().fill('1987-07-26');
    if (pair) {
      const save = page.getByRole('button', { name: en ? 'Save birth data' : '儲存出生資料', exact: true });
      await save.first().click();
      await page.getByRole('alert').filter({ hasText: en ? /consent/ : /同意/ }).waitFor();
      assert.equal(saves, 0, 'No saving without relationship consent');
      await page.getByRole('checkbox').check();
      await save.first().click();
      await page.getByRole('combobox').first().getByRole('option', { name: /1987-07-26/ }).waitFor({ state: 'attached' });
      await unlock.click();
      assert.equal(checkouts, 0, 'Both profiles are required');
      assert.equal(await dates.nth(1).evaluate(el => el === document.activeElement), true);
      await dates.nth(1).fill('1990-01-01');
      await save.nth(1).click();
      await page.getByRole('combobox').nth(1).getByRole('option', { name: /1990-01-01/ }).waitFor({ state: 'attached' });
      await page.getByRole('checkbox').uncheck();
      await unlock.click();
      await page.getByRole('alert').filter({ hasText: en ? /consent/ : /同意/ }).waitFor();
      assert.equal(checkouts, 0);
      await page.getByRole('checkbox').check();
    } else {
      await page.getByRole('button', { name: en ? 'Save and calculate for free' : '儲存並免費計算', exact: true }).click();
      await page.getByRole('button', { name: en ? 'Share signature without birth data' : '分享公開印記（不包含生日）', exact: true }).waitFor();
    }
    page.once('dialog', dialog => dialog.accept());
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: 'Offline checkout reached' }).waitFor();
    assert.equal(checkouts, 1);
    assert.equal(saves, pair ? 2 : 1);
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
  console.log(`PASS ${cases} bilingual new-member unlock flows: missing data guidance, consent, save and checkout; no real payment or AI.`);
} finally { await browser.close(); await server.close(); }
