import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { routePremiumReports, type PremiumError } from '../src/mayaPremiumLive';
import { MAYA_PRO_PRODUCT, validateMayaProReport } from '../../app/src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, validateRelationshipReport } from '../../app/src/lib/mayaRelationship';
import { mayaForDate, MAYA_CALCULATION_VERSION } from '../../app/src/lib/maya';
import type { Env } from '../src/utils';

async function main() {
// Explicit opt-in: real provider, isolated local D1 and synthetic orders only.
assert.equal(process.env.MAYA_RUN_REAL_PROVIDER_CHECK, 'true', 'Real provider check requires explicit opt-in');
const nativeFetch = globalThis.fetch;
const health = await nativeFetch('http://127.0.0.1:5231/health').then(r => r.json()) as { preview: boolean; openaiConfigured: boolean; databaseBindings: number; calls: number };
assert.deepEqual([health.preview, health.openaiConfigured, health.databaseBindings], [true, true, 0]);
assert.ok(health.calls <= 80, 'Preview campaign has a finite request budget');
const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("isolated-live-test");}}',
  compatibilityDate: '2026-06-25', d1Databases: { DB: 'premium-provider-local-only' } });
const results: unknown[] = process.env.MAYA_PROVIDER_RESUME && process.env.MAYA_PROVIDER_ARTIFACT
  ? (JSON.parse(await readFile(process.env.MAYA_PROVIDER_ARTIFACT, 'utf8')) as { results: unknown[] }).results : [];
let calls = 0;
let lastResponse: unknown = null;
try {
  const { DB } = await mf.getBindings<{ DB: D1Database }>();
  const env: Env = { DB, DB_CARDS: DB, JWT_SECRET: 'unused-local-fixture', ENV: 'production',
    MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_AI_ENABLED: 'true',
    MAYA_AI_MODE: 'live', MAYA_PREMIUM_LIVE_ENABLED: 'true', OPENAI_API_KEY: 'preview-binding-not-a-key' };
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT NOT NULL)').run();
  await DB.prepare("INSERT INTO profiles VALUES('test-owner','synthetic@example.test')").run();
  for (const file of ['004-orders.sql', '025_maya_dreamspell.sql', '030_maya_premium_live_reports.sql']) {
    const sql = await readFile(new URL(`../../d1/migrations/${file}`, import.meta.url), 'utf8');
    await DB.batch(sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean).map(s => DB.prepare(s)));
  }
  for (const [role, date] of [['personal', '1987-07-26'], ['relationship', '1990-01-01']]) {
    const sig = mayaForDate(date, 'en');
    await DB.prepare(`INSERT INTO maya_kin_profiles(id,user_id,role,birth_date,kin_number,solar_seal,galactic_tone,wavespell,castle,calculation_version)
      VALUES(?,'test-owner',?,?,?,?,?,?,?,?)`).bind(role, role, date, sig.kin_number, sig.solar_seal_number,
        sig.tone_number, sig.wavespell, sig.castle, MAYA_CALCULATION_VERSION).run();
  }
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/chat/completions');
    calls++;
    const response = await nativeFetch('http://127.0.0.1:5231/', { method: 'POST', headers: { Origin: 'http://127.0.0.1:5231', 'Content-Type': 'application/json' },
      body: init?.body, signal: init?.signal });
    if (response.ok) lastResponse = await response.clone().json();
    return response;
  };
  for (const kind of ['pro', 'relationship'] as const) {
    const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
    const orderId = `${kind}-synthetic-order`;
    await DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status)
      VALUES(?,?,'test-owner','synthetic@example.test','maya_mock',?,'Local provider test',?,'paid')`).bind(orderId, orderId, product.code, product.price).run();
    for (const locale of ['en', 'zh-TW'] as const) {
      if (results.some(r => { const saved = r as { kind: string; locale: string }; return saved.kind === kind && saved.locale === locale; })) continue;
      const base = `/api/maya/${kind}/reports`;
      const access = async (id: string) => {
        assert.equal(id, `${kind}-synthetic-access`);
        return { id, order_id: orderId, source: 'verified_payment' };
      };
      const req = (path: string, body?: unknown) => new Request(`https://local.example.test${path}?locale=${locale}`, {
        method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const response = await routePremiumReports(req(base, { product_code: product.code, locale, profile_id: 'personal',
        entitlement_id: `${kind}-synthetic-access`, ...(kind === 'relationship' ? { relationship_profile_id: 'relationship', relationship_type: 'friends', consent: true } : {}) }),
      env, 'test-owner', product.code, locale, access);
      let result = await response.json() as { id: string; status: string; report: unknown; completedSections: number; totalSections: number };
      for (let i = 0; i < (kind === 'pro' ? 45 : 36) && result.status === 'processing'; i++) {
        result = await (await routePremiumReports(req(`${base}/${result.id}/advance`, {}), env, 'test-owner', product.code, locale, access)).json() as typeof result;
        console.log(`${kind} ${locale}: ${result.completedSections}/${result.totalSections} ${result.status}`);
      }
      assert.equal(result.status, 'completed');
      assert.ok(kind === 'pro' ? validateMayaProReport(result.report, 34, locale) : validateRelationshipReport(result.report));
      const before = calls;
      await routePremiumReports(req(`${base}/${result.id}`), env, 'test-owner', product.code, locale, access);
      assert.equal(calls, before);
      const totals = await DB.prepare('SELECT SUM(input_tokens) AS input,SUM(output_tokens) AS output,SUM(actual_cost_twd) AS cost FROM maya_premium_ai_sections WHERE report_id=?')
        .bind(result.id).first();
      results.push({ kind, locale, status: 'PASS', totals, report: result.report });
      if (process.env.MAYA_PROVIDER_ARTIFACT) await writeFile(process.env.MAYA_PROVIDER_ARTIFACT, JSON.stringify({ calls, results, lastResponse }, null, 2));
    }
  }
  console.log(JSON.stringify({ status: 'PASS', actualOpenAiCalls: calls, actualPayments: 0,
    results: results.map(r => { const { report: _report, ...summary } = r as Record<string, unknown>; return summary; }) }));
} catch (cause) {
  const error = cause as PremiumError;
  console.error(JSON.stringify({ status: 'FAIL', code: error.code ?? error.message, actualOpenAiCalls: calls, actualPayments: 0 }));
  process.exitCode = 1;
} finally {
  globalThis.fetch = nativeFetch;
  if (process.env.MAYA_PROVIDER_ARTIFACT) await writeFile(process.env.MAYA_PROVIDER_ARTIFACT, JSON.stringify({ calls, results, lastResponse }, null, 2));
  await mf.dispose();
}
}
main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Provider check failed'); process.exitCode = 1; });
