import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import worker from '../src/index';
import { signJwt } from '../src/auth';
import { computeEcpayCheckMac } from '../src/ecpay';
import { MAYA_STAGE_ENDPOINT, mayaSandboxEnabled } from '../src/mayaSandbox';
import { MAYA_PRODUCTS, type MayaProfile } from '../../app/src/lib/maya';
import type { Env } from '../src/utils';

let mf: Miniflare;
let env: Env;
let token: string;
let otherToken: string;
const ctx: ExecutionContext = {
  waitUntil() {}, passThroughOnException() {}, props: {},
  get tracing(): Tracing { throw new Error('Unused tracing'); },
};
async function migrate(path: string) {
  const sql = await readFile(new URL(path, import.meta.url), 'utf8');
  await env.DB.batch(sql.replace(/--[^\n]*/g, '').split(';').map((entry) => entry.trim()).filter(Boolean).map((statement) => env.DB.prepare(statement)));
}
before(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("isolated")}}', compatibilityDate: '2026-06-25', d1Databases: { DB: 'maya-sandbox-test' } });
  const { DB } = await mf.getBindings<{ DB: D1Database }>();
  env = {
    DB, DB_CARDS: DB, ENV: 'dev', JWT_SECRET: 'test-only-maya-session', MAYA_AI_MODE: 'mock',
    MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_AI_ENABLED: 'true',
    MAYA_SANDBOX_ENABLED: 'true', MAYA_SANDBOX_MERCHANT_ID: '3002607',
    MAYA_SANDBOX_HASH_KEY: 'synthetic-key-not-ecpay-credentials', MAYA_SANDBOX_HASH_IV: 'synthetic-iv',
    MAYA_SANDBOX_API_ORIGIN: 'https://maya-api.example.test', MAYA_SANDBOX_FRONTEND_ORIGIN: 'https://maya.example.test',
    ALLOWED_ORIGINS: 'https://maya.example.test',
  };
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,token_generation INTEGER DEFAULT 0)').run();
  await DB.prepare("INSERT INTO profiles(id,email) VALUES ('member','member@example.test'),('other','other@example.test')").run();
  await migrate('../../d1/migrations/004-orders.sql');
  await migrate('../../d1/migrations/025_maya_dreamspell.sql');
  await migrate('../../d1/migrations/026_maya_sandbox_checkout.sql');
  await migrate('../../d1/migrations/027_maya_production_payment_ai.sql');
  token = await signJwt({ sub: 'member', email: 'member@example.test' }, env.JWT_SECRET);
  otherToken = await signJwt({ sub: 'other', email: 'other@example.test' }, env.JWT_SECRET);
});
beforeEach(async () => { await env.DB.prepare('DELETE FROM maya_rate_limits').run(); });
after(async () => { await mf?.dispose(); });

