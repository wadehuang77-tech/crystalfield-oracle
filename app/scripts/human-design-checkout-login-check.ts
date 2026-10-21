import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { calculateHDChart } from '../src/lib/human-design/humanDesignCalc';
import { createOrder } from '../../worker/src/checkout';
import type { Env } from '../../worker/src/utils';

const statements: string[] = [];
const env = { ALLOWED_ORIGINS: 'http://127.0.0.1:5188', DB: { prepare(sql: string) {
  statements.push(sql);
  return { bind() { return this; }, async first() { return { c: 0 }; }, async run() { return {}; } };
} } } as unknown as Env;
for (const sku of ['human_design_basic', 'human_design_full', 'human_design_bundle']) {
  const response = await createOrder(new Request('http://local/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spread_id: sku }),
  }), env);
  assert.equal(response.status, 401);
}
assert.ok(statements.every(sql => sql.includes('rate_limit_events')), 'Guest must not create orders');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const price of [199, 399, 489]) {
    const context = await browser.newContext();
    let signedIn = false;
    let orders = 0;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname.includes('checkout') && route.request().method() === 'POST') orders++;
        const body = url.pathname === '/api/auth/me'
          ? { authenticated: signedIn, user: signedIn ? { id: 'test-member', email: 'test@example.invalid' } : null }
          : { groups: [], issued_capabilities: [], capabilities: [], membership: null };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (url.hostname !== '127.0.0.1') return route.abort();
      return route.continue();
    });
    const state = { chart: calculateHDChart('1990-12-31', '08:15', 'Taipei'), chartId: '',
      birthData: { date: '1990-12-31', time: '08:15', city: 'Taipei' }, access: 'locked', email: '' };
    await context.addInitScript(value => localStorage.setItem('cf_human_design_state_v1', JSON.stringify(value)), state);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5188/human-design/?checkout_login=1');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: new RegExp(`NT\\$${price}`) }).first().click();
    await page.waitForURL('**/login?**');
    assert.equal(orders, 0);
    const returnTo = new URL(page.url()).searchParams.get('redirect')!;
    assert.equal(returnTo, '/human-design/?checkout_login=1');
    signedIn = true;
    await page.goto('http://127.0.0.1:5188' + returnTo);
    await page.waitForTimeout(500);
    assert.equal(orders, 0, 'Login return must not auto-charge');
    await page.getByRole('button', { name: new RegExp(`NT\\$${price}`) }).first().click();
    await page.waitForTimeout(400);
    assert.equal(orders, 1, 'Signed-in member may create the chosen order');
    await context.close();
  }
  console.log('PASS: three guest SKUs rejected with 401/no order writes; three UI prices require login, restore report and allow mocked member checkout without auto-charge.');
} finally { await browser.close(); }
