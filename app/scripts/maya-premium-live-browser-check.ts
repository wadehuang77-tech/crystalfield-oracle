import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate } from '../src/lib/maya';
import { mockMayaProReport } from '../../worker/src/mayaProPrompt';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';
import { relationshipTestFixture } from '../src/lib/mayaRelationshipFixture';

const server = await createServer({ server: { host: '127.0.0.1', port: 5227, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0, actualAi = 0, writes = 0;
try {
  for (const kind of ['pro', 'relationship'] as const) for (const locale of ['en', 'zh-TW'] as const)
    for (const width of [390, 768, 1440]) for (const state of ['anonymous', 'unpaid', 'paid', 'generate'] as const) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors: string[] = [];
      let progress = 0;
      const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
      const pro = mockMayaProReport('1987-07-26', locale); pro.provider = 'openai';
      const report = kind === 'pro' ? pro : relationshipTestFixture('1987-07-26', '1990-01-01', locale);
      const total = kind === 'pro' ? 15 : 12;
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (/openai|images\/generations|payment.ecpay/i.test(url.href)) { actualAi++; return route.abort(); }
        if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5227' ? route.continue() : route.abort();
        const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname === '/api/track') return reply({ ok: true });
        if (url.pathname === '/api/auth/me') return reply(state === 'anonymous' ? { authenticated: false } : { authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
        if (url.pathname === '/api/auth/google/config') return reply({ client_id: null, csrf_token: 'offline' });
        if (url.pathname === `/api/maya/${kind}/config`) return reply(kind === 'pro'
          ? { enabled: true, payment: true, mode: 'production_entitlement', liveAi: true }
          : { product, payment: true, reportAvailable: true });
        if (url.pathname === `/api/maya/${kind}/entitlements`) return reply({ entitlements: state === 'paid' || state === 'generate' ? [{ id: 'access', product_code: product.code }] : [] });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [
          { ...mayaForDate('1987-07-26', locale), id: 'personal', birth_date: '1987-07-26', role: 'personal', free_summary: '' },
          { ...mayaForDate('1990-01-01', locale), id: 'partner', birth_date: '1990-01-01', role: 'relationship', free_summary: '' },
        ] });
        const result = { id: 'saved', status: state === 'paid' || progress === total ? 'completed' : 'processing',
          report: state === 'paid' || progress === total ? report : null, completedSections: progress, totalSections: total, reason: null };
        if (url.pathname === `/api/maya/${kind}/reports` && request.method() === 'GET') return reply({ reports: state === 'paid' ? [{ id: 'saved', status: 'completed' }] : [] });
        if (url.pathname === `/api/maya/${kind}/reports` && request.method() === 'POST') {
          assert.equal(state, 'generate'); writes++;
          assert.equal(request.postDataJSON().product_code, product.code);
          return reply(result);
        }
        if (url.pathname === `/api/maya/${kind}/reports/saved/advance`) {
          assert.equal(state, 'generate'); assert.equal(request.method(), 'POST'); writes++; progress++;
          return reply({ ...result, completedSections: progress, status: progress === total ? 'completed' : 'processing', report: progress === total ? report : null });
        }
        if (url.pathname === `/api/maya/${kind}/reports/saved`) return reply(result);
        throw new Error(`Unexpected API ${url.pathname}`);
      });
      await page.goto(`http://127.0.0.1:5227${locale === 'en' ? '/en' : ''}/maya-calendar/${kind}`, { waitUntil: 'domcontentloaded' });
      const selector = kind === 'pro' ? '[data-pro-report-version]' : '[data-relationship-report-version]';
      if (state === 'anonymous') {
        if (kind === 'pro') await page.waitForURL(/\/login/);
        else await page.locator('button:not([disabled])').filter({ hasText: 'NT$899' }).waitFor();
        assert.equal(await page.locator(selector).count(), 0);
      } else if (state === 'unpaid') {
        await page.getByText(locale === 'en' ? 'Unlock your report to explore the full blueprint.'
          : '解鎖後即可探索完整藍圖。', { exact: true }).waitFor();
        assert.equal(await page.locator(selector).count(), 0);
      } else {
        if (state === 'paid') {
          await page.getByRole('button', { name: locale === 'en' ? 'Saved report · completed' : '已儲存報告 · completed' }).click();
        } else {
          if (kind === 'relationship') await page.getByRole('checkbox').check();
          await page.getByRole('button', { name: `${locale === 'en' ? 'Unlock / view report' : '解鎖／查看報告'} · NT$${product.price}`, exact: true }).click();
        }
        await page.locator(selector).waitFor();
        if (kind === 'relationship') {
          assert.equal(await page.locator(`${selector} details`).count(), 12);
          await page.getByRole('button', { name: locale === 'en' ? 'A perspective' : 'A 視角', exact: true }).click();
          await page.locator('details').nth(8).locator('summary').click();
          assert.equal(await page.locator(`${selector} [data-kin="34"]`).count(), 1);
        } else assert.equal(await page.locator('[data-pro-chapter]').count(), 3);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `${kind} ${width}px overflow`);
        if (locale === 'en') {
          const text = await page.locator(selector).innerText();
          assert.doesNotMatch(text, /[\u3400-\u9fff]/u);
        }
      }
      assert.deepEqual(errors, []);
      cases++; await page.close();
    }
  assert.equal(cases, 48); assert.equal(actualAi, 0);
  assert.equal(writes, 6 * (16 + 13));
  console.log(`PASS ${cases} bilingual 390/768/1440px live report UI cases; synthetic generation requests=${writes}; actual AI/payment=0`);
} finally { await browser.close(); await server.close(); }
