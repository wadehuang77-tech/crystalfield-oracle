import assert from 'node:assert/strict';
import { before, beforeEach, after, afterEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import worker from '../src/index';
import { signJwt } from '../src/auth';
import { computeEcpayCheckMac, SPREAD_CATALOG, makeMerchantTradeNo } from '../src/ecpay';
import { mayaFeatures } from '../src/mayaFeatures';
import { mayaPaymentEnabled } from '../src/mayaPayments';
import { MAYA_AI_MODEL, MAYA_AI_ORDER_CAP_TWD, MAYA_AI_RESERVATION_TWD } from '../src/mayaAi';
import { MAYA_PRODUCTS, mayaForDate, type MayaProfile, type MayaReport, type MayaProductCode, type MayaLocale } from '../../app/src/lib/maya';
import type { Env } from '../src/utils';
import { MAYA_PRO_PRODUCT } from '../../app/src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../../app/src/lib/mayaRelationship';

let mf: Miniflare;
let env: Env;
let token: string;
let other: string;
let admin: string;
let profile: MayaProfile;
let partner: MayaProfile;
const originalFetch = globalThis.fetch;
let requests: { model: string; max_completion_tokens: number; messages: { content: string }[]; response_format: unknown }[] = [];
const ctx: ExecutionContext = {
  waitUntil() {}, passThroughOnException() {}, props: {},
  get tracing(): Tracing { throw new Error('Unused'); },
};
interface Checkout { order_id: string; endpoint: string; fields: Record<string, string> }
async function migrate(file: string) {
  const sql = await readFile(new URL(`../../d1/${file}`, import.meta.url), 'utf8');
  const code = sql.replace(/--[^\n]*/g, '');
  assert.ok(!/(?:^|;)\s*(DROP|DELETE|REPLACE|TRUNCATE)\b/i.test(code));
  await env.DB.batch(code.split(';').map(value => value.trim()).filter(Boolean).map(value => env.DB.prepare(value)));
}
function call(path: string, body?: unknown, auth: string | null = token, target = env) {
  return worker.fetch(new Request(`https://api.crystalfield101.com/api/maya/${path}`, {
    method: body ? 'POST' : 'GET', headers: {
      Origin: 'https://www.crystalfield101.com', 'Content-Type': 'application/json',
      ...(auth ? { Cookie: `bolt_session=${auth}` } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}),
  }), target, ctx);
}
async function checkout(product: MayaProductCode | typeof MAYA_PRO_PRODUCT.code | typeof MAYA_RELATIONSHIP_PRODUCT.code = 'MAYA_BASIC_199', locale: MayaLocale = 'en', key = crypto.randomUUID(), target = env): Promise<Checkout> {
  if (product === 'MAYA_RELATIONSHIP_699') {
    const existing = await env.DB.prepare('SELECT order_id FROM maya_payment_orders WHERE user_id=? AND checkout_key=?').bind('member', key).first();
    if (!existing) {
      // Historical fixture only; the public API must not create new legacy orders.
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status)
          VALUES(?,?,'member','member@example.test','maya','MAYA_RELATIONSHIP_699','Historical relationship',699,'pending')`).bind(id, makeMerchantTradeNo()),
        env.DB.prepare(`INSERT INTO maya_payment_orders(order_id,user_id,product_code,merchant_id,locale,checkout_key)
          VALUES(?,'member','MAYA_RELATIONSHIP_699',?,?,?)`).bind(id, env.ECPAY_MERCHANT_ID, locale, key),
      ]);
    }
  }
  const response = await call('checkout', { product_code: product, locale, idempotency_key: key }, token, target);
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function fieldsFor(order: Checkout, overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    MerchantID: env.ECPAY_MERCHANT_ID!, MerchantTradeNo: order.fields.MerchantTradeNo,
    TradeNo: `T${order.fields.MerchantTradeNo}`, TradeAmt: order.fields.TotalAmount, RtnCode: '1', SimulatePaid: '0',
    CustomField1: order.fields.CustomField1, CustomField2: order.order_id, ...overrides,
  };
  fields.CheckMacValue = await computeEcpayCheckMac(fields, env.ECPAY_HASH_KEY!, env.ECPAY_HASH_IV!);
  return fields;
}
function callback(fields: Record<string, string>, path = 'callback', target = env) {
  return worker.fetch(new Request(`https://api.crystalfield101.com/api/maya/payments/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields),
  }), target, ctx);
}
async function count(table: string, id: string) {
  return (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE order_id=?`).bind(id).first<{ n: number }>())!.n;
}
async function paid(product: MayaProductCode = 'MAYA_BASIC_199', locale: MayaLocale = 'en') {
  const order = await checkout(product, locale);
  assert.equal((await callback(await fieldsFor(order))).status, 200);
  const access = await env.DB.prepare('SELECT id FROM maya_entitlements WHERE order_id=?').bind(order.order_id).first<{ id: string }>();
  assert.ok(access);
  return { order, access };
}
function reportBody(access: { id: string }, product: MayaProductCode = 'MAYA_BASIC_199', locale: MayaLocale = 'en', key = crypto.randomUUID()) {
  return {
    profile_id: profile.id, entitlement_id: access.id, product_code: product, locale, idempotency_key: key,
    ...(product === 'MAYA_RELATIONSHIP_699' ? { relationship_profile_id: partner.id } : {}),
  };
}
function success(input: Parameters<typeof fetch>[1]): Response {
  const request = JSON.parse(String(input?.body));
  requests.push(request);
  const zh = request.messages[0].content.includes('只使用繁體中文');
  return new Response(JSON.stringify({
    model: 'gpt-4o-mini-2024-07-18', usage: { prompt_tokens: 500, completion_tokens: 200 },
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      body: zh
        ? '把這個主題當作自我覺察的邀請，觀察日常選擇與真實經驗。可以寫下今天重視的事情，選擇一個可行的小行動，並在晚上回顧收穫。不將這些提示視為科學、醫療、財務或未來事件的預測。'
        : 'Use this theme as an invitation to observe your daily choices and real experiences. Write down what matters today, choose one small practical action, and reflect on what you learned. This reflection is not a scientific, medical, financial, or future-event prediction.',
    }) } }],
  }), { headers: { 'Content-Type': 'application/json' } });
}
before(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("local-only")}}',
    compatibilityDate: '2026-06-25', d1Databases: { DB: 'maya-production-offline' } });
  const { DB } = await mf.getBindings<{ DB: D1Database }>();
  env = {
    DB, DB_CARDS: DB, JWT_SECRET: 'synthetic-local-session-secret', ENV: 'production',
    MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_PAYMENT_ENABLED: 'true', MAYA_AI_ENABLED: 'true',
    MAYA_AI_MODE: 'live', OPENAI_API_KEY: 'synthetic-provider-key',
    ECPAY_ENV: 'production', ECPAY_MERCHANT_ID: '9999999', ECPAY_HASH_KEY: 'synthetic-prod-key', ECPAY_HASH_IV: 'synthetic-prod-iv',
    MAYA_PAYMENT_API_ORIGIN: 'https://api.crystalfield101.com', MAYA_PAYMENT_FRONTEND_ORIGIN: 'https://www.crystalfield101.com',
    ALLOWED_ORIGINS: 'https://www.crystalfield101.com',
  };
  await migrate('maya-sandbox/customer-base.sql');
  await migrate('migrations/006-token-generation.sql');
  await DB.prepare('CREATE TABLE admins(id TEXT PRIMARY KEY,email TEXT NOT NULL)').run();
  await DB.prepare("INSERT INTO profiles(id,email) VALUES ('member','member@example.test'),('other','other@example.test'),('admin','admin@example.test')").run();
  await DB.prepare("INSERT INTO admins(id,email) VALUES ('admin','admin@example.test')").run();
  for (const file of ['migrations/004-orders.sql','migrations/025_maya_dreamspell.sql','migrations/026_maya_sandbox_checkout.sql','migrations/027_maya_production_payment_ai.sql']) await migrate(file);
  token = await signJwt({ sub: 'member', email: 'member@example.test' }, env.JWT_SECRET);
  other = await signJwt({ sub: 'other', email: 'other@example.test' }, env.JWT_SECRET);
  admin = await signJwt({ sub: 'admin', email: 'admin@example.test' }, env.JWT_SECRET);
  profile = (await (await call('calculate', { birth_date: '1987-07-26', locale: 'en' })).json() as { profile: MayaProfile }).profile;
  partner = (await (await call('calculate', { birth_date: '1990-01-01', role: 'relationship', locale: 'en' })).json() as { profile: MayaProfile }).profile;
});
beforeEach(async () => {
  requests = [];
  await env.DB.prepare('DELETE FROM maya_rate_limits').run();
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/chat/completions', 'All unexpected external network is rejected');
    return success(init);
  };
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => { await mf.dispose(); });

test('Pro entitlement-only release uses migration031 without local report tables or AI calls', async () => {
  await migrate('migrations/031_maya_pro_payment.sql');
  const target = { ...env, MAYA_PRO_PAYMENT_ENABLED: 'true', MAYA_PREMIUM_LIVE_ENABLED: 'false' };
  globalThis.fetch = async () => { throw new Error('Entitlement-only release must not call a provider'); };
  const reportTable = await env.DB.prepare("SELECT name FROM sqlite_master WHERE name='maya_pro_reports'").first();
  assert.equal(reportTable, null);
  const config = await call('pro/config', undefined, null, target);
  const settings = await config.json() as { enabled: boolean; payment: boolean; liveAi: boolean };
  assert.deepEqual([settings.enabled, settings.payment, settings.liveAi], [true, true, false]);
  for (const locale of ['en', 'zh-TW'] as const) {
    const response = await call(`pro/reports?locale=${locale}`, undefined, token, target);
    assert.equal(response.status, 200, await response.clone().text());
    assert.deepEqual(await response.json(), { reports: [], reason: 'PRO_LOCAL_ONLY' });
    assert.equal((await call(`pro/reports/unavailable?locale=${locale}`, undefined, token, target)).status, 503);
    assert.equal((await call(`pro/reports?locale=${locale}`, undefined, null, target)).status, 401);
    const order = await checkout(MAYA_PRO_PRODUCT.code, locale, crypto.randomUUID(), target);
    assert.equal(order.fields.TotalAmount, '699');
    assert.equal(await (await callback(await fieldsFor(order), 'callback', target)).text(), '1|OK');
    assert.equal(await count('maya_pro_entitlements', order.order_id), 1);
    assert.equal((await call('pro/reports', { locale }, token, target)).status, 503);
  }
  assert.equal(requests.length, 0);
});

test('Pro checkout offline: independent product, signed callback, localized return, ownership and refund revocation', async () => {
  await migrate('maya-pro-local-schema.sql');
  const target = { ...env, MAYA_PRO_PAYMENT_ENABLED: 'true' };
  globalThis.fetch = async () => { throw new Error('No external calls allowed during Pro payment tests'); };
  assert.equal((await call('checkout', { product_code: MAYA_PRO_PRODUCT.code, locale: 'en', idempotency_key: 'pro-disabled' })).status, 503);
  const simultaneousKey = 'shared-pro-legacy-key';
  const simultaneous = await Promise.all([
    call('checkout', { product_code: MAYA_PRO_PRODUCT.code, locale: 'en', idempotency_key: simultaneousKey }, token, target),
    call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: simultaneousKey }, token, target),
  ]);
  assert.deepEqual(simultaneous.map(response => response.status).sort(), [200, 409]);
  const savedKey = await env.DB.prepare(`SELECT COUNT(*) AS n FROM (
    SELECT order_id FROM maya_payment_orders WHERE user_id='member' AND checkout_key=?
    UNION ALL SELECT order_id FROM maya_pro_payment_orders WHERE user_id='member' AND checkout_key=?)`)
    .bind(simultaneousKey, simultaneousKey).first<{ n: number }>();
  assert.equal(savedKey?.n, 1);
  for (const locale of ['en', 'zh-TW'] as const) {
    const key = `pro-payment-${locale}`;
    const order = await checkout(MAYA_PRO_PRODUCT.code, locale, key, target);
    assert.equal(order.fields.TotalAmount, '699');
    assert.equal(order.fields.CustomField1, MAYA_PRO_PRODUCT.code);
    assert.match(order.fields.ClientBackURL, new RegExp(locale === 'en' ? '/en/maya-calendar/pro\\?' : '/maya-calendar/pro\\?'));
    assert.equal((await checkout(MAYA_PRO_PRODUCT.code, locale, key, target)).order_id, order.order_id);
    assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale, idempotency_key: key }, token, target)).status, 409);
    assert.equal((await callback(await fieldsFor(order, { TradeAmt: '899' }), 'callback', target)).status, 409);
    assert.equal((await callback(await fieldsFor(order, { SimulatePaid: '1' }), 'callback', target)).status, 400);
    const forged = await fieldsFor(order); forged.CheckMacValue = '0'.repeat(64);
    assert.equal((await callback(forged, 'callback', target)).status, 400);
    const fields = await fieldsFor(order);
    assert.equal((await callback(fields, 'result', target)).status, 303);
    assert.equal(await count('maya_pro_entitlements', order.order_id), 0);
    assert.equal(await (await callback(fields, 'callback', target)).text(), '1|OK');
    assert.equal(await (await callback(fields, 'callback', target)).text(), '1|OK');
    assert.equal(await count('maya_pro_entitlements', order.order_id), 1);
    assert.equal(await count('maya_entitlements', order.order_id), 0);
    const access = await call('pro/entitlements', undefined, token, target);
    assert.equal(access.status, 200, await access.clone().text());
    assert.ok((await access.json() as { entitlements: Array<{ product_code: string }> }).entitlements.some(e => e.product_code === MAYA_PRO_PRODUCT.code));
    assert.deepEqual((await (await call('pro/entitlements', undefined, other, target)).json() as { entitlements: unknown[] }).entitlements, []);
    assert.equal((await call(`checkout/${order.order_id}`, undefined, other, target)).status, 404);
    assert.equal((await call('pro/reports', { profile_id: profile.id, product_code: MAYA_PRO_PRODUCT.code, locale }, token, target)).status, 503);
    const adjustment = { action: 'refunded', reference: `pro-refund-${locale}` };
    assert.equal((await call(`payments/${order.order_id}/adjust`, adjustment, token, target)).status, 403);
    assert.equal((await call(`payments/${order.order_id}/adjust`, adjustment, admin, target)).status, 200);
    assert.equal((await call(`payments/${order.order_id}/adjust`, adjustment, admin, target)).status, 200);
    assert.equal((await callback(fields, 'callback', target)).status, 409);
  }
  assert.equal(requests.length, 0);
});

test('Independent relationship 899 orders never unlock legacy/Pro/499; historical 699 remains readable', async () => {
  await migrate('maya-pro-local-schema.sql');
  await migrate('migrations/029_maya_relationship_v2_payment.sql');
  globalThis.fetch = async () => { throw new Error('No external calls allowed during price tests'); };
  const target = { ...env, MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED: 'true' };
  await paid('MAYA_FULL_499');
  const proTarget = { ...target, MAYA_PRO_PAYMENT_ENABLED: 'true' };
  const individualPro = await checkout(MAYA_PRO_PRODUCT.code, 'en', crypto.randomUUID(), proTarget);
  assert.equal((await callback(await fieldsFor(individualPro), 'callback', proTarget)).status, 200);
  const config = await call('relationship/config', undefined, null, target);
  assert.equal(config.status, 200);
  assert.deepEqual((await config.json() as { product: unknown; reportAvailable: boolean }).product, MAYA_RELATIONSHIP_PRODUCT);
  assert.equal((await call('relationship/entitlements', undefined, null, target)).status, 401);
  assert.equal((await call('relationship/reports', undefined, null, target)).status, 401);
  const noAccess = await call('relationship/entitlements', undefined, token, target);
  assert.deepEqual((await noAccess.json() as { entitlements: unknown[] }).entitlements, []);
  assert.equal((await call('checkout', { product_code: 'MAYA_RELATIONSHIP_699', locale: 'en', idempotency_key: 'forbidden-new-legacy' })).status, 409);
  assert.equal((await call('checkout', { product_code: MAYA_RELATIONSHIP_PRODUCT.code, locale: 'en', idempotency_key: 'relationship-disabled' })).status, 503);
  for (const locale of ['en', 'zh-TW'] as const) {
    const fresh = await checkout(MAYA_RELATIONSHIP_PRODUCT.code, locale, crypto.randomUUID(), target);
    assert.equal(fresh.fields.TotalAmount, '899');
    assert.equal(fresh.fields.CustomField1, MAYA_RELATIONSHIP_PRODUCT.code);
    assert.match(fresh.fields.ClientBackURL, new RegExp(`${locale === 'en' ? '/en' : ''}/maya-calendar/relationship\\?`));
    assert.equal((await callback(await fieldsFor(fresh, { TradeAmt: '699' }), 'callback', target)).status, 409);
    assert.equal((await callback(await fieldsFor(fresh, { SimulatePaid: '1' }), 'callback', target)).status, 400);
    const fields = await fieldsFor(fresh);
    assert.equal((await callback(fields, 'result', target)).status, 303);
    assert.equal(await count('maya_relationship_entitlements', fresh.order_id), 0);
    assert.equal(await (await callback(fields, 'callback', target)).text(), '1|OK');
    assert.equal(await (await callback(fields, 'callback', target)).text(), '1|OK');
    assert.equal(await count('maya_relationship_entitlements', fresh.order_id), 1);
    assert.equal(await count('maya_entitlements', fresh.order_id), 0);
    assert.equal(await count('maya_pro_entitlements', fresh.order_id), 0);
    const grant = await env.DB.prepare('SELECT id FROM maya_relationship_entitlements WHERE order_id=?').bind(fresh.order_id).first<{ id: string }>();
    assert.ok(grant);
    const mine = await call('relationship/entitlements', undefined, token, target);
    assert.equal(mine.status, 200);
    assert.ok((await mine.json() as { entitlements: Array<{ id: string }> }).entitlements.some(e => e.id === grant.id));
    await env.DB.prepare("UPDATE maya_relationship_entitlements SET expires_at='2000-01-01' WHERE id=?").bind(grant.id).run();
    const expired = (await (await call('relationship/entitlements', undefined, token, target)).json() as { entitlements: Array<{ id: string }> }).entitlements;
    assert.ok(!expired.some(e => e.id === grant.id));
    await env.DB.prepare('UPDATE maya_relationship_entitlements SET expires_at=NULL WHERE id=?').bind(grant.id).run();
    assert.deepEqual((await (await call('relationship/entitlements', undefined, other, target)).json() as { entitlements: unknown[] }).entitlements, []);
    for (const product of ['MAYA_FULL_499', 'MAYA_RELATIONSHIP_699'] as const) {
      assert.equal((await call('reports', reportBody(grant, product), token, target)).status, 403);
    }
    assert.equal((await call('pro/reports', { profile_id: profile.id, entitlement_id: grant.id, locale, product_code: MAYA_PRO_PRODUCT.code }, token, { ...env, ENV: 'dev', MAYA_AI_MODE: 'mock', MAYA_PRO_LOCAL_ENABLED: 'true' })).status, 403);
    assert.equal((await call('relationship/reports', { entitlement_id: grant.id }, token, target)).status, 503);
    assert.equal((await call('relationship/reports', undefined, other, target)).status, 503);
    const ref = { action: 'refunded', reference: `relation-v2-${locale}` };
    assert.equal((await call(`payments/${fresh.order_id}/adjust`, ref, admin, target)).status, 200);
    assert.equal((await callback(fields, 'callback', target)).status, 409);
    const remaining = (await (await call('relationship/entitlements', undefined, token, target)).json() as { entitlements: Array<{ id: string }> }).entitlements;
    assert.ok(!remaining.some(e => e.id === grant.id));
  }
  const key = 'historical-relationship-pending';
  const historical = await checkout('MAYA_RELATIONSHIP_699', 'en', key);
  const retry = await checkout('MAYA_RELATIONSHIP_699', 'en', key);
  assert.equal(retry.order_id, historical.order_id);
  assert.equal(retry.fields.TotalAmount, '699');
  assert.equal((await callback(await fieldsFor(retry, { TradeAmt: '899' }))).status, 409);
  assert.equal((await callback(await fieldsFor(retry))).status, 200);
  const access = await call('entitlements');
  assert.equal(access.status, 200);
  const grants = (await access.json() as { entitlements: Array<{ id: string }> }).entitlements;
  for (const order of [historical]) {
    const grant = await env.DB.prepare('SELECT id FROM maya_entitlements WHERE order_id=?').bind(order.order_id).first<{ id: string }>();
    assert.ok(grant && grants.some(item => item.id === grant.id));
  }
  const grant = await env.DB.prepare('SELECT id FROM maya_entitlements WHERE order_id=?').bind(historical.order_id).first<{ id: string }>();
  assert.ok(grant);
  const mockEnv = { ...env, ENV: 'dev', MAYA_AI_MODE: 'mock' };
  const created = await call('reports', reportBody(grant, 'MAYA_RELATIONSHIP_699'), token, mockEnv);
  assert.equal(created.status, 200, await created.clone().text());
  const saved = await created.json() as { id: string; report: MayaReport };
  assert.equal(saved.report.product_code, 'MAYA_RELATIONSHIP_699');
  assert.equal(saved.report.sections.length, 7);
  assert.equal((await call(`reports/${saved.id}?locale=en`, undefined, token, mockEnv)).status, 200);
  assert.equal((await call(`reports/${saved.id}?locale=en`, undefined, other, mockEnv)).status, 404);
  assert.equal(requests.length, 0);
});

test('Only the named verified admin gets complimentary Live reports; no paid orders, payment grants or repeat AI cost', async () => {
  await migrate('migrations/028_maya_admin_reports.sql');
  await migrate('migrations/028_maya_admin_reports.sql');
  await env.DB.prepare("INSERT INTO profiles(id,email) VALUES ('owner','wadehuang77@gmail.com')").run();
  const owner = await signJwt({ sub: 'owner', email: 'wadehuang77@gmail.com' }, env.JWT_SECRET);
  const target = { ...env, MAYA_ADMIN_LIVE_ENABLED: 'true' };
  const personal = (await (await call('calculate', { birth_date: '1987-07-26', locale: 'en' }, owner, target)).json() as { profile: MayaProfile }).profile;
  const partner = (await (await call('calculate', { birth_date: '1990-01-01', locale: 'en', role: 'relationship' }, owner, target)).json() as { profile: MayaProfile }).profile;
  const spoof = await signJwt({ sub: 'other', email: 'wadehuang77@gmail.com' }, env.JWT_SECRET);
  for (const product of MAYA_PRODUCTS) for (const locale of ['en', 'zh-TW'] as const) {
    const body = { product_code: product.code, profile_id: personal.id, locale, idempotency_key: crypto.randomUUID(),
      ...(product.code === 'MAYA_RELATIONSHIP_699' ? { relationship_profile_id: partner.id } : {}) };
    for (const auth of [token, admin, spoof, null]) {
      const denied = await call('admin-reports', body, auth, target);
      assert.equal(denied.status, auth ? 403 : 401, await denied.text());
    }
    assert.equal((await call('admin-reports', body, owner, { ...target, MAYA_ADMIN_LIVE_ENABLED: 'false' })).status, 403);
    assert.equal((await call('admin-reports', body, owner, { ...target, MAYA_AI_ENABLED: 'false' })).status, 403);
    assert.equal((await call('admin-reports', { ...body, profile_id: profile.id }, owner, target)).status, 404);
    const response = await call('admin-reports', body, owner, target);
    assert.equal(response.status, 200, await response.clone().text());
    const result = await response.json() as { id: string; report: MayaReport };
    assert.equal(result.report.model_name, 'gpt-4o-mini');
    assert.equal(result.report.signature.kin_number, 34);
    const calls = requests.length;
    const repeated = await call('admin-reports', { ...body, idempotency_key: crypto.randomUUID() }, owner, target);
    assert.equal(repeated.status, 200, await repeated.clone().text());
    assert.equal((await repeated.json() as { id: string }).id, result.id);
    assert.equal(requests.length, calls);
    assert.equal((await call(`reports/${result.id}?locale=${locale}`, undefined, owner, target)).status, 200);
    assert.equal((await call(`reports/${result.id}?locale=${locale}`, undefined, token, target)).status, 404);
    assert.equal((await call(`reports/${result.id}?locale=${locale}`, undefined, owner, { ...target, MAYA_ADMIN_LIVE_ENABLED: 'false' })).status, 404);
  }
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id='owner' AND amount=0 AND status='complimentary' AND paid_at IS NULL AND ecpay_trade_no IS NULL AND item_type='maya_admin'").first<{ n: number }>())?.n, 6);
  for (const table of ['maya_entitlements','maya_payment_orders','maya_reports']) {
    assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id='owner'`).first<{ n: number }>())?.n, 0);
  }
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM maya_ai_budgets WHERE reserved_twd>1 OR actual_twd>1').first<{ n: number }>())?.n, 0);
  const history = await (await call('reports', undefined, owner, target)).json() as { reports: unknown[] };
  assert.equal(history.reports.length, 6);
  await env.DB.prepare("UPDATE profiles SET token_generation=1 WHERE id='owner'").run();
  assert.equal((await call('admin-reports', {}, owner, target)).status, 401);
});