function call(path: string, body?: unknown, auth: string | null = token, target = env) {
  return worker.fetch(new Request(`https://maya-api.example.test/api/maya/${path}`, {
    method: body ? 'POST' : 'GET', headers: { Origin: 'https://maya.example.test', 'Content-Type': 'application/json', ...(auth ? { Cookie: `bolt_session=${auth}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), target, ctx);
}
interface Checkout { order_id: string; endpoint: string; fields: Record<string, string> }
async function checkout(code: string, locale = 'en', key = crypto.randomUUID()): Promise<Checkout> {
  const response = await call(`checkout?locale=${locale}`, { product_code: code, locale, idempotency_key: key });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function fieldsFor(order: Checkout, overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    MerchantID: '3002607', MerchantTradeNo: order.fields.MerchantTradeNo, TradeNo: `T${order.fields.MerchantTradeNo}`,
    TradeAmt: order.fields.TotalAmount, RtnCode: '1', SimulatePaid: '0',
    CustomField1: order.fields.CustomField1, CustomField2: order.order_id, ...overrides,
  };
  fields.CheckMacValue = await computeEcpayCheckMac(fields, env.MAYA_SANDBOX_HASH_KEY!, env.MAYA_SANDBOX_HASH_IV!);
  return fields;
}
function callback(fields: Record<string, string>, path = 'callback', target = env) {
  // Synthetic signed fixture, NOT an external ECPay payment.
  return worker.fetch(new Request(`https://maya-api.example.test/api/maya/sandbox/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields),
  }), target, ctx);
}

test('Official stage checkout/callback entitlement works independently of Live AI, which remains disabled', async () => {
  const target = { ...env, MAYA_AI_MODE: 'live', MAYA_AI_ENABLED: 'false', OPENAI_API_KEY: undefined };
  const response = await call('checkout', {
    product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: crypto.randomUUID(),
  }, token, target);
  assert.equal(response.status, 200);
  const order = await response.json<Checkout>();
  assert.equal(order.endpoint, 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5');
  assert.equal((await callback(await fieldsFor(order), 'callback', target)).status, 200);
  const access = await call('entitlements?locale=en', undefined, token, target);
  assert.equal(access.status, 200);
  assert.ok((await access.json<{ entitlements: { product_code: string }[] }>()).entitlements.some(x => x.product_code === 'MAYA_BASIC_199'));
  assert.equal((await call('reports', { product_code: 'MAYA_BASIC_199' }, token, target)).status, 503);
});
async function grantCount(id: string) {
  return (await env.DB.prepare('SELECT COUNT(*) AS n FROM maya_entitlements WHERE order_id=?').bind(id).first<{ n: number }>())!.n;
}

test('Late callback for pending order acknowledges 1|OK without browser session; terminal orders never revive', async () => {
  const pending = await checkout('MAYA_BASIC_199');
  await env.DB.prepare("UPDATE orders SET created_at='2020-01-01',updated_at='2020-01-01' WHERE id=?").bind(pending.order_id).run();
  const fields = await fieldsFor(pending);
  const returned = await callback(fields, 'result');
  assert.equal(returned.status, 303);
  assert.equal(await grantCount(pending.order_id), 0);
  assert.equal((await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(pending.order_id).first<{ status: string }>())!.status, 'pending');
  const response = await callback(fields);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '1|OK');
  assert.equal(await grantCount(pending.order_id), 1);
  const duplicate = await callback(fields);
  assert.equal(await duplicate.text(), '1|OK');
  assert.equal(await grantCount(pending.order_id), 1);
  for (const status of ['cancelled', 'failed']) {
    const terminal = await checkout('MAYA_FULL_499');
    await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(status, terminal.order_id).run();
    const late = await callback(await fieldsFor(terminal));
    assert.equal(late.status, 409);
    assert.equal(await grantCount(terminal.order_id), 0);
  }
});

test('Sandbox is off by default, rejects production credentials/origins and has no admin bypass', async () => {
  for (const overrides of [
    { MAYA_SANDBOX_ENABLED: undefined }, { ENV: 'production' }, { MAYA_AI_MODE: undefined },
    { MAYA_SANDBOX_MERCHANT_ID: 'production-merchant' }, { MAYA_SANDBOX_HASH_KEY: undefined },
    { MAYA_SANDBOX_API_ORIGIN: 'https://api.crystalfield101.com' },
    { MAYA_SANDBOX_FRONTEND_ORIGIN: 'https://www.crystalfield101.com' },
    { MAYA_SANDBOX_API_ORIGIN: 'http://localhost:8787' },
  ]) {
    const target = { ...env, ...overrides };
    assert.equal(mayaSandboxEnabled(target), false);
    const response = await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'disabled' }, token, target);
    assert.equal(response.status, 503);
  }
  assert.equal((await call('checkout/config', undefined, null)).status, 401);
  assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'anonymous' }, null)).status, 401);
});

test('Migration 026 is additive/repeatable and checkout is owner-bound/idempotent/rate-limited', async () => {
  await migrate('../../d1/migrations/026_maya_sandbox_checkout.sql');
  const order = await checkout('MAYA_BASIC_199', 'en', 'same-key');
  assert.equal((await checkout('MAYA_BASIC_199', 'en', 'same-key')).order_id, order.order_id);
  assert.equal((await call('checkout', { product_code: 'MAYA_FULL_499', locale: 'en', idempotency_key: 'same-key' })).status, 409);
  assert.equal((await call(`checkout/${order.order_id}`, undefined, otherToken)).status, 404);
  assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'forged-owner', user_id: 'other' })).status, 400);
  for (let i = 0; i < 6; i++) await checkout('MAYA_BASIC_199');
  await checkout('MAYA_BASIC_199');
  assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'limit' })).status, 429);
});

