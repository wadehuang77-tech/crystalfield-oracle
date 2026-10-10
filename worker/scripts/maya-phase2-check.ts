import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { routeMayaApi } from '../src/maya';
import { signJwt } from '../src/auth';
import worker from '../src/index';
import type { Env } from '../src/utils';
import type { MayaProfile, MayaReport } from '../../app/src/lib/maya';

let mf: Miniflare;
let env: Env;
const tokens = new Map<string, string>();
const ctx: ExecutionContext = {
  waitUntil() {}, passThroughOnException() {}, props: {},
  get tracing(): Tracing { throw new Error('Tracing is not used by these request tests'); },
};
let personal: MayaProfile;
let partner: MayaProfile;
let reportId = '';
async function sqlFile(path: string) {
  const sql = await readFile(new URL(path, import.meta.url), 'utf8');
  const statements = sql.replace(/--[^\n]*/g, '').split(';').map((value) => value.trim()).filter(Boolean);
  await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)));
}
before(async () => {
  mf = new Miniflare({
    modules: true, script: 'export default { fetch() { return new Response("local-d1"); } }',
    compatibilityDate: '2026-06-25', d1Databases: { DB: 'maya-isolated-test-db' },
  });
  const { DB: db } = await mf.getBindings<{ DB: D1Database }>();
  env = { DB: db, DB_CARDS: db, JWT_SECRET: 'maya-test-secret-not-production', ENV: 'dev', MAYA_AI_MODE: 'mock', MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_AI_ENABLED: 'true', ALLOWED_ORIGINS: 'https://maya.example.test' };
  await db.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, token_generation INTEGER DEFAULT 0)').run();
  await sqlFile('../../d1/migrations/004-orders.sql');
  await sqlFile('../../d1/migrations/025_maya_dreamspell.sql');
  await sqlFile('../../d1/migrations/027_maya_production_payment_ai.sql');
  await sqlFile('../../d1/maya-local-fixtures.sql');
  await sqlFile('../../d1/maya-kin-content-seed.sql');
  for (const role of ['paid', 'free', 'other']) {
    tokens.set(role, await signJwt({ sub: `maya-test-${role}`, email: `maya-${role}@example.test` }, env.JWT_SECRET));
  }
});
after(async () => { await mf?.dispose(); });