test('All 32 feature combinations default-deny, require parent gates and reject simultaneous payment modes', async () => {
  const keys = ['MAYA_PUBLIC_ENABLED','MAYA_MEMBER_ENABLED','MAYA_PAYMENT_ENABLED','MAYA_AI_ENABLED','MAYA_SANDBOX_ENABLED'] as const;
  for (let mask = 0; mask < 32; mask++) {
    const values = Object.fromEntries(keys.map((key, index) => [key, mask & (1 << index) ? 'true' : 'false']));
    const flags = mayaFeatures({ ...env, ...values });
    assert.equal(flags.public, values.MAYA_PUBLIC_ENABLED === 'true');
    assert.equal(flags.member, values.MAYA_PUBLIC_ENABLED === 'true' && values.MAYA_MEMBER_ENABLED === 'true');
    if (values.MAYA_PAYMENT_ENABLED === 'true' && values.MAYA_SANDBOX_ENABLED === 'true') {
      assert.equal(flags.payment, false); assert.equal(flags.sandbox, false);
    }
    if (!flags.member) {
      for (const path of ['profile','daily','reports','checkout']) assert.equal((await call(path, undefined, token, { ...env, ...values })).status, 503);
    }
  }
  assert.deepEqual(mayaFeatures({ ...env, MAYA_PUBLIC_ENABLED: undefined }), { public: false, member: false, payment: false, ai: false, sandbox: false });
  assert.equal((await call('config', undefined, null, { ...env, MAYA_PUBLIC_ENABLED: 'false' })).status, 200);
  for (const value of ['TRUE','1','yes',undefined]) assert.equal(mayaFeatures({ ...env, MAYA_PUBLIC_ENABLED: value }).public, false);
  assert.equal((await call('reports', undefined, token, { ...env, MAYA_AI_ENABLED: 'false' })).status, 503);
  assert.equal((await callback(await fieldsFor(await checkout()), 'callback', { ...env, MAYA_PAYMENT_ENABLED: 'false' })).status, 503);
  assert.equal(requests.length, 0);
});

