import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mockMayaReport } from '../src/lib/maya';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { relationshipTestFixture } from '../src/lib/mayaRelationshipFixture';

const server = await createServer({ server: { host: '127.0.0.1', port: 5242, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const price of [199, 499, 899]) for (const revoked of [false, true]) {
    const pair = price === 899, en = locale === 'en';
    const product = pair ? MAYA_RELATIONSHIP_PRODUCT.code : price === 199 ? 'MAYA_BASIC_199' : 'MAYA_FULL_499';
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    let writes = 0, reads = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5242' ? route.continue() : route.abort();
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (req.method() !== 'GET') { writes++; return reply({ error: 'Viewing must never pay or generate' }, 500); }
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      // Reading a saved report must not require re-entering birth data or renewing consent.
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
      if (url.pathname === '/api/maya/daily') return reply({ daily: null });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [{ id: 'grant', product_code: product, order_id: 'order' }] });
      const reportPath = pair ? '/api/maya/relationship/reports' : '/api/maya/reports';
      if (url.pathname === reportPath) return reply({ reports: pair ? [{ id: 'saved', status: 'completed' }] : [
        { id: 'wrong-product', product_code: 'MAYA_RELATIONSHIP_699', locale, report_status: 'completed', payment_status: 'paid' },
        { id: 'wrong-locale', product_code: product, locale: en ? 'zh-TW' : 'en', report_status: 'completed', payment_status: 'paid' },
        { id: 'revoked', product_code: product, locale, report_status: 'completed', payment_status: 'revoked' },
        { id: 'saved', product_code: product, locale, report_status: 'completed', payment_status: 'paid' },
      ] });
      if (url.pathname === `${reportPath}/saved`) {
        reads++;
        if (revoked) return reply({ error: 'Access revoked' }, 403);
        return reply({ id: 'saved', status: 'completed', completedSections: 12, totalSections: 12,
          report: pair ? relationshipTestFixture('1987-07-26', '1990-01-01', locale)
            : mockMayaReport(mayaForDate('1987-07-26', locale), null, locale, product as 'MAYA_BASIC_199' | 'MAYA_FULL_499') });
      }
      throw new Error(`Unexpected API ${req.method()} ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5242${en ? '/en' : ''}/maya-calendar/${pair ? 'relationship' : 'member'}`);
    await page.getByRole('button', { name: `${en ? 'Unlock / view report' : '解鎖／查看報告'} · NT$${price}`, exact: true }).click();
    if (revoked) await page.getByRole('alert').filter({ hasText: 'Access revoked' }).waitFor();
    else if (pair) await page.locator('[data-relationship-report-version]').waitFor();
    else await page.getByRole('heading', { name: price === 199
      ? en ? 'AI Life Blueprint Report' : 'AI 生命藍圖報告'
      : en ? 'Existing report · legacy seven chapters' : '既有報告 · 舊版七篇', exact: true }).waitFor();
    assert.ok(reads > 0);
    assert.equal(writes, 0, 'Owned reports use GET only, including rejected access');
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
  console.log(`PASS ${cases} bilingual owned-report cases: direct reading without profiles, product/locale isolation, revoked access, zero payment or generation.`);
} finally { await browser.close(); await server.close(); }
