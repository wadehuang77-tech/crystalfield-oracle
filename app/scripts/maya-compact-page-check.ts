import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mockMayaReport } from '../src/lib/maya';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';

const server = await createServer({ server: { host: '127.0.0.1', port: 5235, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const width of [390, 768, 1440])
    for (const path of ['', '/member', '/reports/saved']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors: string[] = [];
      const report = mockMayaReport(mayaForDate('1987-07-26', locale), null, locale, 'MAYA_BASIC_199');
      let listReads = 0;
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const req = route.request(), url = new URL(req.url());
        const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5235' ? route.continue() : route.abort();
        assert.equal(req.method(), 'GET', 'No deletion, payment or AI request is permitted');
        if (url.pathname === '/api/track') return reply({ ok: true });
        if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
        if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
        if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
        if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [{ ...mayaForDate('1987-07-26', locale), id: 'personal', birth_date: '1987-07-26', role: 'personal' }] });
        if (url.pathname === '/api/maya/daily') return reply({ daily: null });
        if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: [] });
        if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
        if (url.pathname === '/api/maya/reports') {
          listReads++;
          return reply({ reports: [{ id: 'saved', product_code: 'MAYA_BASIC_199', locale, created_at: 'offline fixture', report_status: 'completed', payment_status: 'paid' }] });
        }
        if (url.pathname === '/api/maya/reports/saved') return reply({ id: 'saved', status: 'completed', report });
        throw new Error(`Unexpected request ${url.pathname}`);
      });
      await page.goto(`http://127.0.0.1:5235${locale === 'en' ? '/en' : ''}/maya-calendar${path}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: locale === 'en' ? '260 KIN galactic matrix' : '260 KIN 星際矩陣', exact: true }).waitFor();
      if (path) {
        await page.locator('[data-selected-kin="34"]').waitFor();
        await page.getByText(locale === 'en' ? 'Your birth KIN' : '你的出生 KIN', { exact: false }).waitFor();
      } else {
        await page.locator('.maya-free-form input').fill('1987-07-26');
        await page.locator('.maya-free-form').getByRole('button', { name: locale === 'en' ? 'Find My KIN for Free' : '免費查詢我的 KIN', exact: true }).click();
        await page.locator('[data-selected-kin="34"]').waitFor();
      }
      const compact = path !== '/reports/saved';
      assert.equal(await page.getByRole('grid').count(), compact ? 0 : 1);
      assert.equal(await page.locator('.maya-matrix-cell').count(), compact ? 0 : 260);
      assert.equal(await page.getByRole('heading', { name: locale === 'en' ? 'Data management' : '資料管理', exact: true }).count(), compact ? 0 : 1);
      assert.equal(await page.getByRole('heading', { name: locale === 'en' ? 'Member report history' : '會員歷史報告', exact: true }).count(), compact ? 0 : 1);
      if (compact) assert.equal(listReads, 0, 'Home and member pages do not fetch the removed report list');
      else assert.ok(listReads > 0, 'The dedicated report route still reads saved history');
      if (!compact) await page.getByRole('heading', { name: locale === 'en' ? 'AI Life Blueprint Report' : 'AI 生命藍圖報告', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      cases++; await page.close();
    }
  assert.equal(cases, 18);
  console.log('PASS 18 bilingual home/member/report cases at 390/768/1440px; title and birth KIN retained, compact grids/history/delete controls absent, report route preserved; AI/payment/delete=0');
} finally { await browser.close(); await server.close(); }
