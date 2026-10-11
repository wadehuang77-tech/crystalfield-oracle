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
    await page.addInitScript({ content: `Object.defineProperty(navigator, 'share', {
      configurable: true, value: async function(data) {
        document.documentElement.dataset.testShare = JSON.stringify(data);
      }
    });` });
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
    const birthDate = price === 499 ? '1990-01-01' : '1987-07-26';
    await dates.first().fill(birthDate);
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
      await page.getByRole('button', { name: en ? 'Discover My Galactic Signature — Free' : '免費探索我的星際印記', exact: true }).click();
      await page.getByRole('button', { name: en ? 'Share My Galactic Signature' : '分享我的星際印記', exact: true }).waitFor();
      const signature = page.locator('[data-maya-member-signature]');
      await signature.getByRole('heading', { name: en ? 'Your Personal Galactic Signature' : '你的專屬馬雅星際印記' }).waitFor();
      const expected = mayaForDate(birthDate, locale);
      assert.deepEqual(await signature.locator('dd').allTextContents(), [String(expected.kin_number), expected.solar_seal,
        expected.galactic_tone, String(expected.wavespell), String(expected.castle)]);
      assert.equal(await page.getByText(/Calculation version|計算版本/).count(), 0);
      await signature.getByRole('button').click();
      await page.waitForFunction(() => document.documentElement.dataset.testShare !== undefined);
      const shared = await page.locator('html').getAttribute('data-test-share');
      assert.ok(shared?.includes(`KIN ${expected.kin_number}`));
      assert.ok(!shared?.includes(birthDate));
      assert.equal(await signature.getByRole('link').getAttribute('href'), '#maya-life-blueprint-plans');
      await page.getByText(en ? 'Explore Your Connection' : '探索雙人星際關係', { exact: true }).click();
      await dates.nth(1).fill('1992-03-15');
      await page.getByRole('button', { name: en ? 'Save partner profile' : '儲存另一人資料', exact: true }).click();
      assert.equal(saves, 1, 'Partner data requires consent');
      await page.getByRole('checkbox', { name: en ? 'I have their permission to save their birth date.' : '我已取得另一人的同意，允許儲存其出生日期。' }).check();
      await page.getByRole('button', { name: en ? 'Save partner profile' : '儲存另一人資料', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('details dl') !== null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Mobile layout fits the viewport');
    }
    page.once('dialog', dialog => dialog.accept());
    await unlock.click();
    await page.getByRole('alert').filter({ hasText: 'Offline checkout reached' }).waitFor();
    assert.equal(checkouts, 1);
    assert.equal(saves, 2);
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
  console.log(`PASS ${cases} bilingual new-member unlock flows: missing data guidance, consent, save and checkout; no real payment or AI.`);
} finally { await browser.close(); await server.close(); }
