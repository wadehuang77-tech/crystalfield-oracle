import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { MAYA_SANDBOX_ENDPOINT } from '../src/lib/mayaCheckout';
import { isMayaProduct, MAYA_PRODUCTS } from '../src/lib/maya';

const output = process.env.MAYA_ACCEPTANCE_OUTPUT;
if (!output) throw new Error('Set MAYA_ACCEPTANCE_OUTPUT to a local artifact directory.');
const records: Array<{ locale: string; stage: string; status: string }> = [];
const frontend = process.env.MAYA_E2E_FRONTEND_ORIGIN;
const api = process.env.MAYA_E2E_API_ORIGIN;
function testOrigin(value: string | undefined) {
  if (!value) return false;
  const url = new URL(value);
  return url.origin === value && url.protocol === 'https:' && !['www.crystalfield101.com', 'crystalfield101.com', 'api.crystalfield101.com'].includes(url.hostname);
}
if (!testOrigin(frontend) || !testOrigin(api) || process.env.MAYA_E2E_AUTHORIZED !== 'true') {
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'maya-external-e2e.json'), JSON.stringify({
    status: 'BLOCKED', reason: 'Authorized separate HTTPS test origins and human OAuth/payment operation are required.',
    zh_TW: 'NOT RUN', en: 'NOT RUN', mocks: false,
  }, null, 2));
  console.log('BLOCKED: configure authorized HTTPS test origins; real zh-TW/en OAuth/payment E2E NOT RUN.');
} else {
  const code = process.env.MAYA_E2E_PRODUCT ?? 'MAYA_BASIC_199';
  assert.ok(isMayaProduct(code), 'Select one of the three report products.');
  const product = MAYA_PRODUCTS.find((item) => item.code === code)!;
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  async function get(page: Page, path: string) {
    return page.evaluate(async ({ api, path }) => {
      const response = await fetch(`${api}${path}`, { credentials: 'include' });
      return { status: response.status, data: await response.json() };
    }, { api: api!, path });
  }
  try {
    for (const locale of ['zh-TW', 'en']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      // Only abort unrelated traffic. Never fulfill or replace OAuth/payment/API responses.
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        const google = ['accounts.google.com', 'www.googleapis.com', 'accounts.youtube.com', 'ssl.gstatic.com', 'www.gstatic.com', 'fonts.gstatic.com'].includes(url.hostname);
        const allowed = [frontend, api, 'https://payment-stage.ecpay.com.tw'].includes(url.origin) || google;
        return allowed ? route.continue() : route.abort();
      });
      const prefix = locale === 'en' ? '/en' : '';
      const label = (zh: string, en: string) => locale === 'en' ? en : zh;
      const pass = (stage: string) => records.push({ locale, stage, status: 'PASS' });
      await page.goto(`${frontend}${prefix}/maya-calendar`, { waitUntil: 'domcontentloaded' });
      const features = await get(page, '/api/maya/config');
      assert.equal(features.status, 200);
      assert.deepEqual(features.data, { public: true, member: true, payment: false, sandbox: true, ai: true },
        'External sandbox acceptance requires explicitly enabled isolated public/member/Mock AI and sandbox-only payment gates.');
      pass('introduction');
      const oauthResponse = page.waitForResponse((response) => response.url() === `${api}/api/auth/google` && response.request().method() === 'POST', { timeout: 600_000 });
      void oauthResponse.catch(() => undefined);
      await page.locator('[data-maya-hero]').getByRole('button', { name: label('免費查詢我的 KIN', 'Find My KIN for Free'), exact: true }).click();
      console.log(`${locale}: manually sign in with a test account that has no entitlement for this product (use a separate account for each locale). Do not provide credentials to the test runner.`);
      assert.equal((await oauthResponse).status(), 200);
      await page.waitForURL(`${frontend}${prefix}/maya-calendar/member`, { timeout: 600_000 });
      assert.equal((await get(page, '/api/auth/me')).data.authenticated, true);
      assert.equal((await get(page, `/api/maya/checkout/config?locale=${locale}`)).data.enabled, true);
      pass('real-google-credential-server-accepted-and-localized-return');
      await page.locator('input[type=date]').first().fill('1987-07-26');
      await page.getByRole('button', { name: label('儲存並免費計算', 'Save and calculate for free') }).click();
      await page.getByText(label('白色巫師', 'White Wizard'), { exact: true }).first().waitFor();
      await page.reload();
      await page.getByText(label('白色巫師', 'White Wizard'), { exact: true }).first().waitFor();
      pass('kin-and-persisted-own-profile');
      await page.getByRole('heading', { name: new RegExp(label('每日免費能量', 'Free daily energy')) }).waitFor();
      pass('free-daily');
      if (code === 'MAYA_RELATIONSHIP_699') {
        await page.getByText(label('雙人關係資料（請先取得另一人同意）', 'Partner data (obtain their consent first)'), { exact: true }).click();
        await page.locator('input[type=date]').nth(1).fill('2000-01-01');
        await page.getByRole('button', { name: label('儲存另一人資料', 'Save partner profile') }).click();
      }
      const article = page.locator('main article').filter({ has: page.getByRole('heading', { name: locale === 'en' ? product.en : product.zh, exact: true }) });
      const stageRequest = page.waitForRequest((request) => request.url() === MAYA_SANDBOX_ENDPOINT && request.method() === 'POST', { timeout: 30_000 });
      void stageRequest.catch(() => undefined);
      await article.getByRole('button', { name: new RegExp(label('綠界 Sandbox 測試付款', 'ECPay Sandbox test checkout')) }).click();
      const submitted = new URLSearchParams((await stageRequest).postData() ?? '');
      assert.equal(submitted.get('MerchantID'), '3002607');
      assert.equal(submitted.get('TotalAmount'), String(product.price));
      const orderId = submitted.get('CustomField2');
      assert.ok(orderId);
      await page.waitForURL((url) => url.origin === 'https://payment-stage.ecpay.com.tw', { timeout: 30_000 });
      pass('actual-ecpay-stage-navigation');
      console.log(`${locale}: complete ONLY ECPay stage test payment, then return to the test site. Never enter real card/payment details.`);
      await page.waitForURL((url) => url.origin === frontend && url.pathname === `${prefix}/maya-calendar/member`, { timeout: 600_000 });
      await page.waitForFunction(async ({ api, orderId, locale }) => {
        const response = await fetch(`${api}/api/maya/checkout/${orderId}?locale=${locale}`, { credentials: 'include' });
        return response.ok && (await response.json()).status === 'paid';
      }, { api: api!, orderId, locale }, { timeout: 120_000, polling: 2000 });
      pass('server-verified-callback-paid-status');
      await page.reload();
      const generate = article.getByRole('button', { name: label('產生／重試報告', 'Generate / retry report'), exact: true });
      await generate.click();
      await page.getByRole('heading', { name: label('AI 生命藍圖報告', 'AI Life Blueprint Report'), exact: true }).waitFor();
      assert.equal((await get(page, '/api/maya/daily/premium')).status, 403);
      await page.getByRole('heading', { name: label('會員歷史報告', 'Member report history'), exact: true }).waitFor();
      const reportPath = new URL(page.url()).pathname.replace(/^\/en/, '');
      assert.match(reportPath, /^\/maya-calendar\/reports\/[A-Za-z0-9_-]+$/);
      const savedReport = await get(page, `/api${reportPath}?locale=${locale}`);
      assert.equal(savedReport.status, 200);
      assert.equal(savedReport.data.report.model_name, 'mock-dreamspell-ai');
      pass('authorized-mock-report-without-daily-premium');
      pass('own-report-history');
      await page.getByRole('button', { name: locale === 'en' ? 'Sign Out' : '登出', exact: true }).first().click();
      await page.waitForURL(`${frontend}${prefix}/login?**`);
      assert.equal((await get(page, '/api/maya/profile')).status, 401);
      assert.equal((await get(page, `/api${reportPath}?locale=${locale}`)).status, 401);
      pass('signout-private-api-denied');
      await context.close();
    }
    console.log('PASS: real manually operated zh-TW/en external journey; no OAuth/payment mocks.');
  } catch {
    records.push({ locale: 'current', stage: 'unfinished-real-external-journey', status: 'FAIL' });
    process.exitCode = 1;
    console.error('FAIL: external journey incomplete. Inspect the local browser; no credentials or private responses are logged.');
  } finally {
    await browser.close();
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'maya-external-e2e.json'), JSON.stringify({ mocks: false, product: code, records }, null, 2));
  }
}
