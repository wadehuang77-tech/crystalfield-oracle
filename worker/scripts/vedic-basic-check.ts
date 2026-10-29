import assert from 'node:assert/strict';
import { signJwt } from '../src/auth';
import { getVedicBasicReading } from '../src/vedicBasicReading';
import { SPREAD_CATALOG } from '../src/ecpay';
import type { Env } from '../src/utils';

async function main() {
const secret = 'local-test-only';
const token = await signJwt({ sub: 'member', email: 'test@example.invalid' }, secret);
let order = { user_id: 'member', status: 'paid', item_id: 'vedic_basic', picks_payload: JSON.stringify({ vedic_chart_id: 'chart' }) };
let chartOwner: string | null = null;
const result = { archetype: { title: 'Private reading', body: 'Paid body' } };
const env = { JWT_SECRET: secret, DB: { prepare(sql: string) { return { bind() { return this; }, async first() {
  if (sql.includes('profiles')) return { token_generation: 0 };
  if (sql.includes('FROM orders')) return order;
  if (sql.includes('FROM vedic_charts')) { return { user_id: chartOwner, chart_json: '{}', free_result_json: JSON.stringify(result) }; }
  throw new Error(sql);
} }; } } } as unknown as Env;
async function request(auth = true, chartId = 'chart', withOrder = true) {
  return getVedicBasicReading(new Request('https://local/api/vedic-astrology/basic-reading', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...(withOrder ? { order_id: 'order' } : {}), chart_id: chartId, language: 'zh-Hant' }) }), env);
}
assert.equal(SPREAD_CATALOG.vedic_basic.amount, 199);
assert.equal((await request(false)).status, 401);
for (const status of ['pending', 'failed', 'refunded']) { order.status = status; assert.equal((await request()).status, 401); }
order.status = 'paid'; order.user_id = 'someone-else';
assert.equal((await request()).status, 401);
order.user_id = 'member';
assert.equal((await request(true, 'other-chart')).status, 401);
order.item_id = 'human_design_basic';
assert.equal((await request()).status, 401);

for (const item of ['vedic_basic', 'vedic_complete', 'vedic_career']) {
  order.item_id = item;
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json() as any).results, result);
}
chartOwner = 'member';
order.status = 'pending';
assert.equal((await request(true, 'chart', false)).status, 200, 'owner reads free without an order');
chartOwner = 'someone-else';
assert.equal((await request(true, 'chart', false)).status, 401, 'other owner denied');
console.log('PASS: free owner access without payment; guests and other owners denied; legacy paid access preserved. No external calls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
