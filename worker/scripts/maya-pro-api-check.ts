import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import { routeMayaApi } from '../src/maya';
import { MAYA_CALCULATION_VERSION, mayaForDate } from '../../app/src/lib/maya';
import { MAYA_PRO_PRODUCT, validateMayaProReport, type MayaProReport } from '../../app/src/lib/mayaPro';
import type { Env } from '../src/utils';

let mf: Miniflare;
let env: Env;
const tokens = new Map<string, string>();
async function file(path: string) {
  const sql = await readFile(new URL(path, import.meta.url), 'utf8');
  const statements = sql.replace(/--[^\n]*/g, '').split(';').map(value => value.trim()).filter(Boolean);
  await env.DB.batch(statements.map(statement => env.DB.prepare(statement)));
}
before(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("local");}}', compatibilityDate: '2026-06-25', d1Databases: { DB: 'pro-local-isolated' } });
  const { DB } = await mf.getBindings<{ DB: D1Database }>();
  env = { DB, DB_CARDS: DB, ENV: 'dev', JWT_SECRET: 'pro-local-test-not-secret', MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_AI_MODE: 'mock', MAYA_PRO_LOCAL_ENABLED: 'true', ALLOWED_ORIGINS: 'https://local.example.test' };
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,token_generation INTEGER DEFAULT 0)').run();
  await file('../../d1/migrations/004-orders.sql');
  await file('../../d1/migrations/025_maya_dreamspell.sql');
  await file('../../d1/migrations/027_maya_production_payment_ai.sql');
  await file('../../d1/maya-pro-local-schema.sql');
  for (const user of ['owner', 'free', 'other']) {
    await DB.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(user, `${user}@example.test`).run();
    tokens.set(user, await signJwt({ sub: user, email: `${user}@example.test` }, env.JWT_SECRET));
    const signature = mayaForDate('1987-07-26', 'en');
    await DB.prepare(`INSERT INTO maya_kin_profiles(id,user_id,role,birth_date,kin_number,solar_seal,galactic_tone,wavespell,castle,calculation_version)
      VALUES(?,?,'personal','1987-07-26',?,?,?,?,?,?)`).bind(`profile-${user}`, user, signature.kin_number, signature.solar_seal_number, signature.tone_number, signature.wavespell, signature.castle, MAYA_CALCULATION_VERSION).run();
  }
  await DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,paid_at)
    VALUES('pro-order','PROLOCAL01','owner','owner@example.test','maya_mock',?,'Local Pro fixture',699,'paid',datetime('now'))`).bind(MAYA_PRO_PRODUCT.code).run();
  await DB.prepare(`INSERT INTO maya_pro_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES('pro-access','owner',?,'pro-order','active','local_mock','2020-01-01')`).bind(MAYA_PRO_PRODUCT.code).run();
  await DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,paid_at)
    VALUES('relationship-order','RELLOCAL01','owner','owner@example.test','maya_mock','MAYA_RELATIONSHIP_699','Legacy relationship',699,'paid',datetime('now'))`).run();
  await DB.prepare(`INSERT INTO maya_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES('relationship-access','owner','MAYA_RELATIONSHIP_699','relationship-order','active','local_mock','2020-01-01')`).run();
});
after(async () => { await mf?.dispose(); });
async function call(path: string, user: string | undefined = 'owner', body?: unknown, target = env, origin = 'https://local.example.test') {
  return routeMayaApi(new Request(`https://local.example.test/api/maya/pro/${path}`, {
    method: body ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...(user ? { Cookie: `bolt_session=${tokens.get(user)}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), target);
}
const input = (locale = 'en') => ({ locale, profile_id: 'profile-owner', entitlement_id: 'pro-access', product_code: MAYA_PRO_PRODUCT.code });
async function check<T = unknown>(response: Response, status: number): Promise<T> {
  assert.equal(response.status, status, await response.clone().text());
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  return response.json() as Promise<T>;
}
type ReportResponse = { id: string; report: MayaProReport };

test('Pro local D1 persists independent grants, caches reports, enforces sessions and rejects legacy same-price access', async () => {
  const config = await check<{ product: typeof MAYA_PRO_PRODUCT; payment: boolean; liveAi: boolean }>(await call('config', undefined), 200);
  assert.deepEqual([config.product.code, config.product.price, config.payment, config.liveAi], [MAYA_PRO_PRODUCT.code, 699, false, false]);
  await check(await call('reports', ''), 401);
  tokens.set('forged', 'invalid.session.token');
  await check(await call('reports', 'forged'), 401);
  tokens.set('expired', await signJwt({ sub: 'owner', email: 'owner@example.test' }, env.JWT_SECRET, -1));
  await check(await call('reports', 'expired'), 401);
  await check(await call('reports', 'owner', input(), env, 'https://evil.example.test'), 403);
  await check(await call('reports', 'free', { ...input(), profile_id: 'profile-free' }), 403);
  await check(await call('reports', 'owner', { ...input(), entitlement_id: 'relationship-access' }), 403);
  await check(await call('reports', 'owner', { ...input(), product_code: 'MAYA_RELATIONSHIP_699' }), 400);
  await check(await call('reports', 'owner', { ...input(), profile_id: 'profile-other' }), 404);
  await check(await call('reports', 'owner', { ...input(), kinNumber: 1 }), 400);
  const results = await Promise.all([call('reports', 'owner', input()), call('reports', 'owner', input())]);
  const a = await check<ReportResponse>(results[0], 200);
  const b = await check<ReportResponse>(results[1], 200);
  assert.equal(a.id, b.id);
  const report = a.report;
  assert.ok(validateMayaProReport(report, 34, 'en'));
  assert.equal(report.productCode, MAYA_PRO_PRODUCT.code);
  assert.equal((await check<ReportResponse>(await call('reports', 'owner', input()), 200)).id, a.id);
  assert.equal((await check<ReportResponse>(await call(`reports/${a.id}?locale=en`), 200)).report.kinNumber, 34);
  await check(await call(`reports/${a.id}?locale=en`, 'other'), 404);
  await check(await call(`reports/${a.id}?locale=zh-TW`), 404);
  assert.deepEqual((await check<{ reports: unknown[] }>(await call('reports?locale=en', 'other'), 200)).reports, []);
  const zh = await check<ReportResponse>(await call('reports', 'owner', input('zh-TW')), 200);
  assert.ok(validateMayaProReport(zh.report, 34, 'zh-TW'));
  const count = await env.DB.prepare('SELECT COUNT(*) AS count,SUM(actual_cost_twd) AS cost FROM maya_pro_reports').first<{ count: number; cost: number }>();
  assert.deepEqual(count, { count: 2, cost: 0 });
  const legacy = await env.DB.prepare('SELECT product_code FROM maya_entitlements').all();
  assert.equal(legacy.results.length, 1);
  assert.equal(legacy.results[0].product_code, 'MAYA_RELATIONSHIP_699');
  for (const change of ["UPDATE maya_pro_entitlements SET status='revoked'", "UPDATE maya_pro_entitlements SET expires_at='2000-01-01'", "UPDATE orders SET status='refunded' WHERE id='pro-order'", "UPDATE orders SET amount=499 WHERE id='pro-order'", "UPDATE orders SET item_id='MAYA_RELATIONSHIP_699' WHERE id='pro-order'"]) {
    await env.DB.prepare(change).run();
    await check(await call(`reports/${a.id}?locale=en`), 403);
    assert.deepEqual((await check<{ entitlements: unknown[] }>(await call('entitlements?locale=en'), 200)).entitlements, []);
    await env.DB.prepare("UPDATE maya_pro_entitlements SET status='active',expires_at=NULL").run();
    await env.DB.prepare("UPDATE orders SET status='paid',amount=699,item_id=? WHERE id='pro-order'").bind(MAYA_PRO_PRODUCT.code).run();
  }
  await env.DB.prepare("UPDATE maya_kin_profiles SET birth_date='1990-01-01',kin_number=?,solar_seal=?,galactic_tone=? WHERE id='profile-owner'")
    .bind(mayaForDate('1990-01-01', 'en').kin_number, mayaForDate('1990-01-01', 'en').solar_seal_number, mayaForDate('1990-01-01', 'en').tone_number).run();
  await check(await call('reports', 'owner', input()), 409);
});

test('Production Pro is fail-closed and an over-cap local estimate records its reason without generation', async () => {
  const target = { ...env, ENV: 'production', MAYA_AI_MODE: 'live', MAYA_PAYMENT_ENABLED: 'true', MAYA_AI_ENABLED: 'true' };
  assert.equal((await check<{ enabled: boolean }>(await call('config', '', undefined, { ...env, MAYA_PRO_LOCAL_ENABLED: undefined }), 200)).enabled, false);
  await check(await call('reports', 'owner', input(), { ...env, MAYA_PRO_LOCAL_ENABLED: undefined }), 503);
  assert.equal((await check<{ enabled: boolean }>(await call('config', undefined, undefined, target), 200)).enabled, false);
  await check(await call('reports', 'owner', input(), target), 503);
  await check(await call('checkout', 'owner', input(), target), 503);
  await env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,paid_at)
    VALUES('blocked-order','PROLOCAL02','owner','owner@example.test','maya_mock',?,'Blocked local fixture',699,'paid',datetime('now'))`).bind(MAYA_PRO_PRODUCT.code).run();
  await env.DB.prepare(`INSERT INTO maya_pro_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES('blocked-access','owner',?,'blocked-order','active','local_mock','2020-01-01')`).bind(MAYA_PRO_PRODUCT.code).run();
  const response = await check<{ code: string }>(await call('reports', 'owner', { ...input(), entitlement_id: 'blocked-access' }, { ...env, MAYA_PRO_REPORT_CAP_TWD: '0.1' }), 409);
  assert.equal(response.code, 'PRO_COST_LIMIT');
  const row = await env.DB.prepare("SELECT status,last_error_code,report_content,actual_cost_twd FROM maya_pro_reports WHERE order_id='blocked-order'").first();
  assert.deepEqual(row, { status: 'blocked', last_error_code: 'PRO_COST_LIMIT', report_content: null, actual_cost_twd: 0 });
});

test('Existing own-profile deletion removes Pro private JSON without deleting orders or other members', async () => {
  const response = await routeMayaApi(new Request('https://local.example.test/api/maya/profile?locale=en', {
    method: 'DELETE', headers: { Origin: 'https://local.example.test', Cookie: `bolt_session=${tokens.get('owner')}` },
  }), env);
  await check(response, 200);
  const reports = await env.DB.prepare('SELECT COUNT(*) AS count FROM maya_pro_reports WHERE user_id=?').bind('owner').first<{ count: number }>();
  assert.equal(reports?.count, 0);
  const others = await env.DB.prepare('SELECT COUNT(*) AS count FROM maya_kin_profiles WHERE user_id<>?').bind('owner').first<{ count: number }>();
  assert.equal(others?.count, 2);
  const orders = await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>();
  assert.equal(orders?.count, 3);
});
