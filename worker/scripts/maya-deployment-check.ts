import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import entry from '../src/mayaTestEntry';
import { reserveMayaTestSection, mayaAiMode } from '../src/mayaAi';
import { mayaSandboxEnabled } from '../src/mayaPayments';
import { mayaSignature, mayaSummary } from '../../app/src/lib/maya';
import type { Env } from '../src/utils';

const ctx: ExecutionContext = {
  waitUntil() {}, passThroughOnException() {}, props: {},
  get tracing(): Tracing { throw new Error('Unused'); },
};
async function setup() {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("offline")}}',
    compatibilityDate: '2026-06-25', d1Databases: { DB: 'deployment-customer', DB_CARDS: 'deployment-cards' } });
  const { DB, DB_CARDS } = await mf.getBindings<{ DB: D1Database; DB_CARDS: D1Database }>();
  const env: Env = { DB, DB_CARDS, JWT_SECRET: '', ENV: 'dev', MAYA_PUBLIC_ENABLED: 'true',
    MAYA_CONTENT_SOURCE: 'cards', MAYA_AI_TEST_CAP_ENABLED: 'true', MAYA_AI_MODE: 'mock',
    ALLOWED_ORIGINS: 'https://crystalfield-maya-sandbox.pages.dev' };
  async function sql(db: D1Database, file: string) {
    const source = await readFile(new URL(`../../d1/${file}`, import.meta.url), 'utf8');
    await db.batch(source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
  }
  await sql(DB, 'maya-sandbox/customer-base.sql');
  await sql(DB, 'migrations/004-orders.sql');
  await sql(DB, 'migrations/025_maya_dreamspell.sql');
  await sql(DB, 'migrations/027_maya_production_payment_ai.sql');
  await sql(DB_CARDS, 'maya-sandbox/cards-maya-content.sql');
  await sql(DB_CARDS, 'maya-kin-content-seed.sql');
  return { mf, env };
}
test('Public test entry reads all 520 Cards rows; refuses private, admin and unrelated APIs without credentials', async () => {
  const { mf, env } = await setup();
  try {
    const call = (path: string, target = env) => entry.fetch(new Request(`https://test.workers.dev${path}`), target, ctx);
    for (let kin = 1; kin <= 260; kin++) for (const locale of ['zh-TW', 'en'] as const) {
      const response = await call(`/api/maya/content/${kin}?locale=${locale}`);
      assert.equal(response.status, 200);
      const data = await response.json<{ kin_number: number; free_summary: string; solar_seal: string }>();
      assert.equal(data.kin_number, kin);
      assert.equal(data.solar_seal, mayaSignature(kin, locale).solar_seal);
      assert.equal(data.free_summary, mayaSummary(mayaSignature(kin, locale), locale));
      assert.ok(!JSON.stringify(data).includes('birth_date'));
    }
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM maya_kin_content').first<{ n: number }>())!.n, 0);
    for (const path of ['/api/admin/members', '/api/checkout', '/api/cards', '/api/ecpay-webhook', '/api/profile', '/api/maya/payments/order/adjust']) {
      assert.equal((await call(path)).status, 404);
    }
    for (const path of ['/api/maya/profile', '/api/maya/calculate', '/api/maya/reports', '/api/maya/checkout']) {
      assert.equal((await call(path)).status, 503);
    }
    assert.equal((await call('/api/auth/google/config')).status, 503);
    assert.equal((await call('/api/health', { ...env, ENV: 'production' })).status, 503);
    assert.equal((await call('/api/health', { ...env, MAYA_PAYMENT_ENABLED: 'true' })).status, 503);
    assert.equal((await call('/api/maya/content/261?locale=en')).status, 400);
    assert.equal((await call('/api/maya/content/1?locale=xx')).status, 400);
    assert.equal((await call('/api/maya/content/1', { ...env, MAYA_PUBLIC_ENABLED: 'false' })).status, 503);
    await env.DB_CARDS.prepare('DELETE FROM maya_kin_content WHERE kin_number=1').run();
    assert.equal((await call('/api/maya/content/1')).status, 500, 'No success-shaped fallback when Cards seed is missing');
  } finally { await mf.dispose(); }
});
test('NT$2 durable aggregate cap, NT$0.40 report cap, global parallel lock and campaign failure stop', async () => {
  const { mf, env } = await setup();
  try {
    await env.DB.prepare("INSERT INTO profiles(id,email) VALUES ('test','test@example.test')").run();
    for (let i = 0; i < 6; i++) {
      await env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount)
        VALUES (?,?,'test','test@example.test','maya_sandbox','MAYA_BASIC_199','test',199)`).bind(`o${i}`, `trade${i}`).run();
      await env.DB.prepare(`INSERT INTO maya_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
        VALUES (?,'test','MAYA_BASIC_199',?,'active','verified_payment',datetime('now'))`).bind(`e${i}`, `o${i}`).run();
      await env.DB.prepare(`INSERT INTO maya_reports(id,user_id,report_type,locale,order_id,entitlement_id,idempotency_key,request_fingerprint,prompt_version,calculation_version)
        VALUES (?,'test','MAYA_BASIC_199','en',?,?,?,'offline','offline','dreamspell-2026.2')`)
        .bind(`r${i}`, `o${i}`, `e${i}`, `r${i}`).run();
    }
    const concurrent = await Promise.allSettled([
      reserveMayaTestSection(env, 'r0', 'o0', 0), reserveMayaTestSection(env, 'r1', 'o1', 0),
    ]);
    assert.equal(concurrent.filter(x => x.status === 'fulfilled').length, 1);
    const lock = await env.DB.prepare("SELECT report_id FROM maya_ai_sections WHERE state='reserved'").first<{ report_id: string }>();
    assert.ok(lock);
    await env.DB.prepare("UPDATE maya_ai_sections SET state='unknown' WHERE report_id=?").bind(lock.report_id).run();
    await assert.rejects(reserveMayaTestSection(env, 'r2', 'o2', 0), /AI_TEST_STOPPED/);
    await env.DB.prepare("UPDATE maya_ai_sections SET state='failed' WHERE report_id=?").bind(lock.report_id).run();
    await assert.rejects(reserveMayaTestSection(env, 'r2', 'o2', 0), /AI_TEST_STOPPED/);
    // Only this fresh local fixture is reconciled; no deployed reset endpoint exists.
    await env.DB.prepare('DELETE FROM maya_ai_sections').run();
    await env.DB.prepare('DELETE FROM maya_ai_budgets').run();
    await env.DB.prepare(`INSERT INTO maya_ai_sections(report_id,section_index,state,model_name,reserved_twd)
      VALUES ('r5',0,'completed','gpt-4o-mini',0.39)`).run();
    await assert.rejects(reserveMayaTestSection(env, 'r5', 'o5', 1), /AI_TEST_STOPPED/);
    await env.DB.prepare("DELETE FROM maya_ai_sections WHERE report_id='r5'").run();
    for (let report = 0; report < 5; report++) for (let section = 0; section < 7; section++) {
      await reserveMayaTestSection(env, `r${report}`, `o${report}`, section);
      await env.DB.prepare("UPDATE maya_ai_sections SET state='completed' WHERE report_id=? AND section_index=?").bind(`r${report}`, section).run();
    }
    const total = await env.DB.prepare('SELECT SUM(reserved_twd) AS total FROM maya_ai_budgets').first<{ total: number }>();
    assert.ok(total!.total <= 2 && total!.total > 1.98);
    await assert.rejects(reserveMayaTestSection(env, 'r5', 'o5', 0), /AI_TEST_STOPPED/);
    await assert.rejects(reserveMayaTestSection({ ...env, MAYA_AI_TEST_CAP_ENABLED: 'false' }, 'r5', 'o5', 0), /AI_TEST_CAP_REQUIRED/);
    assert.throws(() => mayaAiMode({ ...env, MAYA_MEMBER_ENABLED: 'true', MAYA_AI_ENABLED: 'true',
      MAYA_AI_MODE: 'live', MAYA_AI_TEST_CAP_ENABLED: 'false', OPENAI_API_KEY: 'offline-only' }), /AI_TEST_CAP_REQUIRED/);
  } finally { await mf.dispose(); }
});
test('ECPay official stage flow is separate from report provider mode; production secrets never enable Sandbox', () => {
  const base = { ENV: 'dev', MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_SANDBOX_ENABLED: 'true',
    MAYA_AI_MODE: 'live', MAYA_SANDBOX_MERCHANT_ID: '3002607', MAYA_SANDBOX_HASH_KEY: 'offline',
    MAYA_SANDBOX_HASH_IV: 'offline', MAYA_SANDBOX_API_ORIGIN: 'https://test.workers.dev',
    MAYA_SANDBOX_FRONTEND_ORIGIN: 'https://test.pages.dev', ALLOWED_ORIGINS: 'https://test.pages.dev' };
  assert.equal(mayaSandboxEnabled(base as Env), true);
  assert.equal(mayaSandboxEnabled({ ...base, MAYA_PAYMENT_ENABLED: 'true' } as Env), false);
  assert.equal(mayaSandboxEnabled({ ...base, MAYA_SANDBOX_HASH_KEY: undefined, ECPAY_HASH_KEY: 'production' } as Env), false);
});
