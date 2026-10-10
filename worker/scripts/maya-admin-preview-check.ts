import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import { routeMayaApi } from '../src/maya';
import type { Env } from '../src/utils';
import { validateMayaReport, type MayaReport, type MayaProfile } from '../../app/src/lib/maya';

test('Admin-only free Mock preview uses owned canonical profiles without paid orders, entitlements, reports or AI', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("local")}}', compatibilityDate: '2026-06-25', d1Databases: ['DB'] });
  try {
    const db = await mf.getD1Database('DB');
    await db.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE,token_generation INTEGER DEFAULT 0)').run();
    await db.prepare('CREATE TABLE admins(id TEXT PRIMARY KEY)').run();
    for (const id of ['admin-a', 'admin-b', 'ordinary']) await db.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(id, `${id}@example.test`).run();
    for (const id of ['admin-a', 'admin-b']) await db.prepare('INSERT INTO admins(id) VALUES(?)').bind(id).run();
    for (const name of ['004-orders.sql', '025_maya_dreamspell.sql', '027_maya_production_payment_ai.sql']) {
      const sql = await readFile(new URL(`../../d1/migrations/${name}`, import.meta.url), 'utf8');
      await db.batch(sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
    }
    const env: Env = {
      DB: db, DB_CARDS: db, JWT_SECRET: 'local-admin-test-key', ALLOWED_ORIGINS: 'https://www.crystalfield101.com',
      MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'false', MAYA_ADMIN_PREVIEW_ENABLED: 'true',
      MAYA_PAYMENT_ENABLED: 'false', MAYA_AI_ENABLED: 'false', MAYA_SANDBOX_ENABLED: 'false',
      OPENAI_API_KEY: 'never-use-this-local-sentinel',
    };
    const tokens = new Map<string, string>();
    for (const id of ['admin-a', 'admin-b', 'ordinary']) tokens.set(id, await signJwt({ sub: id, email: `${id}@example.test` }, env.JWT_SECRET));
    const call = (path: string, id?: string, body?: unknown, target = env, origin = 'https://www.crystalfield101.com') => routeMayaApi(new Request(`https://api.crystalfield101.com/api/maya/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(id ? { Cookie: `bolt_session=${tokens.get(id)}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), target);
    assert.deepEqual(await (await call('config', 'admin-a')).json(), { public: true, member: true, payment: false, ai: false, sandbox: false, admin_preview: true });
    for (const id of [undefined, 'ordinary']) {
      assert.equal((await (await call('config', id)).json() as { member: boolean }).member, false);
      assert.equal((await call('profile', id)).status, id ? 503 : 401);
      assert.notEqual((await call('admin-preview', id, { profile_id: 'fake' })).status, 200);
    }
    const personalResponse = await call('calculate', 'admin-a', { birth_date: '1987-07-26', locale: 'en' });
    assert.equal(personalResponse.status, 200);
    const personal = (await personalResponse.json() as { profile: MayaProfile }).profile;
    const partner = (await (await call('calculate', 'admin-a', { birth_date: '1990-01-01', locale: 'en', role: 'relationship' })).json() as { profile: MayaProfile }).profile;
    assert.equal(personal.kin_number, 34);
    assert.equal((await call('daily?locale=en', 'admin-a')).status, 200);
    for (const product of ['MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699']) for (const locale of ['en', 'zh-TW']) {
      const body = { product_code: product, locale, profile_id: personal.id, ...(product === 'MAYA_RELATIONSHIP_699' ? { relationship_profile_id: partner.id } : {}) };
      const response = await call('admin-preview', 'admin-a', body);
      assert.equal(response.status, 200);
      const result = await response.json() as { mode: string; persisted: boolean; report: MayaReport };
      assert.equal(result.mode, 'admin_mock_preview');
      assert.equal(result.persisted, false);
      assert.equal(result.report.model_name, 'mock-dreamspell-ai');
      assert.equal(result.report.usage.cost_twd, 0);
      assert.ok(validateMayaReport(result.report, result.report));
      assert.equal(result.report.signature.kin_number, 34);
      assert.equal((await call('admin-preview', 'admin-b', body)).status, 404);
      assert.equal((await call('admin-preview', 'admin-a', { ...body, kin_number: 1 })).status, 400);
      assert.equal((await call('admin-preview', 'admin-a', body, env, 'https://evil.test')).status, 403);
      assert.equal((await call('admin-preview', 'admin-a', body, { ...env, MAYA_ADMIN_PREVIEW_ENABLED: 'false' })).status, 503);
    }
    assert.equal((await call('calculate', 'admin-a', { birth_date: '2024-02-29', locale: 'en' })).status, 422);
    for (const path of ['reports', 'reports/fake', 'daily/premium']) assert.notEqual((await call(path, 'admin-a')).status, 200);
    assert.deepEqual((await (await call('profile', 'admin-b')).json() as { profiles: MayaProfile[] }).profiles, []);
    for (const table of ['orders', 'maya_entitlements', 'maya_reports', 'maya_payment_orders', 'maya_ai_budgets', 'maya_ai_sections']) {
      assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n, 0);
    }
    await db.prepare("DELETE FROM admins WHERE id='admin-a'").run();
    assert.equal((await call('profile', 'admin-a')).status, 503);
    await db.prepare("UPDATE profiles SET token_generation=1 WHERE id='admin-b'").run();
    assert.equal((await call('profile', 'admin-b')).status, 401);
  } finally { await mf.dispose(); }
});
