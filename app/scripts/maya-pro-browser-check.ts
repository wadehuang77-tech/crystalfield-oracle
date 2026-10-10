import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate } from '../src/lib/maya';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { mockMayaProReport } from '../../worker/src/mayaProPrompt';
import { MAYA_PRODUCTION_ENDPOINT, validateMayaCheckoutForm, type MayaCheckoutForm } from '../src/lib/mayaCheckout';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';

const server = await createServer({ server: { host: '127.0.0.1', port: 5221, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const artifacts = process.env.MAYA_PRO_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
let aiCalls = 0;
let writes = 0;
let cases = 0;
let submittedForms = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const width of [390, 768, 1440]) for (const mode of ['anonymous', 'unpaid', 'paid', 'forbidden', 'production', 'checkout'] as const) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const calls: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.href === MAYA_PRODUCTION_ENDPOINT && mode === 'checkout') {
        const fields = new URLSearchParams(request.postData() ?? '');
        assert.equal(request.method(), 'POST');
        assert.equal(fields.get('CustomField1'), MAYA_PRO_PRODUCT.code);
        assert.equal(fields.get('TotalAmount'), '699');
        submittedForms++;
        return route.fulfill({ contentType: 'text/html', body: '<h1>Offline checkout intercepted</h1>' });
      }
      if (/openai|api\/maya\/(?:admin-reports|admin-preview)|images\/generations/i.test(url.href)) aiCalls++;
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5221' ? route.continue() : route.abort();
      calls.push(url.pathname);
      if (url.pathname === '/api/track') return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
      const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (mode === 'checkout' && url.pathname === '/api/maya/checkout' && request.method() === 'POST') {
        writes++;
        const input = request.postDataJSON();
        assert.equal(input.product_code, MAYA_PRO_PRODUCT.code);
        assert.equal(input.locale, locale);
        assert.match(input.idempotency_key, /^[A-Za-z0-9_-]+$/);
        const form: MayaCheckoutForm = { order_id: 'offline-pro-order', endpoint: MAYA_PRODUCTION_ENDPOINT,
          fields: { MerchantID: '9999999', TotalAmount: '699', CustomField1: MAYA_PRO_PRODUCT.code, CustomField2: 'offline-pro-order', CheckMacValue: 'A'.repeat(64) } };
        validateMayaCheckoutForm(form, 'production');
        assert.throws(() => validateMayaCheckoutForm({ ...form, fields: { ...form.fields, TotalAmount: '899' } }, 'production'));
        assert.throws(() => validateMayaCheckoutForm(form, 'sandbox'));
        validateMayaCheckoutForm({ ...form, fields: { ...form.fields, TotalAmount: '699', CustomField1: 'MAYA_RELATIONSHIP_699' } }, 'production');
        assert.throws(() => validateMayaCheckoutForm({ ...form, fields: { ...form.fields, TotalAmount: '899', CustomField1: 'MAYA_RELATIONSHIP_699' } }, 'production'));
        validateMayaCheckoutForm({ ...form, fields: { ...form.fields, TotalAmount: '899', CustomField1: MAYA_RELATIONSHIP_PRODUCT.code } }, 'production');
        assert.throws(() => validateMayaCheckoutForm({ ...form, fields: { ...form.fields, TotalAmount: '699', CustomField1: MAYA_RELATIONSHIP_PRODUCT.code } }, 'production'));
        return reply(form);
      }
      if (request.method() !== 'GET') { writes++; throw new Error(`Unexpected generation/payment ${url.pathname}`); }
      if (url.pathname === '/api/auth/me') return reply(mode === 'anonymous' ? { authenticated: false } : { authenticated: true, user: { id: 'local-pro-owner', email: 'pro@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/auth/google/config') return reply({ client_id: null, csrf_token: 'local' });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: mode !== 'production',
        mode: mode === 'checkout' ? 'production_entitlement' : 'local_mock_only', payment: mode === 'checkout', liveAi: false });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [{ ...mayaForDate('1987-07-26', locale), id: 'local-pro-profile', birth_date: '1987-07-26', role: 'personal', free_summary: '' }] });
      if (url.pathname === '/api/maya/pro/entitlements') return reply({ entitlements: mode === 'paid' ? [{ id: 'local-pro-access', product_code: MAYA_PRO_PRODUCT.code }] : [] });
      if (url.pathname === '/api/maya/pro/reports') return reply({ reports: [] });
      if (url.pathname.startsWith('/api/maya/pro/reports/')) {
        if (mode !== 'paid' || url.pathname.endsWith('other-owner')) return reply({ error: locale === 'en' ? 'Pro report not found.' : '找不到 Pro 報告。' }, 404);
        return reply({ id: 'local-pro-report', status: 'completed', report: mockMayaProReport('1987-07-26', locale) });
      }
      throw new Error(`Unexpected API ${url.pathname}`);
    });
    const base = `http://127.0.0.1:5221${locale === 'en' ? '/en' : ''}/maya-calendar/pro`;
    await page.goto(mode === 'paid' || mode === 'forbidden' ? `${base}/reports/local-pro-report` : base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (mode === 'anonymous') {
      await page.waitForURL(/\/login\?redirect=/);
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
      assert.ok(!calls.includes('/api/maya/pro/reports') && !calls.includes('/api/maya/profile'));
    } else if (mode === 'production') {
      await page.getByText(locale === 'en' ? 'Pro is limited to local development tests and is not available in production.' : 'Pro 目前僅供本地開發測試，正式功能尚未開放。', { exact: true }).waitFor();
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
      assert.ok(!calls.includes('/api/maya/pro/reports') && !calls.includes('/api/maya/profile'));
    } else if (mode === 'checkout') {
      const button = page.getByRole('button', { name: locale === 'en' ? 'Unlock My Galactic Life Blueprint · NT$699' : '解鎖我的星際生命藍圖 · NT$699', exact: true });
      await button.waitFor();
      await page.getByText(locale === 'en' ? 'The full report is not available yet.' : '完整報告尚未開放。', { exact: true }).waitFor();
      await page.locator('button:not([disabled])').filter({ hasText: locale === 'en' ? 'Unlock My Galactic Life Blueprint · NT$699' : '解鎖我的星際生命藍圖 · NT$699' }).waitFor();
      assert.ok(await button.isEnabled());
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
      await button.click();
      await page.getByRole('heading', { name: 'Offline checkout intercepted' }).waitFor();
    } else if (mode === 'unpaid') {
      const button = page.getByRole('button', { name: locale === 'en' ? 'Generate local Pro Mock (separate entitlement required)' : '產生本地 Pro Mock（需獨立權限）', exact: true });
      await button.waitFor(); assert.ok(await button.isDisabled());
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
    } else if (mode === 'forbidden') {
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
    } else {
      await page.locator('[data-pro-report-version]').waitFor();
      assert.equal(await page.locator('[data-pro-part]').count(), 4);
      assert.equal(await page.locator('[data-kin]').count(), 260);
      assert.equal(await page.locator('[data-wave-kin]').count(), 13);
      assert.equal(await page.locator('[data-chapter-id]').count(), 12);
      assert.equal(await page.locator('[data-pro-chapter]').count(), 3);
      assert.equal(await page.locator('[data-oracle-position]').count(), 5);
      const oracleBounds = await page.locator('.maya-oracle-svg').evaluate(element => {
        const svg = element as SVGSVGElement;
        const content = Array.from(svg.querySelectorAll('text')).map(label => {
          const rect = label.getBoundingClientRect();
          const bounds = svg.getBoundingClientRect();
          return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
        });
        const analog = svg.querySelector('[data-oracle-position="analog"]')!.getBoundingClientRect();
        const antipode = svg.querySelector('[data-oracle-position="antipode"]')!.getBoundingClientRect();
        return { labelsVisible: content.every(Boolean), analogOnRight: analog.left > antipode.right };
      });
      assert.deepEqual(oracleBounds, { labelsVisible: true, analogOnRight: true });
      await page.locator('[data-oracle-position="guide"]').focus();
      await page.locator('[data-oracle-position="guide"]').press('Enter');
      assert.equal(await page.locator('[data-oracle-selected]').getAttribute('data-oracle-selected'), 'guide');
      await page.locator('[data-pro-chapter="oracle-integration"] summary').press('Enter');
      assert.ok(await page.locator('[data-pro-chapter="oracle-integration"]').getAttribute('open') !== null);
      await page.locator('.maya-chapter-nav button').nth(11).click();
      assert.equal(await page.locator('.maya-plan article').count(), 3);
      const bounds = await page.locator('.maya-cosmic-panel').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect(); return { left: box.left, right: box.right };
      }));
      assert.ok(bounds.every(box => box.left >= -1 && box.right <= width + 1), JSON.stringify(bounds));
      const waveWidth = await page.locator('[data-wave-kin]').first().boundingBox();
      assert.ok(waveWidth && waveWidth.width >= 44);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: locale === 'en' ? 'Download card SVG' : '下載身份卡 SVG', exact: true }).click();
      assert.equal((await downloadPromise).suggestedFilename(), 'dreamspell-kin-34.svg');
      if (artifacts) {
        await page.locator('.maya-oracle-svg').screenshot({ path: join(artifacts, `${locale}-${width}-oracle.png`) });
        await page.locator('[data-pro-part="d"]').screenshot({ path: join(artifacts, `${locale}-${width}-integration.png`) });
      }
      if (locale === 'en') assert.doesNotMatch((await page.locator('main').innerText()).replace('繁體中文', ''), /[\u3400-\u9fff]/u);
      await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${base}/reports/other-owner`);
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('[data-pro-report-version]').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${locale} ${width}px ${mode}`);
    cases++;
    await page.close();
  }
  assert.equal(aiCalls, 0); assert.equal(writes, 6); assert.equal(submittedForms, 6);
  console.log(`PASS ${cases} local Pro UI cases; AI=${aiCalls}; offline checkout POST=${writes}; intercepted forms=${submittedForms}; real ECPay requests=0. Fixtures are NOT real Google or paid AI acceptance.`);
  if (artifacts) await writeFile(join(artifacts, 'results.json'), JSON.stringify({ cases, aiCalls, writes, result: 'PASS' }, null, 2));
} finally { await browser.close(); await server.close(); }