function request(path: string, role?: string, body?: unknown, method?: string) {
  return new Request(`https://maya.example.test/api/maya/${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Origin: 'https://maya.example.test', 'Content-Type': 'application/json',
      ...(role ? { Cookie: `bolt_session=${tokens.get(role)}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function call(path: string, role?: string, body?: unknown, method?: string, target = env) {
  return routeMayaApi(request(path, role, body, method), target);
}
async function body<T>(response: Response, status = 200): Promise<T> {
  assert.equal(response.status, status, await response.clone().text());
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  return response.json() as Promise<T>;
}
function reportInput(product = 'MAYA_BASIC_199', key = 'basic-key', locale = 'en') {
  return {
    locale, product_code: product, profile_id: personal.id,
    entitlement_id: product === 'MAYA_BASIC_199' ? 'maya-test-ent-basic' : product === 'MAYA_FULL_499' ? 'maya-test-ent-full' : 'maya-test-ent-relationship',
    idempotency_key: key,
    ...(product === 'MAYA_RELATIONSHIP_699' ? { relationship_profile_id: partner.id } : {}),
  };
}

test('Isolated D1 migration is repeatable, additive and constrains foreign keys and duplicate fixtures', async () => {
  await sqlFile('../../d1/migrations/025_maya_dreamspell.sql');
  await sqlFile('../../d1/maya-local-fixtures.sql');
  const rows = await env.DB.prepare('SELECT COUNT(*) AS count FROM maya_entitlements').first<{ count: number }>();
  assert.equal(rows?.count, 3);
  const profiles = await env.DB.prepare('SELECT COUNT(*) AS count FROM profiles').first<{ count: number }>();
  assert.equal(profiles?.count, 3);
  const content = await env.DB.prepare('SELECT COUNT(*) AS count FROM maya_kin_content').first<{ count: number }>();
  assert.equal(content?.count, 520);
  await assert.rejects(env.DB.prepare(`INSERT INTO maya_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES ('bad','missing','MAYA_BASIC_199','maya-test-basic','active','local_mock','2020-01-01')`).run());
  await assert.rejects(env.DB.prepare(`INSERT INTO maya_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES ('duplicate','maya-test-paid','MAYA_BASIC_199','maya-test-basic','active','local_mock','2020-01-01')`).run());
});

test('Every private endpoint rejects missing, tampered and expired sessions', async () => {
  for (const [path, payload] of [
    ['calculate', { birth_date: '1987-07-26', locale: 'en' }], ['profile', undefined],
    ['daily', undefined], ['daily/premium', undefined], ['reports', { locale: 'en' }],
    ['reports', undefined], ['reports/fake', undefined], ['entitlements', undefined],
  ] as const) await body(await call(path, undefined, payload), 401);
  tokens.set('invalid', 'tampered.invalid.token');
  await body(await call('profile', 'invalid'), 401);
  tokens.set('expired', await signJwt({ sub: 'maya-test-paid', email: 'test@example.test' }, env.JWT_SECRET, -1));
  await body(await call('profile', 'expired'), 401);
});

test('Session-bound two-member acceptance does not open general membership, payment, AI or Sandbox', async () => {
  const target: Env = {
    ...env, MAYA_MEMBER_ENABLED: 'false', MAYA_AI_ENABLED: 'false', MAYA_PAYMENT_ENABLED: 'false',
    MAYA_SANDBOX_ENABLED: 'false', MAYA_MEMBER_TEST_USER_IDS: 'maya-test-paid,maya-test-free',
  };
  const config = await body<{ member: boolean; payment: boolean; ai: boolean; sandbox: boolean }>(await call('config', 'paid', undefined, undefined, target));
  assert.deepEqual(config, { public: true, member: true, payment: false, ai: false, sandbox: false });
  for (const role of [undefined, 'other']) {
    const result = await body<{ member: boolean }>(await call('config', role, undefined, undefined, target));
    assert.equal(result.member, false);
    await body(await call('profile', role, undefined, undefined, target), role ? 503 : 401);
  }
  for (const role of ['paid', 'free']) {
    await body(await call('profile?locale=en', role, undefined, undefined, target));
    await body(await call('reports', role, undefined, undefined, target), 503);
    const requestConfig = new Request('https://maya.example.test/api/maya/checkout/config', {
      headers: { Cookie: `bolt_session=${tokens.get(role)}` },
    });
    const paymentConfig = await worker.fetch(requestConfig, target, ctx);
    assert.deepEqual(await body(paymentConfig), { enabled: false, mode: 'sandbox' });
    const checkout = new Request('https://maya.example.test/api/maya/checkout', {
      method: 'POST', headers: { Origin: 'https://maya.example.test', Cookie: `bolt_session=${tokens.get(role)}` },
    });
    await body(await worker.fetch(checkout, target, ctx), 503);
  }
  const forged = new Request('https://maya.example.test/api/maya/profile?user_id=maya-test-paid');
  await body(await routeMayaApi(forged, target), 401);
  await body(await call('profile', 'paid', undefined, undefined, { ...target, MAYA_MEMBER_TEST_USER_IDS: 'maya-test-paid,maya-test-paid' }), 500);
  await body(await call('profile', 'paid', undefined, undefined, { ...target, MAYA_PAYMENT_ENABLED: 'true' }), 503);
});

test('Worker dispatcher uses Maya routes and rejects CSRF before writes', async () => {
  const response = await worker.fetch(request('profile?locale=en', 'paid'), env, ctx);
  await body(response);
  const unsafe = new Request('https://maya.example.test/api/maya/calculate', {
    method: 'POST', headers: { Cookie: `bolt_session=${tokens.get('paid')}`, Origin: 'https://evil.example.test' },
    body: JSON.stringify({ birth_date: '1987-07-26' }),
  });
  assert.equal((await worker.fetch(unsafe, env, ctx)).status, 403);
});

test('Authenticated calculation persists isolated personal and partner records with canonical data', async () => {
  personal = (await body<{ profile: MayaProfile }>(await call('calculate', 'paid', { birth_date: '1987-07-26', locale: 'en' }))).profile;
  partner = (await body<{ profile: MayaProfile }>(await call('calculate', 'paid', { birth_date: '1990-01-01', locale: 'en', role: 'relationship' }))).profile;
  assert.equal(personal.kin_number, 34);
  assert.equal(personal.solar_seal, 'White Wizard');
  const repeat = await body<{ profile: MayaProfile }>(await call('calculate', 'paid', { birth_date: '1987-07-26', locale: 'en' }));
  assert.equal(repeat.profile.id, personal.id);
  const other = await body<{ profiles: MayaProfile[] }>(await call('profile?locale=en', 'other'));
  assert.equal(other.profiles.length, 0);
  await body(await call(`profile?user_id=maya-test-paid`, 'other'), 400);
  await body(await call('calculate', 'paid', { birth_date: '2024-02-30' }), 400);
  await body(await call('calculate', 'paid', { birth_date: '2024-02-29' }), 422);
  await body(await call('calculate', 'paid', { birth_date: '9999-01-01' }), 400);
  await body(await call('calculate', 'paid', { birth_date: "1987-07-26';DROP TABLE profiles;--" }), 400);
  await body(await call('calculate', 'paid', { birth_date: '1987-07-26', kin_number: 1 }), 400);
  const zh = await body<{ profiles: MayaProfile[] }>(await call('profile?locale=zh-TW', 'paid'));
  assert.equal(zh.profiles.find((row) => row.role === 'personal')?.solar_seal, '白色巫師');
});

test('Daily content is cached in D1, localized, timezone-defined and never leaks paid fields', async () => {
  await body(await call('daily?locale=en&date=2026-07-26', 'free'));
  await env.DB.prepare("UPDATE maya_daily_energy SET premium_content = 'PRIVATE_PAID_TEXT'").run();
  const response = await call('daily?locale=en&date=2026-07-26', 'free');
  const text = await response.clone().text();
  assert.doesNotMatch(text, /premium_content|PRIVATE_PAID_TEXT|[\u3400-\u9fff]/u);
  const data = await body<{ daily: { timezone: string; special_day: string } }>(response);
  assert.equal(data.daily.timezone, 'Asia/Taipei');
  assert.equal(data.daily.special_day, 'new_year');
  await body(await call('daily/premium?locale=en', 'free'), 403);
  await body(await call('daily/premium?locale=en', 'paid'), 403);
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM maya_daily_energy').first<{ count: number }>();
  assert.equal(count?.count, 1);
});

test('Free users, forged payment payloads and other members cannot unlock reports', async () => {
  await body(await call('reports', 'free', reportInput()), 404);
  const free = await body<{ profile: MayaProfile }>(await call('calculate', 'free', { birth_date: '1987-07-26', locale: 'en' }));
  await body(await call('reports', 'free', { ...reportInput(), profile_id: free.profile.id }), 403);
  for (let callback = 0; callback < 2; callback++) {
    await body(await call('payments/callback', 'free', { paid: true, product_code: 'MAYA_BASIC_199' }), 404);
  }
  await body(await call('reports', 'paid', { ...reportInput(), paid: true }), 400);
  await body(await call('reports', 'paid', { ...reportInput(), kin_number: 260 }), 400);
  await body(await call('reports', 'paid', { ...reportInput(), entitlement_id: 'invented' }), 403);
  await body(await call('reports', 'paid', { ...reportInput(), product_code: 'MAYA_FULL_499' }), 403);
  await env.DB.prepare("UPDATE orders SET status = 'pending' WHERE id = 'maya-test-basic'").run();
  await body(await call('reports', 'paid', reportInput()), 403);
  await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = 'maya-test-basic'").run();
  await body(await call('reports', 'paid', reportInput()), 403);
  await env.DB.prepare("UPDATE orders SET status = 'paid', amount = 1 WHERE id = 'maya-test-basic'").run();
  await body(await call('reports', 'paid', reportInput()), 403);
  await env.DB.prepare("UPDATE orders SET amount = 199 WHERE id = 'maya-test-basic'").run();
});

test('All products persist mock reports, enforce idempotency and support both languages at zero cost', async () => {
  for (const product of ['MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699']) {
    for (const locale of ['en', 'zh-TW']) {
      const input = reportInput(product, `${product}-${locale}`, locale);
      const responses = await Promise.all([call('reports', 'paid', input), call('reports', 'paid', input)]);
      for (const response of responses) assert.ok([200, 202].includes(response.status), await response.clone().text());
      const result = await body<{ id: string; report: MayaReport }>(await call('reports', 'paid', input));
      if (product === 'MAYA_BASIC_199' && locale === 'en') reportId = result.id;
      assert.equal(result.report.signature.kin_number, 34);
      assert.equal(result.report.usage.cost_twd, 0);
      if (locale === 'en') assert.doesNotMatch(JSON.stringify(result.report), /[\u3400-\u9fff]/u);
      if (product === 'MAYA_RELATIONSHIP_699') assert.equal(result.report.relationship_signature?.kin_number, partner.kin_number);
      const replay = await body<{ id: string }>(await call('reports', 'paid', { ...input, idempotency_key: `${product}-${locale}-another` }));
      assert.equal(replay.id, result.id);
    }
  }
  const rows = await env.DB.prepare('SELECT COUNT(*) AS count, SUM(cost_twd) AS cost FROM maya_reports').first<{ count: number; cost: number }>();
  assert.equal(rows?.count, 6);
  assert.equal(rows?.cost, 0);
  await body(await call('reports', 'paid', { ...reportInput(), profile_id: partner.id }), 400);
  await body(await call('reports', 'paid', reportInput('MAYA_FULL_499', 'MAYA_BASIC_199-en', 'zh-TW')), 409);
});

test('Report retrieval and history enforce ownership, revocation, expiry, failed payment and language', async () => {
  await body(await call(`reports/${reportId}?locale=en`, 'other'), 404);
  const other = await body<{ reports: unknown[] }>(await call('reports?locale=en', 'other'));
  assert.deepEqual(other.reports, []);
  const english = await body<{ report: MayaReport }>(await call(`reports/${reportId}?locale=en`, 'paid'));
  assert.equal(english.report.locale, 'en');
  const chinese = await body<{ report: MayaReport }>(await call(`reports/${reportId}?locale=zh-TW`, 'paid'));
  assert.equal(chinese.report.locale, 'zh-TW');
  for (const update of [
    "status = 'revoked'", "status = 'expired'", "status = 'active', expires_at = '2000-01-01'",
    "status = 'active', expires_at = NULL, starts_at = '2999-01-01'",
  ]) {
    await env.DB.prepare(`UPDATE maya_entitlements SET ${update} WHERE id = 'maya-test-ent-basic'`).run();
    await body(await call(`reports/${reportId}?locale=en`, 'paid'), 403);
  }
  await env.DB.prepare("UPDATE maya_entitlements SET status = 'active', starts_at = '2020-01-01', expires_at = NULL").run();
  await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = 'maya-test-basic'").run();
  await body(await call(`reports/${reportId}?locale=en`, 'paid'), 403);
  await env.DB.prepare("UPDATE orders SET status = 'paid' WHERE id = 'maya-test-basic'").run();
  await env.DB.prepare("UPDATE profiles SET token_generation = 1 WHERE id = 'maya-test-paid'").run();
  await body(await call(`reports/${reportId}?locale=en`, 'paid'), 401);
  await env.DB.prepare("UPDATE profiles SET token_generation = 0 WHERE id = 'maya-test-paid'").run();
});

test('Mock generation and test entitlements are denied outside explicit local mode', async () => {
  await body(await call('reports', 'paid', reportInput(), undefined, { ...env, ENV: 'production' }), 503);
  await body(await call(`reports/${reportId}?locale=en`, 'paid', undefined, undefined, { ...env, ENV: 'production' }), 403);
  await body(await call('reports', 'paid', reportInput(), undefined, { ...env, MAYA_AI_MODE: undefined }), 503);
});

test('Persistence failure is explicit, keeps retryable state and does not duplicate reports or payments', async () => {
  await env.DB.prepare("UPDATE maya_reports SET report_status = 'failed', report_content = NULL, attempts = 0 WHERE id = ?").bind(reportId).run();
  let fail = true;
  const db = new Proxy(env.DB, {
    get(target, key) {
      if (key === 'prepare') return (sql: string) => {
        if (fail && /SET report_status = 'completed'/.test(sql)) {
          fail = false;
          throw new Error('Test persistence failure');
        }
        return target.prepare(sql);
      };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  // Completed replays used no generation quota; allow isolated retry-budget testing.
  await env.DB.prepare("DELETE FROM maya_rate_limits WHERE scope = 'report-generation'").run();
  await body(await call('reports', 'paid', reportInput('MAYA_BASIC_199', 'MAYA_BASIC_199-en'), undefined, { ...env, DB: db }), 500);
  const failed = await env.DB.prepare('SELECT report_status, attempts FROM maya_reports WHERE id = ?').bind(reportId).first<{ report_status: string; attempts: number }>();
  assert.equal(failed?.report_status, 'failed');
  assert.equal(failed?.attempts, 1);
  const retry = await body<{ id: string }>(await call('reports', 'paid', reportInput('MAYA_BASIC_199', 'MAYA_BASIC_199-en')));
  assert.equal(retry.id, reportId);
  await env.DB.prepare("UPDATE maya_reports SET report_status = 'failed', attempts = 3 WHERE id = ?").bind(reportId).run();
  await body(await call('reports', 'paid', reportInput('MAYA_BASIC_199', 'MAYA_BASIC_199-en')), 409);
});

test('Rate limits are enforced atomically and database/session errors fail closed without secret leakage', async () => {
  await env.DB.prepare("DELETE FROM maya_rate_limits WHERE user_id = 'maya-test-free'").run();
  const responses = await Promise.all(Array.from({ length: 25 }, () => call('calculate', 'free', { birth_date: '1987-07-26', locale: 'en' })));
  assert.equal(responses.filter((response) => response.status === 200).length, 20);
  assert.equal(responses.filter((response) => response.status === 429).length, 5);
  const brokenDB = new Proxy(env.DB, { get() { throw new Error('Do not leak OpenAI secrets or birth date'); } });
  const response = await call('profile?locale=en', 'paid', undefined, undefined, { ...env, DB: brokenDB });
  const text = await response.clone().text();
  await body(response, 500);
  assert.doesNotMatch(text, /secret|OpenAI|birth date/);
});

test('Member deletion affects only own Maya profiles/reports, never orders or other systems', async () => {
  const orderCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>();
  await body(await call('profile?locale=en', 'paid', undefined, 'DELETE'));
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM maya_reports WHERE user_id = 'maya-test-paid'").first<{ count: number }>())?.count, 0);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>())?.count, orderCount?.count);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM maya_kin_profiles WHERE user_id = 'maya-test-free'").first<{ count: number }>())?.count, 1);
});
