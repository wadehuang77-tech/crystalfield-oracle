import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { mayaSignature, mayaSummary } from '../src/lib/maya';

const frontend = 'https://crystalfield-maya-sandbox.pages.dev';
const api = 'https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev';
const output = process.env.MAYA_ACCEPTANCE_OUTPUT;
if (!output) throw new Error('Provide a local MAYA_ACCEPTANCE_OUTPUT directory.');
await mkdir(output, { recursive: true });
const records: object[] = [];
const config = await fetch(`${api}/api/maya/config`, { headers: { Origin: frontend } });
assert.equal(config.status, 200);
assert.equal(config.headers.get('access-control-allow-origin'), frontend);
assert.deepEqual(await config.json(), { public: true, member: false, payment: false, sandbox: false, ai: false });
const work = Array.from({ length: 520 }, (_, i) => ({ kin: Math.floor(i / 2) + 1, locale: i % 2 ? 'en' as const : 'zh-TW' as const }));
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < work.length) {
    const { kin, locale } = work[next++];
    const response = await fetch(`${api}/api/maya/content/${kin}?locale=${locale}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const data = await response.json();
    const signature = mayaSignature(kin, locale);
    assert.deepEqual(data, { ...signature, free_summary: mayaSummary(signature, locale) });
  }
}));
records.push({ stage: 'actual-public-Cards-API', rows: 520, mocks: false, status: 'PASS' });
for (const path of ['/api/maya/profile', '/api/maya/reports', '/api/maya/daily', '/api/maya/checkout', '/api/maya/daily/premium']) {
  assert.equal((await fetch(`${api}${path}`)).status, 503);
}
assert.equal((await fetch(`${api}/api/maya/calculate`, { method: 'POST', headers: { Origin: frontend, 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
for (const path of ['/api/admin/members', '/api/cards', '/api/checkout', '/api/profile']) {
  assert.equal((await fetch(`${api}${path}`)).status, 404);
}
records.push({ stage: 'actual-private-and-unrelated-API-denied', status: 'PASS' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [390, 768, 1440]) for (const locale of ['zh-TW', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const origins = new Set<string>();
    const errors: string[] = [];
    page.on('request', request => origins.add(new URL(request.url()).origin));
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${frontend}${locale === 'en' ? '/en' : ''}/maya-calendar`);
    assert.equal(response?.status(), 200);
    assert.match(response!.headers()['x-robots-tag'], /noindex/);
    await page.getByRole('heading', { name: locale === 'en' ? 'Discover Your Galactic Life Signature' : '探索你的馬雅星際生命密碼', exact: true }).waitFor();
    assert.equal(await page.locator('input[type=date]').count(), 0);
    assert.ok(await page.locator('[data-maya-hero]').getByRole('button', { name: locale === 'en' ? 'Find My KIN for Free' : '免費查詢我的 KIN', exact: true }).isDisabled());
    assert.ok(!origins.has('https://api.crystalfield101.com'));
    assert.ok(origins.has(api));
    assert.deepEqual(errors, []);
    const size = await page.evaluate(() => ({ view: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.view + 1);
    await page.screenshot({ path: join(output, `maya35-${locale}-${width}.png`), fullPage: true });
    records.push({ stage: 'real-HTTPS-public-page', width, locale, status: 'PASS', requests: [...origins] });
    await page.goto(`${frontend}${locale === 'en' ? '/en' : ''}/maya-calendar/member`);
    await page.getByRole('heading', { name: locale === 'en' ? 'Dreamspell is not available yet' : 'Dreamspell 尚未開放', exact: true }).waitFor();
    assert.equal(await page.locator('input[type=date]').count(), 0);
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(join(output, 'maya35-public-smoke.json'), JSON.stringify({
  frontend, api, records, actual_google: 'NOT RUN', actual_payment: 'NOT RUN', paid_ai: 'NOT RUN',
}, null, 2));
console.log('PASS: actual HTTPS public pages at 390/768/1440 zh/en, all 520 Cards API rows, CORS and fail-closed private routes. No OAuth/payment/API mocks or paid calls.');