test('Production configuration is explicit, cannot fall back to stage/unknown environments, no admin payment bypass', async () => {
  for (const change of [
    { ECPAY_ENV: undefined }, { ECPAY_ENV: 'stage' }, { ENV: 'dev' }, { ECPAY_MERCHANT_ID: '3002607' },
    { ECPAY_HASH_KEY: undefined }, { MAYA_PAYMENT_API_ORIGIN: 'https://maya-api.example.test' },
    { MAYA_SANDBOX_ENABLED: 'true' },
  ]) {
    const target = { ...env, ...change };
    assert.equal(mayaPaymentEnabled(target), false);
    assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'disabled' }, admin, target)).status, 503);
  }
  assert.equal((await call('checkout', { product_code: 'MAYA_BASIC_199', locale: 'en', idempotency_key: 'anonymous' }, null)).status, 401);
  assert.ok(!Object.keys(SPREAD_CATALOG).some(key => key.startsWith('MAYA_')), 'Existing product catalog unchanged');
});

test('All three production products/locales use correct endpoint, signed callback paths and atomic exactly-one grants', async () => {
  await migrate('migrations/027_maya_production_payment_ai.sql');
  for (const locale of ['zh-TW','en'] as const) {
    for (const product of MAYA_PRODUCTS) {
      const key = crypto.randomUUID();
      const order = await checkout(product.code, locale, key);
      assert.equal((await checkout(product.code, locale, key)).order_id, order.order_id);
      assert.equal(order.endpoint, 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5');
      assert.equal(order.fields.MerchantID, '9999999');
      assert.equal(order.fields.TotalAmount, String(product.price));
      assert.equal(order.fields.ItemName, locale === 'en' ? product.en : product.zh);
      assert.equal(order.fields.ReturnURL, 'https://api.crystalfield101.com/api/maya/payments/callback');
      assert.equal(order.fields.OrderResultURL, 'https://api.crystalfield101.com/api/maya/payments/result');
      assert.equal(order.fields.CheckMacValue, await computeEcpayCheckMac(order.fields, env.ECPAY_HASH_KEY!, env.ECPAY_HASH_IV!));
      assert.equal(order.fields.PeriodAmount, undefined);
      assert.ok(!JSON.stringify(order).includes(env.ECPAY_HASH_KEY!));
      const fields = await fieldsFor(order);
      const returned = await callback(fields, 'result');
      assert.equal(returned.status, 303);
      assert.equal(new URL(returned.headers.get('Location')!).pathname, `${locale === 'en' ? '/en' : ''}/maya-calendar/member`);
      assert.equal(await count('maya_entitlements', order.order_id), 0, 'Browser result cannot grant');
      const responses = await Promise.all([callback(fields), callback(fields)]);
      assert.ok(responses.every(response => response.status === 200));
      assert.equal(await count('maya_entitlements', order.order_id), 1);
      assert.equal(await count('maya_sandbox_orders', order.order_id), 0);
      assert.equal((await call(`checkout/${order.order_id}`, undefined, other)).status, 404);
      assert.equal((await call('daily/premium')).status, 403);
      await env.DB.prepare("DELETE FROM maya_rate_limits WHERE scope='maya_checkout'").run();
    }
  }
});

test('Forged signatures/merchant/amount/product/trade, failed or simulated payment and alternate webhook cannot grant', async () => {
  const order = await checkout();
  const overrides: Record<string, string>[] = [
    { MerchantID: '3002607' }, { TradeAmt: '499' }, { CustomField1: 'MAYA_FULL_499' },
    { CustomField2: 'fake' }, { SimulatePaid: '1' }, { TradeNo: '' }, { CheckMacValue: 'A'.repeat(64) },
  ];
  for (const override of overrides) {
    const fields = await fieldsFor(order, override);
    if ('CheckMacValue' in override) fields.CheckMacValue = override.CheckMacValue;
    assert.notEqual((await callback(fields)).status, 200);
  }
  const fields = await fieldsFor(order);
  const duplicate = new URLSearchParams(fields);
  duplicate.append('MerchantID', '9999999');
  const dupe = await worker.fetch(new Request('https://api.crystalfield101.com/api/maya/payments/callback', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: duplicate,
  }), env, ctx);
  assert.equal(dupe.status, 400);
  const legacy = await worker.fetch(new Request('https://api.crystalfield101.com/api/ecpay-webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields),
  }), env, ctx);
  assert.notEqual(await legacy.text(), '1|OK');
  assert.equal(await count('maya_entitlements', order.order_id), 0);
  assert.equal((await callback(await fieldsFor(order, { RtnCode: '0' }))).status, 200);
  assert.equal((await callback(fields)).status, 409);
  assert.equal(await count('maya_entitlements', order.order_id), 0);
});