test('All three amounts/locales use stage-only signed forms and verified fixtures grant exactly their report product', async () => {
  for (const locale of ['zh-TW', 'en']) {
    for (const product of MAYA_PRODUCTS) {
      const order = await checkout(product.code, locale);
      assert.equal(order.endpoint, MAYA_STAGE_ENDPOINT);
      assert.equal(order.fields.TotalAmount, String(product.price));
      assert.equal(order.fields.CustomField1, product.code);
      assert.equal(order.fields.ItemName, locale === 'en' ? product.en : product.zh);
      assert.equal(order.fields.CheckMacValue, await computeEcpayCheckMac(order.fields, env.MAYA_SANDBOX_HASH_KEY!, env.MAYA_SANDBOX_HASH_IV!));
      assert.equal(order.fields.ReturnURL, 'https://maya-api.example.test/api/maya/sandbox/callback');
      assert.equal(new URL(order.fields.ClientBackURL).pathname, `${locale === 'en' ? '/en' : ''}/maya-calendar/member`);
      assert.equal(order.fields.PeriodAmount, undefined);
      assert.ok(!JSON.stringify(order).includes(env.MAYA_SANDBOX_HASH_KEY!));
      assert.ok(!JSON.stringify(order).includes(env.MAYA_SANDBOX_HASH_IV!));
      assert.equal(await grantCount(order.order_id), 0);
      const fields = await fieldsFor(order);
      assert.equal((await callback(fields)).status, 200);
      assert.equal((await callback(fields)).status, 200);
      assert.equal(await grantCount(order.order_id), 1);
      const grant = await env.DB.prepare('SELECT product_code,user_id FROM maya_entitlements WHERE order_id=?').bind(order.order_id).first<{ product_code: string; user_id: string }>();
      assert.deepEqual(grant, { product_code: product.code, user_id: 'member' });
      assert.equal((await call('daily/premium')).status, 403);
    }
  }
});

test('Forged signatures, merchant/trade/amount/product/order changes, simulated payment and duplicate fields never grant', async () => {
  const order = await checkout('MAYA_FULL_499');
  const mutations: Array<Record<string, string>> = [
    { MerchantID: 'other' }, { MerchantTradeNo: '20261010000000ABCDEF' }, { TradeAmt: '199' },
    { CustomField1: 'MAYA_BASIC_199' }, { CustomField2: 'foreign-order' }, { SimulatePaid: '1' },
  ];
  for (const overrides of mutations) {
    assert.ok((await callback(await fieldsFor(order, overrides))).status >= 400);
    assert.equal(await grantCount(order.order_id), 0);
  }
  const forged = await fieldsFor(order);
  forged.CheckMacValue = 'A'.repeat(64);
  assert.equal((await callback(forged)).status, 400);
  const good = await fieldsFor(order);
  const duplicate = await worker.fetch(new Request('https://maya-api.example.test/api/maya/sandbox/callback', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `${new URLSearchParams(good)}&TradeAmt=199`,
  }), env, ctx);
  assert.equal(duplicate.status, 400);
  assert.equal(await grantCount(order.order_id), 0);
  await env.DB.prepare("UPDATE orders SET user_id='other' WHERE id=?").bind(order.order_id).run();
  assert.equal((await callback(await fieldsFor(order))).status, 409);
  await env.DB.prepare("UPDATE orders SET user_id='member' WHERE id=?").bind(order.order_id).run();
  await env.DB.prepare("UPDATE orders SET item_id='MAYA_BASIC_199' WHERE id=?").bind(order.order_id).run();
  assert.equal((await callback(await fieldsFor(order))).status, 409);
  await env.DB.prepare("UPDATE orders SET item_id='MAYA_FULL_499' WHERE id=?").bind(order.order_id).run();
});

