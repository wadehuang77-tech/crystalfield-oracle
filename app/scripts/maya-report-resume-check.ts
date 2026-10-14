import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { relationshipTestFixture } from '../src/lib/mayaRelationshipFixture';

const server = await createServer({ server: { host: '127.0.0.1', port: 5243, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const outcome of ['completed', 'blocked', 'processing'] as const) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let advances = 0, reads = 0;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5243' ? route.continue() : route.abort();
      if (url.pathname === '/api/track') return reply({ ok: true });
      if (url.pathname.endsWith('/saved/advance')) {
        advances++;
        if (outcome === 'blocked' && advances === 2) return reply({ id: 'saved', status: 'completed',
          completedSections: 12, totalSections: 12, reason: null,
          report: relationshipTestFixture('1987-07-26', '1990-01-01', locale) });
        return reply({ error: 'Simulated interrupted response' }, 502);
      }
      assert.equal(req.method(), 'GET', 'Resume must not create orders, profiles or reports');
      if (url.pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
      if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (url.pathname.endsWith('/entitlements')) return reply({ entitlements: [{ id: 'grant', product_code: MAYA_RELATIONSHIP_PRODUCT.code, order_id: 'order' }] });
      if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
      if (url.pathname.endsWith('/reports')) return reply({ reports: [{ id: 'saved', status: advances ? outcome : 'processing' }] });
      if (url.pathname.endsWith('/reports/saved')) {
        reads++;
        const status = advances ? outcome : 'processing';
        return reply({ id: 'saved', status, completedSections: status === 'completed' ? 12 : 11, totalSections: 12,
          reason: status === 'blocked' ? 'AI_RETRY_LIMIT' : null,
          report: status === 'completed' ? relationshipTestFixture('1987-07-26', '1990-01-01', locale) : null });
      }
      throw new Error(`Unexpected API ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:5243${locale === 'en' ? '/en' : ''}/maya-calendar/relationship`);
    await page.getByRole('button', { name: /(?:Saved report|已儲存報告) · processing/ }).click();
    await page.getByRole('button', { name: /Continue report|繼續生成/ }).click();
    if (outcome === 'completed') {
      await page.locator('[data-relationship-report-version]').waitFor();
      assert.equal(await page.getByRole('alert').count(), 0);
    } else {
      await page.getByRole('alert').filter({ hasText: /11\/12/ }).waitFor();
      await page.getByRole('status').filter({ hasText: `11/12 · ${outcome}` }).waitFor();
      const button = page.getByRole('button', { name: /Continue report|繼續生成|Unlock \/ view|解鎖／查看/ });
      assert.equal(await button.isDisabled(), false);
    }
    assert.equal(advances, 1, 'An interrupted request must not blindly repeat an AI call');
    assert.equal(reads, 2, 'Fetch the authoritative state after interruption');
    if (outcome === 'blocked') {
      await page.getByRole('button', { name: /Continue report|繼續生成/ }).click();
      await page.locator('[data-relationship-report-version]').waitFor();
      assert.equal(advances, 2, 'Explicit recovery resumes the same saved report');
    }
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
  console.log(`PASS ${cases} bilingual 11/12 resume cases: completion, blocked status and recoverable interruption; no payment or real AI.`);
} finally { await browser.close(); await server.close(); }