test('Audited manual refund/revocation requires admin, rejects replay conflicts and permanently denies report access', async () => {
  for (const action of ['refunded','revoked']) {
    const { order, access } = await paid();
    const input = reportBody(access);
    assert.equal((await call('reports', input)).status, 200);
    const reference = crypto.randomUUID();
    assert.equal((await call(`payments/${order.order_id}/adjust`, { action, reference })).status, 403);
    assert.equal((await call(`payments/${order.order_id}/adjust`, { action, reference }, admin)).status, 200);
    assert.equal((await call(`payments/${order.order_id}/adjust`, { action: action === 'refunded' ? 'revoked' : 'refunded', reference }, admin)).status, 409);
    assert.equal((await call(`payments/${order.order_id}/adjust`, { action, reference }, admin)).status, 200);
    assert.equal(await count('maya_payment_adjustments', order.order_id), 1);
    assert.equal((await call('reports', input)).status, 403);
    assert.equal((await callback(await fieldsFor(order))).status, 409);
    assert.equal((await env.DB.prepare('SELECT status FROM maya_entitlements WHERE id=?').bind(access.id).first<{ status: string }>())!.status, 'revoked');
  }
});

test('Live provider for every product and language preserves signatures, persists measured usage and never repeats completed requests', async () => {
  for (const locale of ['zh-TW','en'] as const) {
    for (const product of MAYA_PRODUCTS) {
      const { order, access } = await paid(product.code, locale);
      const input = reportBody(access, product.code, locale);
      const response = await call('reports', input);
      assert.equal(response.status, 200, await response.clone().text());
      const data = await response.json() as { id: string; report: MayaReport };
      assert.equal(data.report.model_name, MAYA_AI_MODEL);
      assert.deepEqual(data.report.signature, mayaForDate('1987-07-26', locale));
      assert.equal(data.report.sections.length, product.code === 'MAYA_BASIC_199' ? 3 : 7);
      assert.equal(data.report.usage.input_tokens, data.report.sections.length * 500);
      assert.equal(data.report.usage.output_tokens, data.report.sections.length * 200);
      assert.ok(data.report.usage.cost_twd > 0 && data.report.usage.cost_twd <= MAYA_AI_ORDER_CAP_TWD);
      const calls = requests.length;
      assert.equal((await call('reports', input)).status, 200);
      assert.equal(requests.length, calls);
      assert.equal((await call(`reports/${data.id}?locale=${locale}`, undefined, other)).status, 404);
      assert.equal((await call(`reports/${data.id}?locale=${locale}`)).status, 200);
      const budget = await env.DB.prepare('SELECT reserved_twd FROM maya_ai_budgets WHERE order_id=?').bind(order.order_id).first<{ reserved_twd: number }>();
      assert.ok(budget!.reserved_twd <= 1);
    }
  }
  for (const request of requests) {
    assert.equal(request.max_completion_tokens, 1200);
    assert.equal(request.model, MAYA_AI_MODEL);
    assert.ok(!JSON.stringify(request).includes('1987-07-26'));
    assert.ok(!JSON.stringify(request).includes('member@example.test'));
    assert.ok(request.messages[0].content.includes('BLOCKED'));
  }
});

