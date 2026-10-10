import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { isMayaLocale, isMayaProduct, mayaForDate, mayaSummary, mockMayaReport, type MayaLocale, type MayaProfile, type MayaReport } from '../src/lib/maya';
import { MAYA_SANDBOX_ENDPOINT, validateMayaCheckoutForm } from '../src/lib/mayaCheckout';

const base = 'http://127.0.0.1:5199';
const output = process.env.MAYA_ACCEPTANCE_OUTPUT;
if (!output) throw new Error('Set MAYA_ACCEPTANCE_OUTPUT to a local artifact directory.');
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--proxy-server=direct://', '--proxy-bypass-list=*'],
});
const results: Array<Record<string, unknown>> = [];
const testForm = {
  order_id: 'synthetic-order', endpoint: MAYA_SANDBOX_ENDPOINT,
  fields: { MerchantID: '3002607', TotalAmount: '199', CustomField1: 'MAYA_BASIC_199', CustomField2: 'synthetic-order', CheckMacValue: 'A'.repeat(64) },
};
validateMayaCheckoutForm(testForm);
assert.throws(() => validateMayaCheckoutForm({ ...testForm, endpoint: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5' }));
assert.throws(() => validateMayaCheckoutForm({ ...testForm, fields: { ...testForm.fields, TotalAmount: '499' } }));
assert.throws(() => validateMayaCheckoutForm({ ...testForm, fields: { ...testForm.fields, HashKey: 'must-not-be-exposed' } }));
try {
  const disabledContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const disabledPage = await disabledContext.newPage();
  let memberEnabled = false;
  let configurationFailed = false;
  const deniedRequests: string[] = [];
  await disabledPage.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname === '/api/auth/me') return reply({ authenticated: false, user: null });
    if (url.pathname === '/api/maya/config') return configurationFailed
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable"}' })
      : reply({ public: memberEnabled, member: false, payment: false, sandbox: false, ai: false });
    deniedRequests.push(url.pathname);
    return route.fulfill({ status: 503, body: 'Disabled' });
  });
  await disabledPage.goto(`${base}/en/maya-calendar`);
  await disabledPage.getByRole('heading', { name: 'Dreamspell is not available yet' }).waitFor();
  assert.equal(await disabledPage.locator('input[type=date]').count(), 0);
  results.push({ width: 390, locale: 'en', stage: 'all-features-disabled', status: 'PASS' });
  memberEnabled = true;
  await disabledPage.reload();
  await disabledPage.getByRole('heading', { name: 'Dreamspell Maya 13 Moon Calendar', exact: true }).waitFor();
  assert.ok(await disabledPage.getByRole('button', { name: 'Sign in with Google to calculate' }).isDisabled());
  assert.deepEqual(deniedRequests, []);
  results.push({ width: 390, locale: 'en', stage: 'public-only-no-member-requests', status: 'PASS' });
  configurationFailed = true;
  await disabledPage.reload();
  await disabledPage.getByRole('alert').filter({ hasText: 'Feature settings could not be verified' }).waitFor();
  assert.equal(await disabledPage.locator('input[type=date]').count(), 0);
  results.push({ width: 390, locale: 'en', stage: 'config-failure-explicit-and-closed', status: 'PASS' });
  await disabledContext.close();
  for (const width of [390, 768, 1440]) {
    for (const locale of ['zh-TW', 'en'] as const) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      const errors: string[] = [];
      const networkFailures: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(base) && !request.failure()?.errorText.includes('ERR_ABORTED')) {
          networkFailures.push(new URL(request.url()).pathname);
        }
      });
      let authenticated = false;
      let purchased = false;
      let sandboxAvailable = false;
      let profiles: MayaProfile[] = [];
      const savedReports = new Map<string, MayaReport>();
      const prefix = locale === 'en' ? '/en' : '';
      const member = `${prefix}/maya-calendar/member`;
      const label = (zh: string, en: string) => locale === 'en' ? en : zh;
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        const reply = (payload: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
        const activeLocale: MayaLocale = url.searchParams.get('locale') === 'en' ? 'en' : 'zh-TW';
        const method = route.request().method();
        if (url.pathname === '/api/auth/me') return reply({ authenticated, user: authenticated ? { id: 'browser-mock-member', email: 'browser@example.test' } : null });
        if (url.pathname === '/api/auth/google/config') return reply({ error: 'Google test configuration unavailable' }, 503);
        if (url.pathname === '/api/auth/signout') { authenticated = false; return reply({ ok: true }); }
        if (!url.pathname.startsWith('/api/maya/')) return reply({});
        if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: false, sandbox: sandboxAvailable, ai: true });
        if (!authenticated) return reply({ error: 'Unauthorized' }, 401);
        if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: sandboxAvailable, mode: 'sandbox' });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: profiles.map((profile) => {
          const signature = mayaForDate(profile.birth_date, activeLocale);
          return { ...profile, ...signature, free_summary: mayaSummary(signature, activeLocale) };
        }) });
        if (url.pathname === '/api/maya/calculate') {
          const input: { birth_date: string; locale: MayaLocale; role: 'personal' | 'relationship' } = route.request().postDataJSON();
          if (input.birth_date.slice(5) === '02-29') return reply({ error: input.locale === 'en' ? 'February 29 signatures are blocked pending birth-time rules.' : '2 月 29 日的個人印記規則待確認，暫停此日期計算。' }, 422);
          const signature = mayaForDate(input.birth_date, input.locale);
          const profile: MayaProfile = { ...signature, id: 'browser-mock-profile', role: input.role, birth_date: input.birth_date, free_summary: mayaSummary(signature, input.locale) };
          profiles = [profile];
          return reply({ profile });
        }
        if (url.pathname === '/api/maya/daily') {
          const signature = mayaForDate('2026-10-10', activeLocale);
          return reply({ daily: { ...signature, date: '2026-10-10', timezone: 'Asia/Taipei', free_summary: mayaSummary(signature, activeLocale), awareness_prompt: activeLocale === 'en' ? 'What matters today?' : '今天重視什麼？', special_day: null } });
        }
        if (url.pathname === '/api/maya/daily/premium') return reply({ error: activeLocale === 'en' ? 'Daily premium is a future product.' : '每日深度商品尚未啟用。' }, 403);
        if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: purchased ? [{ id: 'browser-mock-entitlement', product_code: 'MAYA_BASIC_199', status: 'active' }] : [] });
        if (url.pathname === '/api/maya/reports' && method === 'POST') {
          const input: { locale: unknown; product_code: unknown } = route.request().postDataJSON();
          assert.ok(isMayaLocale(input.locale) && isMayaProduct(input.product_code));
          const report = mockMayaReport(mayaForDate(profiles[0].birth_date, input.locale), null, input.locale, input.product_code);
          const id = `browser-mock-report-${input.locale}`;
          savedReports.set(id, report);
          return reply({ id, status: 'completed', report });
        }
        if (url.pathname === '/api/maya/reports') return reply({ reports: Array.from(savedReports, ([id, report]) => ({ id, locale: report.locale, product_code: report.product_code, report_status: 'completed', payment_status: 'paid', created_at: '2026-10-10' })) });
        if (url.pathname.startsWith('/api/maya/reports/')) {
          const id = url.pathname.split('/').at(-1)!;
          return reply({ id, status: 'completed', report: savedReports.get(id) });
        }
        throw new Error(`Unhandled mock endpoint: ${method} ${url.pathname}`);
      });

      async function layout(stage: string, target: Page = page) {
        const dimensions = await target.evaluate(() => ({
          viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
          overflowing: Array.from(document.querySelectorAll('main *')).filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && (box.right > window.innerWidth + 1 || box.left < -1);
          }).slice(0, 8).map((element) => `${element.tagName}.${element.className}`),
        }));
        assert.ok(dimensions.scrollWidth <= dimensions.viewport + 1, `${width}/${locale}/${stage}: horizontal overflow ${JSON.stringify(dimensions)}`);
        for (const control of await target.locator('main button:visible:not(:disabled), main input:visible').all()) {
          await control.scrollIntoViewIfNeeded();
          const reachable = await control.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return hit === element || element.contains(hit);
          });
          assert.ok(reachable, `${width}/${locale}/${stage}: control is covered`);
        }
        results.push({ width, locale, stage, status: 'PASS', ...dimensions });
      }
      await page.goto(`${base}${prefix}/maya-calendar`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { level: 1 }).waitFor();
      const capturedForm = await page.evaluate(async (form) => {
        const modulePath = '/src/lib/mayaCheckout.ts';
        const { submitMayaCheckout } = await import(modulePath);
        const original = HTMLFormElement.prototype.submit;
        let captured: { action: string; method: string; amount: string } | null = null;
        HTMLFormElement.prototype.submit = function () {
          captured = { action: this.action, method: this.method, amount: String(new FormData(this).get('TotalAmount')) };
        };
        try { submitMayaCheckout(form); } finally { HTMLFormElement.prototype.submit = original; }
        return captured;
      }, testForm);
      assert.deepEqual(capturedForm, { action: MAYA_SANDBOX_ENDPOINT, method: 'post', amount: '199' });
      validateMayaCheckoutForm({ ...testForm, endpoint: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5',
        fields: { ...testForm.fields, MerchantID: '87654321' } }, 'production');
      await layout('introduction');
      await page.getByRole('button', { name: label('Google 登入後免費計算', 'Sign in with Google to calculate'), exact: true }).click();
      await page.waitForURL(`**${prefix}/login?**`);
      assert.equal(new URL(page.url()).searchParams.get('redirect'), member);
      await page.getByText('Google test configuration unavailable', { exact: true }).waitFor();
      await layout('login-unconfigured');

      // This explicitly mocks authentication; it is not a Google OAuth pass.
      authenticated = true;
      await page.goto(`${base}${member}`);
      await page.locator('input[type=date]').first().fill('1987-07-26');
      await page.getByRole('button', { name: label('儲存並免費計算', 'Save and calculate for free') }).click();
      await page.getByText('34', { exact: true }).first().waitFor();
      await page.getByText(label('白色巫師', 'White Wizard'), { exact: true }).first().waitFor();
      await layout('birth-input-result-daily-plans');
      assert.equal(await page.getByRole('button', { name: label('尚無報告權限', 'No report entitlement') }).count(), 3);
      for (const control of await page.getByRole('button', { name: label('尚無報告權限', 'No report entitlement') }).all()) {
        assert.ok(await control.isDisabled());
      }
      await page.locator('input[type=date]').first().fill('2000-02-29');
      await page.getByRole('button', { name: label('儲存並免費計算', 'Save and calculate for free') }).click();
      await page.getByRole('alert').filter({ hasText: label('2 月 29 日', 'February 29') }).waitFor();
      assert.equal(profiles[0].birth_date, '1987-07-26');
      await layout('leap-day-error-free-access');
      sandboxAvailable = true;
      await page.reload();
      const sandboxButtons = page.getByRole('button', { name: new RegExp(label('綠界 Sandbox 測試付款', 'ECPay Sandbox test checkout')) });
      await sandboxButtons.first().waitFor();
      assert.equal(await sandboxButtons.count(), 3);
      assert.ok(await sandboxButtons.nth(0).isEnabled());
      assert.ok(await sandboxButtons.nth(1).isEnabled());
      assert.ok(await sandboxButtons.nth(2).isDisabled(), 'Relationship checkout requires the partner profile.');
      await layout('sandbox-gated-plan-ui-mock-only');
      purchased = true;
      await page.reload();
      await page.getByRole('button', { name: label('產生／重試報告', 'Generate / retry report') }).waitFor();
      await page.getByRole('button', { name: label('深度每日指引（未來商品）', 'Premium daily guidance (future product)') }).click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('button', { name: label('產生／重試報告', 'Generate / retry report') }).click();
      await page.getByRole('heading', { name: label('AI 生命藍圖報告', 'AI Life Blueprint Report') }).waitFor();
      await layout('mock-report-reading');
      await mkdir(output, { recursive: true });
      await page.screenshot({ path: join(output, `maya-${locale}-${width}.png`), fullPage: true });
      await page.locator('main').getByRole('link', { name: locale === 'en' ? '繁體中文' : 'English', exact: true }).click();
      await page.getByRole('heading', { name: locale === 'en' ? 'Dreamspell 瑪雅 13 月亮曆' : 'Dreamspell Maya 13 Moon Calendar', exact: true }).waitFor();
      await layout('language-switch-member-retained');
      await page.getByText(locale === 'en' ? '白色巫師' : 'White Wizard', { exact: true }).first().waitFor();
      await page.evaluate(async () => { await fetch('/api/auth/signout', { method: 'POST' }); });
      await page.reload();
      await page.waitForURL(`**${locale === 'en' ? '' : '/en'}/login?**`);
      assert.equal(await page.getByRole('heading', { name: /AI Life Blueprint Report|AI 生命藍圖報告/ }).count(), 0);
      results.push({ width, locale, stage: 'mock-signout-private-page-denied', status: 'PASS' });
      assert.deepEqual(errors, [], `${width}/${locale}: console errors`);
      assert.deepEqual(networkFailures, [], `${width}/${locale}: local network failures`);
      await context.close();
    }
  }
  await writeFile(join(output, 'maya-browser-results.json'), JSON.stringify({ browser: 'same-host installed Chrome', auth: 'MOCK ONLY; real Google OAuth NOT RUN', results }, null, 2));
  console.log(`PASS: ${results.length} viewport/stage checks (390/768/1440, zh-TW/en); mock auth/API only.`);
} finally { await browser.close(); }