test('Failed payment is terminal, browser return cannot unlock, and language return follows stored order', async () => {
  for (const locale of ['zh-TW', 'en']) {
    const order = await checkout('MAYA_BASIC_199', locale);
    const fields = await fieldsFor(order);
    const browserReturn = await callback(fields, 'result');
    assert.equal(browserReturn.status, 303);
    assert.equal(new URL(browserReturn.headers.get('Location')!).pathname, `${locale === 'en' ? '/en' : ''}/maya-calendar/member`);
    assert.equal(await grantCount(order.order_id), 0);
    assert.equal((await callback(await fieldsFor(order, { RtnCode: '10100058' }))).status, 200);
    assert.equal((await callback(fields)).status, 409);
    assert.equal(await grantCount(order.order_id), 0);
  }
});

test('Atomic duplicate callbacks grant once, do not reactivate revoked access, and sandbox grants never authorize outside gate', async () => {
  const order = await checkout('MAYA_BASIC_199');
  const fields = await fieldsFor(order);
  const responses = await Promise.all([callback(fields), callback(fields)]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(await grantCount(order.order_id), 1);
  assert.equal((await callback(await fieldsFor(order, { RtnCode: '10100058' }))).status, 200);
  const paid = await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.order_id).first<{ status: string }>();
  assert.equal(paid?.status, 'paid', 'Late failure must not overwrite an already verified payment.');
  await env.DB.prepare("UPDATE maya_entitlements SET status='revoked' WHERE order_id=?").bind(order.order_id).run();
  assert.equal((await callback(fields)).status, 200);
  const grant = await env.DB.prepare('SELECT status FROM maya_entitlements WHERE order_id=?').bind(order.order_id).first<{ status: string }>();
  assert.equal(grant?.status, 'revoked');
  assert.equal((await callback(await fieldsFor(order, { TradeNo: 'different' }))).status, 409);
});

test('Payment and grant writes roll back together on D1 failure and a callback retry recovers without duplicate grant', async () => {
  const order = await checkout('MAYA_BASIC_199');
  await env.DB.prepare(`CREATE TRIGGER sandbox_grant_failure BEFORE INSERT ON maya_entitlements
    BEGIN SELECT RAISE(ABORT, 'synthetic persistence failure'); END`).run();
  const fields = await fieldsFor(order);
  try {
    assert.equal((await callback(fields)).status, 500);
    const row = await env.DB.prepare('SELECT status,ecpay_trade_no FROM orders WHERE id=?').bind(order.order_id)
      .first<{ status: string; ecpay_trade_no: string | null }>();
    assert.deepEqual(row, { status: 'pending', ecpay_trade_no: null });
    assert.equal(await grantCount(order.order_id), 0);
  } finally { await env.DB.prepare('DROP TRIGGER sandbox_grant_failure').run(); }
  assert.equal((await callback(fields)).status, 200);
  assert.equal(await grantCount(order.order_id), 1);
});

test('Signed synthetic callback → real D1 entitlement → deterministic Mock report → own history; no external OAuth/payment claim', async () => {
  const own = await call('calculate', { birth_date: '1987-07-26', locale: 'en' });
  const { profile } = await own.json<{ profile: MayaProfile }>();
  for (const locale of ['zh-TW', 'en']) {
    const order = await checkout('MAYA_FULL_499', locale);
    await callback(await fieldsFor(order));
    const grant = await env.DB.prepare('SELECT id FROM maya_entitlements WHERE order_id=?').bind(order.order_id).first<{ id: string }>();
    const input = { locale, product_code: 'MAYA_FULL_499', profile_id: profile.id, entitlement_id: grant!.id, idempotency_key: `report-${locale}` };
    assert.equal((await call('reports', input, token, { ...env, MAYA_SANDBOX_ENABLED: undefined })).status, 403);
    const generated = await call('reports', input);
    assert.equal(generated.status, 200, await generated.clone().text());
    const report = await generated.json<{ id: string }>();
    assert.equal((await call(`reports/${report.id}?locale=${locale}`)).status, 200);
    assert.equal((await call(`reports/${report.id}?locale=${locale}`, undefined, otherToken)).status, 404);
    assert.equal((await call(`reports/${report.id}?locale=${locale}`, undefined, null)).status, 401);
  }
  for (const locale of ['zh-TW', 'en']) assert.equal((await call('calculate', { birth_date: '2000-02-29', locale })).status, 422);
});