test('AI gate off/no key/unpaid/other owner and mock mode cause zero provider calls', async () => {
  const { access } = await paid();
  const input = reportBody(access);
  assert.equal((await call('reports', input, token, { ...env, MAYA_AI_ENABLED: 'false' })).status, 503);
  assert.equal((await call('reports', input, token, { ...env, OPENAI_API_KEY: undefined })).status, 503);
  assert.equal((await call('reports', input, other)).status, 404);
  assert.equal((await call('reports', { ...input, entitlement_id: 'fake' })).status, 403);
  const mock = await call('reports', input, token, { ...env, ENV: 'dev', MAYA_AI_MODE: 'mock' });
  assert.equal(mock.status, 200);
  assert.equal((await mock.json() as { report: MayaReport }).report.model_name, 'mock-dreamspell-ai');
  assert.equal(requests.length, 0);
});

test('Known invalid schema is billable, retry reuses completed sections and persists cumulative token/cost usage', async () => {
  const { access } = await paid();
  const input = reportBody(access);
  let n = 0;
  globalThis.fetch = async (_url, init) => {
    n++;
    const response = success(init);
    if (n === 2) {
      const body = await response.json() as { choices: { message: { content: string } }[] };
      body.choices[0].message.content = '{"body":"<script>bad</script>"}';
      return new Response(JSON.stringify(body));
    }
    return response;
  };
  assert.equal((await call('reports', input)).status, 503);
  const response = await call('reports', input);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(n, 4, 'First completed section is not regenerated');
  const data = await response.json() as { report: MayaReport };
  assert.equal(data.report.usage.input_tokens, 2000);
});

