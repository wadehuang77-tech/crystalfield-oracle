import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mockMayaReport } from '../src/lib/maya';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { mockMayaProReport } from '../../worker/src/mayaProPrompt';
import { relationshipTestFixture } from '../src/lib/mayaRelationshipFixture';
import { MAYA_PRODUCTION_ENDPOINT } from '../src/lib/mayaCheckout';

const server = await createServer({ server: { host: '127.0.0.1', port: 5234, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = 'http://127.0.0.1:5234';
const products = [
  { code: 'MAYA_BASIC_199', price: 199, kind: null },
  { code: 'MAYA_FULL_499', price: 499, kind: null },
  { ...MAYA_PRO_PRODUCT, kind: 'pro' },
  { ...MAYA_RELATIONSHIP_PRODUCT, kind: 'relationship' },
] as const;
let cases = 0;
let syntheticCheckout = 0;
let syntheticCreates = 0;
let forbiddenExternal = 0;
try {
  for (const product of products) for (const locale of ['zh-TW', 'en'] as const)
    for (const width of [390, 768, 1440]) for (const admin of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const prefix = locale === 'en' ? '/en' : '';
      const path = `${prefix}/maya-calendar/${product.kind ?? 'member'}`;
      const errors: string[] = [];
      let paid = false, statusReads = 0, grantReads = 0, creates = 0, advances = 0;
      const total = product.kind === 'pro' ? 15 : product.kind === 'relationship' ? 12 : 0;
      const pro = mockMayaProReport('1987-07-26', locale); pro.provider = 'openai';
      const report = product.kind === 'pro' ? pro : product.kind === 'relationship'
        ? relationshipTestFixture('1987-07-26', '1990-01-01', locale)
        : mockMayaReport(mayaForDate('1987-07-26', locale), null, locale, product.code);
      const result = () => ({ id: 'saved', status: advances === total ? 'completed' : 'processing',
        report: advances === total ? report : null, completedSections: advances, totalSections: total, reason: null });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.href.startsWith(MAYA_PRODUCTION_ENDPOINT)) {
          assert.equal(admin, false);
          assert.ok(req.postData()?.includes(`TotalAmount=${product.price}`));
          return route.fulfill({ status: 303, headers: { Location: `${base}${path}?maya_order=order` }, body: '' });
        }
        if (/openai|ecpay/i.test(url.hostname)) { forbiddenExternal++; return route.abort(); }
        if (!url.pathname.startsWith('/api/')) return url.origin === base ? route.continue() : route.abort();
        if (url.pathname === '/api/track') return reply({ ok: true });
        if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: admin ? 'wadehuang77@gmail.com' : 'offline@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: admin });
        if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true, admin_live: admin });
        if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
        if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
        if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
        if (url.pathname === '/api/maya/checkout' && req.method() === 'POST') {
          assert.equal(admin, false); syntheticCheckout++;
          assert.equal(req.postDataJSON().product_code, product.code);
          return reply({ order_id: 'order', endpoint: MAYA_PRODUCTION_ENDPOINT, fields: {
            MerchantID: '1234567', TotalAmount: String(product.price), CustomField1: product.code, CustomField2: 'order', CheckMacValue: 'A'.repeat(64),
          } });
        }
        if (url.pathname === '/api/maya/checkout/order') {
          statusReads++; paid = statusReads > 2;
          return reply({ order_id: 'order', product_code: product.code, locale, status: paid ? 'paid' : 'pending', amount: product.price });
        }
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [
          { ...mayaForDate('1987-07-26', locale), id: 'personal', role: 'personal', birth_date: '1987-07-26' },
          { ...mayaForDate('1990-01-01', locale), id: 'partner', role: 'relationship', birth_date: '1990-01-01' },
        ] });
        if (url.pathname === '/api/maya/daily') return reply({ daily: null });
        if (url.pathname.endsWith('/entitlements')) {
          if (paid) grantReads++;
          const grants = admin && product.kind ? [{ id: 'grant', product_code: product.code, source: 'admin_complimentary' }]
            : paid && grantReads > 1 ? [{ id: 'grant', order_id: 'order', product_code: product.code, status: 'active' }] : [];
          return reply({ entitlements: grants });
        }
        const reportsPath = `/api/maya/${product.kind ? `${product.kind}/` : ''}reports`;
        if ((url.pathname === reportsPath || url.pathname === '/api/maya/admin-reports') && req.method() === 'POST') {
          assert.ok(admin || paid, 'No generation before server payment verification');
          const input = req.postDataJSON();
          assert.equal(input.profile_id, 'personal'); assert.equal(input.product_code, product.code);
          if (product.kind === 'relationship') {
            assert.equal(input.relationship_profile_id, 'partner'); assert.equal(input.consent, true); assert.equal(input.relationship_type, 'friends');
          }
          creates++; syntheticCreates++;
          assert.equal(creates, 1, 'Exactly one create per unlock');
          return reply(result());
        }
        if (url.pathname === reportsPath && req.method() === 'GET') return reply({ reports: creates ? [{ id: 'saved', status: result().status }] : [] });
        if (url.pathname === `${reportsPath}/saved/advance`) { advances++; return reply(result()); }
        if (url.pathname === `${reportsPath}/saved`) return reply(result());
        throw new Error(`Unexpected API ${req.method()} ${url.pathname}`);
      });
      await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
      const name = `${admin ? locale === 'en' ? 'Unlock free admin report' : '管理者免費解鎖' : locale === 'en' ? 'Pay to unlock' : '付費解鎖'} · NT$${product.price}`;
      const button = page.getByRole('button', { name, exact: true });
      await button.waitFor();
      if (product.kind === 'relationship') {
        await page.getByRole('checkbox').check();
        await page.getByRole('combobox').last().selectOption('friends');
      }
      assert.equal(creates, 0, 'Browsing does not generate');
      if (!admin) page.once('dialog', dialog => dialog.accept());
      await button.click();
      const reportSelector = product.kind === 'pro' ? '[data-pro-report-version]' : product.kind === 'relationship' ? '[data-relationship-report-version]' : null;
      if (reportSelector) await page.locator(reportSelector).waitFor();
      else {
        await page.waitForURL(/\/reports\/saved/);
        await page.getByRole('heading', { name: product.code === 'MAYA_BASIC_199'
          ? locale === 'en' ? 'AI Life Blueprint Report' : 'AI 生命藍圖報告'
          : locale === 'en' ? 'Existing report · legacy seven chapters' : '既有報告 · 舊版七篇', exact: true }).waitFor();
      }
      assert.equal(creates, 1);
      assert.equal(advances, total);
      assert.equal(await page.getByRole('button', { name: /生成正式報告|Generate live report/ }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const before = creates + advances;
      await page.reload({ waitUntil: 'domcontentloaded' });
      if (reportSelector && !admin) await page.locator(reportSelector).waitFor();
      else if (admin && product.kind) await page.getByRole('button', { name: locale === 'en' ? 'Saved report · completed' : '已儲存報告 · completed' }).waitFor();
      else await page.waitForURL(/\/reports\/saved/);
      assert.equal(creates + advances, before, 'Reload never generates or advances');
      assert.deepEqual(errors, []);
      cases++; await page.close();
    }
  for (const product of products) for (const state of ['failed', 'foreign', 'wrong-grant', 'no-intent', 'wrong-product', 'wrong-locale', 'changed-profile']) {
    const page = await browser.newPage();
    let creates = 0;
    await page.addInitScript(({ code, state }) => {
      if (state !== 'no-intent') sessionStorage.setItem('maya-unlock:owner:en:order', JSON.stringify({
        userId: 'owner', locale: 'en', product: code, orderId: 'order', profileId: 'personal', partnerId: 'partner',
        profileBirthDate: state === 'changed-profile' ? '1987-07-27' : '1987-07-26', partnerBirthDate: '1990-01-01',
        relationshipType: 'friends', consent: true, idempotencyKey: 'test-key', phase: 'waiting',
      }));
    }, { code: product.code, state });
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === base ? route.continue() : route.abort();
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (url.pathname === '/api/maya/checkout/order') return state === 'foreign' ? reply({ error: 'Order not found' }, 404)
        : reply({ order_id: 'order', product_code: state === 'wrong-product' ? 'MAYA_RELATIONSHIP_699' : product.code,
          locale: state === 'wrong-locale' ? 'zh-TW' : 'en', status: state === 'failed' ? 'failed' : 'paid', amount: product.price });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [
        { ...mayaForDate('1987-07-26', 'en'), id: 'personal', role: 'personal', birth_date: '1987-07-26' },
        { ...mayaForDate('1990-01-01', 'en'), id: 'partner', role: 'relationship', birth_date: '1990-01-01' },
      ] });
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [{ id: 'grant', order_id: state === 'wrong-grant' ? 'another-order' : 'order', product_code: product.code }] });
      if (req.method() === 'POST') { creates++; throw new Error('Unverified or missing-intent return must not generate'); }
      if (url.pathname.endsWith('/reports')) return reply({ reports: [] });
      throw new Error(`Unexpected isolation API ${url.pathname}`);
    });
    await page.goto(`${base}/en/maya-calendar/${product.kind ?? 'member'}?maya_order=order`, { waitUntil: 'domcontentloaded' });
    if (state === 'foreign' || state === 'wrong-locale' || state === 'changed-profile' || state === 'wrong-product' && product.kind) await page.getByRole('alert').first().waitFor();
    else if (state === 'wrong-grant') await page.getByText(/pending|Waiting for server payment/, { exact: false }).first().waitFor();
    else await page.getByText(/[Ss]erver payment status/, { exact: false }).first().waitFor();
    if (!product.kind || state !== 'foreign' && state !== 'wrong-product') {
      await page.getByRole('heading', { name: product.kind ? 'Birth data for this report' : 'Life blueprint plans', exact: true }).waitFor();
    }
    assert.equal(creates, 0);
    cases++; await page.close();
  }
  assert.equal(cases, 76);
  assert.equal(forbiddenExternal, 0);
  assert.equal(syntheticCheckout, 24);
  assert.equal(syntheticCreates, 48);
  console.log(`PASS ${cases} four-product bilingual unlock/admin/return isolation cases at 390/768/1440px; synthetic checkout=${syntheticCheckout}, create=${syntheticCreates}; actual AI/payment=0`);
} finally { await browser.close(); await server.close(); }
