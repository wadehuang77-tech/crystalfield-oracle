import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mockMayaReport } from '../src/lib/maya';
import { mockMayaProReport } from '../../worker/src/mayaProPrompt';
import { relationshipTestFixture } from '../src/lib/mayaRelationshipFixture';
import { MAYA_PRO_PRODUCT } from '../src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';

const server = await createServer({ server: { host: '127.0.0.1', port: 5248, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const price of [199, 499, 699, 899]) for (const existing of [false, true]) {
    const basic = price < 699, kind = price === 699 ? 'pro' : 'relationship';
    const product = price === 199 ? 'MAYA_BASIC_199' : price === 499 ? 'MAYA_FULL_499' : price === 699 ? MAYA_PRO_PRODUCT.code : MAYA_RELATIONSHIP_PRODUCT.code;
    const total = price === 699 ? 15 : 12;
    const pro = mockMayaProReport('1987-07-26', locale); pro.provider = 'openai';
    const report = basic ? mockMayaReport(mayaForDate('1987-07-26', locale), null, locale, price === 199 ? 'MAYA_BASIC_199' : 'MAYA_FULL_499')
      : price === 699 ? pro : relationshipTestFixture('1987-07-26', '1990-01-01', locale);
    const page = await browser.newPage({ viewport: { width: locale === 'en' ? 1440 : 390, height: 900 } });
    const errors: string[] = [], keys: string[] = [];
    let release: (() => void) | undefined, attempts = 0, done = existing;
    page.on('pageerror', error => errors.push(error.message));
    const result = () => ({ id: 'saved', status: done ? 'completed' : 'processing', report: done ? report : null,
      completedSections: done ? total : total - 1, totalSections: total, reason: null });
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), pathname = url.pathname;
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (!pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5248' ? route.continue() : route.abort();
      if (pathname === '/api/track') return reply({ ok: true });
      if (pathname === '/api/auth/me') return reply({ authenticated: true, user: { id: 'owner', email: 'fixture@example.test' } });
      if (pathname === '/api/admin/check') return reply({ isAdmin: false });
      if (pathname === '/api/maya/config') return reply({ public: true, member: true, payment: true, sandbox: false, ai: true });
      if (pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: true });
      if (pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: true });
      if (pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
      if (pathname.endsWith('/entitlements')) return reply({ entitlements: [{ id: 'existing-access', product_code: product }] });
      if (pathname === '/api/maya/daily') return reply({ daily: null });
      if (pathname === '/api/maya/profile') return reply({ profiles: [
        { ...mayaForDate('1987-07-26', locale), id: 'personal', role: 'personal', birth_date: '1987-07-26' },
        { ...mayaForDate('1990-01-01', locale), id: 'partner', role: 'relationship', birth_date: '1990-01-01' },
      ] });
      if (pathname.endsWith('/reports') && req.method() === 'GET') return reply({ reports: done ? [{ id: 'saved', status: 'completed', report_status: 'completed', payment_status: 'paid', product_code: product, locale }] : [] });
      if (pathname.endsWith('/reports/saved')) return reply(result());
      if (pathname.endsWith('/reports') && req.method() === 'POST' && !basic) return reply(result());
      if (pathname.endsWith('/advance') || pathname === '/api/maya/reports' && req.method() === 'POST') {
        attempts++;
        if (basic) { assert.equal(req.postDataJSON().entitlement_id, 'existing-access'); keys.push(req.postDataJSON().idempotency_key); }
        await new Promise<void>(resolve => { release = resolve; });
        if (attempts === 1) return reply({ error: 'Generation fixture failure' }, 502);
        done = true; return reply(result());
      }
      throw new Error(`Unexpected request: ${req.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:5248${locale === 'en' ? '/en' : ''}/maya-calendar/${basic ? 'member' : kind}`);
    if (basic && !existing) await page.clock.install();
    const button = page.getByRole('button', { name: new RegExp(`(?:Unlock / view report|解鎖／查看報告).*NT\\$${price}`) });
    await button.click();
    if (!existing) {
      const bar = page.getByRole('progressbar');
      await bar.waitFor();
      if (basic) {
        assert.match(await bar.getAttribute('aria-valuetext') ?? '', /estimated|預估/);
        await page.clock.fastForward(300000);
        await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '90');
        assert.equal(await bar.getAttribute('aria-valuenow'), '90');
      } else await page.waitForFunction(expected => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === expected, String(Math.floor((total - 1) / total * 100)));
      await (basic ? button : page.getByRole('button', { name: /Generating|生成中/ })).evaluate((el: HTMLButtonElement) => { if (!el.disabled) throw Error('Generation button must be disabled'); el.click(); });
      assert.equal(attempts, 1);
      release!();
      const retry = page.getByRole('button', { name: /Retry \/ continue|重試／繼續解析/ });
      await retry.waitFor();
      const frozen = await bar.getAttribute('aria-valuenow');
      if (basic) { await page.clock.fastForward(300000); assert.equal(await bar.getAttribute('aria-valuenow'), frozen); await page.clock.resume(); }
      await retry.click();
      await page.waitForFunction(() => document.querySelector('[role="progressbar"]') !== null);
      while (attempts < 2) await new Promise(resolve => setTimeout(resolve, 20));
      release!();
    }
    if (basic) await page.waitForURL(/\/reports\/saved$/);
    else await page.locator(price === 699 ? '[data-pro-report-version]' : '[data-relationship-report-version]').waitFor();
    await page.getByRole('progressbar').waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('progressbar').count(), 0);
    assert.equal(attempts, existing ? 0 : 2);
    if (basic && !existing) assert.equal(keys[0], keys[1], 'Retry retains original idempotency key');
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
  console.log(`PASS ${cases} mocked bilingual mobile/desktop flows: all four plans, real/estimated progress, 90% cap, stopped errors, retry with existing access, duplicate clicks, completion and existing reports. No live AI or payment.`);
} finally { await browser.close(); await server.close(); }