test('Unknown provider response/timeouts/malformed usage are not retried automatically and budget limits precede network', async () => {
  for (const kind of ['timeout','http','usage']) {
    const { access, order } = await paid();
    const input = reportBody(access);
    let n = 0;
    globalThis.fetch = async () => {
      n++;
      if (kind === 'timeout') throw new DOMException('Aborted', 'TimeoutError');
      return kind === 'http' ? new Response('private-provider-error', { status: 500 })
        : new Response('{"choices":[],"usage":{"prompt_tokens":9999999,"completion_tokens":2}}');
    };
    assert.equal((await call('reports', input)).status, 503);
    assert.equal((await call('reports', input)).status, 503);
    assert.equal(n, 1);
    const budget = await env.DB.prepare('SELECT reserved_twd FROM maya_ai_budgets WHERE order_id=?').bind(order.order_id).first<{ reserved_twd: number }>();
    assert.equal(budget!.reserved_twd, MAYA_AI_RESERVATION_TWD);
  }
  const { order, access } = await paid();
  await env.DB.prepare("DELETE FROM maya_rate_limits WHERE scope='report-generation'").run();
  await env.DB.prepare('INSERT INTO maya_ai_budgets(order_id,reserved_twd) VALUES (?,1)').bind(order.order_id).run();
  let n = 0;
  globalThis.fetch = async () => { n++; throw new Error('Must not reach provider'); };
  assert.equal((await call('reports', reportBody(access))).status, 503);
  assert.equal(n, 0);
});

test('Atomic checkout grant failure rolls back production payment and preserves safe callback retry', async () => {
  const order = await checkout();
  await env.DB.prepare(`CREATE TRIGGER reject_maya_grant BEFORE INSERT ON maya_entitlements BEGIN SELECT RAISE(ABORT,'test failure'); END`).run();
  assert.equal((await callback(await fieldsFor(order))).status, 500);
  const row = await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.order_id).first<{ status: string }>();
  assert.equal(row!.status, 'pending');
  await env.DB.prepare('DROP TRIGGER reject_maya_grant').run();
  assert.equal((await callback(await fieldsFor(order))).status, 200);
  assert.equal(await count('maya_entitlements', order.order_id), 1);
});

test('Concurrent live generation claims once; revoked access during provider execution never returns a private report', async () => {
  const { access } = await paid();
  const input = reportBody(access);
  let started!: () => void;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { started = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    if (calls === 1) { started(); await wait; }
    return success(init);
  };
  const first = call('reports', input);
  await pending;
  assert.equal((await call('reports', input)).status, 202);
  release();
  assert.equal((await first).status, 200);
  assert.equal(calls, 3);
  await env.DB.prepare("DELETE FROM maya_rate_limits WHERE scope='report-generation'").run();
  const second = await paid();
  globalThis.fetch = async (_url, init) => {
    await env.DB.prepare("UPDATE maya_entitlements SET status='revoked' WHERE id=?").bind(second.access.id).run();
    return success(init);
  };
  const response = await call('reports', reportBody(second.access));
  assert.equal(response.status, 403);
});

test('Sandbox and production tables, callback routes and signed orders cannot cross modes', async () => {
  const id = crypto.randomUUID();
  const trade = `S${crypto.randomUUID().replaceAll('-', '').slice(0,19)}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount)
      VALUES (?,?,'member','member@example.test','maya_sandbox','MAYA_BASIC_199','sandbox',199)`).bind(id, trade),
    env.DB.prepare(`INSERT INTO maya_sandbox_orders(order_id,user_id,product_code,merchant_id,locale,checkout_key)
      VALUES (?,'member','MAYA_BASIC_199','3002607','en',?)`).bind(id, crypto.randomUUID()),
  ]);
  const fake: Checkout = { order_id: id, endpoint: '', fields: { MerchantTradeNo: trade, TotalAmount: '199', CustomField1: 'MAYA_BASIC_199' } };
  assert.equal((await callback(await fieldsFor(fake))).status, 404);
  assert.equal(await count('maya_entitlements', id), 0);
  const order = await checkout();
  const response = await worker.fetch(new Request('https://api.crystalfield101.com/api/maya/sandbox/callback', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(await fieldsFor(order)),
  }), env, ctx);
  assert.equal(response.status, 503);
  assert.equal(await count('maya_entitlements', order.order_id), 0);
});
