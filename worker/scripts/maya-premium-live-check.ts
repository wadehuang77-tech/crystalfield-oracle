import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import { routeMayaApi } from '../src/maya';
import { mockMayaProReport } from '../src/mayaProPrompt';
import { PREMIUM_LIMITS, premiumRevisionFeedback, premiumPrompt } from '../src/mayaPremiumLive';
import { mayaForDate, MAYA_CALCULATION_VERSION } from '../../app/src/lib/maya';
import { validateMayaProReport, MAYA_PRO_PRODUCT, type MayaProReport } from '../../app/src/lib/mayaPro';
import { validateRelationshipReport, MAYA_RELATIONSHIP_PRODUCT, type RelationshipReport } from '../../app/src/lib/mayaRelationship';
import type { Env } from '../src/utils';
import { relationshipTestFixture } from '../../app/src/lib/mayaRelationshipFixture';

let mf: Miniflare, env: Env;
const tokens = new Map<string, string>();
const originalFetch = globalThis.fetch;
let calls = 0;
let responseContent: unknown;
let failProvider = false;
async function sql(path: string) {
  const content = await readFile(new URL(path, import.meta.url), 'utf8');
  await env.DB.batch(content.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean).map(s => env.DB.prepare(s)));
}
before(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("isolated");}}',
    compatibilityDate: '2026-06-25', d1Databases: { DB: 'premium-live-isolated' } });
  const { DB } = await mf.getBindings<{ DB: D1Database }>();
  env = { DB, DB_CARDS: DB, ENV: 'production', JWT_SECRET: 'local-test-not-secret', ALLOWED_ORIGINS: 'https://local.example.test,https://www.crystalfield101.com',
    MAYA_PUBLIC_ENABLED: 'true', MAYA_MEMBER_ENABLED: 'true', MAYA_PAYMENT_ENABLED: 'true', MAYA_AI_ENABLED: 'true',
    MAYA_AI_MODE: 'live', OPENAI_API_KEY: 'offline-placeholder', MAYA_PRO_PAYMENT_ENABLED: 'true',
    MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED: 'true', MAYA_PREMIUM_LIVE_ENABLED: 'true',
    ECPAY_ENV: 'production', ECPAY_MERCHANT_ID: '9999999', ECPAY_HASH_KEY: 'offline-key', ECPAY_HASH_IV: 'offline-iv',
    MAYA_PAYMENT_API_ORIGIN: 'https://api.crystalfield101.com', MAYA_PAYMENT_FRONTEND_ORIGIN: 'https://www.crystalfield101.com' };
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,token_generation INTEGER DEFAULT 0)').run();
  await sql('../../d1/migrations/004-orders.sql');
  await sql('../../d1/migrations/025_maya_dreamspell.sql');
  await sql('../../d1/migrations/027_maya_production_payment_ai.sql');
  await sql('../../d1/migrations/029_maya_relationship_v2_payment.sql');
  await sql('../../d1/migrations/030_maya_premium_live_reports.sql');
  await sql('../../d1/migrations/031_maya_pro_payment.sql');
  for (const user of ['owner', 'other']) {
    await DB.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(user, `${user}@example.test`).run();
    tokens.set(user, await signJwt({ sub: user, email: `${user}@example.test` }, env.JWT_SECRET));
  }
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/chat/completions');
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, 'gpt-4o-mini');
    assert.equal(request.max_completion_tokens, PREMIUM_LIMITS.outputTokens);
    assert.ok(!JSON.stringify(request.messages).includes('1987-07-26'));
    assert.ok(!JSON.stringify(request.messages).includes('@example'));
    calls++;
    if (failProvider) return new Response(null, { status: 503 });
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(responseContent) } }],
      usage: { prompt_tokens: 1000, completion_tokens: 1000 } });
  };
});
after(async () => { globalThis.fetch = originalFetch; await mf?.dispose(); });
async function call(kind: string, path: string, locale = 'en', body?: unknown, user = 'owner', target = env) {
  return routeMayaApi(new Request(`https://local.example.test/api/maya/${kind}/${path}?locale=${locale}`, {
    method: body ? 'POST' : 'GET', headers: { Origin: 'https://local.example.test', 'Content-Type': 'application/json',
      ...(user ? { Cookie: `bolt_session=${tokens.get(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
  }), target);
}
async function check<T>(response: Response, status = 200): Promise<T> {
  assert.equal(response.status, status, await response.clone().text());
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  return response.json() as Promise<T>;
}
async function fixture(key: string, kind: 'pro' | 'relationship', date = '1987-07-26') {
  const code = kind === 'pro' ? MAYA_PRO_PRODUCT.code : MAYA_RELATIONSHIP_PRODUCT.code;
  const amount = kind === 'pro' ? 699 : 899;
  const table = kind === 'pro' ? 'maya_pro' : 'maya_relationship';
  for (const [role, birthDate] of [['personal', date], ['relationship', '1990-01-01']]) {
    const s = mayaForDate(birthDate, 'en');
    await env.DB.prepare(`INSERT OR IGNORE INTO maya_kin_profiles(id,user_id,role,birth_date,kin_number,solar_seal,galactic_tone,wavespell,castle,calculation_version)
      VALUES(?,'owner',?,?,?,?,?,?,?,?)`).bind(`profile-${role}`, role, birthDate, s.kin_number, s.solar_seal_number, s.tone_number, s.wavespell, s.castle, MAYA_CALCULATION_VERSION).run();
  }
  await env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,paid_at,ecpay_trade_no)
    VALUES(?,?,'owner','owner@example.test','maya',?,'Offline fixture',?,'paid',datetime('now'),?)`)
    .bind(`${key}-order`, key, code, amount, key).run();
  await env.DB.prepare(`INSERT INTO ${table}_payment_orders(order_id,user_id,product_code,merchant_id,locale,checkout_key,trade_no,payment_state)
    VALUES(?,'owner',?,'offline-merchant','en',?,?,'paid')`).bind(`${key}-order`, code, key, key).run();
  await env.DB.prepare(`INSERT INTO ${table}_entitlements(id,user_id,product_code,order_id,status,source,starts_at)
    VALUES(?,'owner',?,?,'active','verified_payment','2020-01-01')`).bind(`${key}-access`, code, `${key}-order`).run();
  return { profile_id: 'profile-personal', entitlement_id: `${key}-access`, product_code: code, locale: 'en',
    ...(kind === 'relationship' ? { relationship_profile_id: 'profile-relationship', relationship_type: 'friends', consent: true } : {}) };
}
type Result = { id: string; status: string; report: MayaProReport | RelationshipReport | null; reason: string; completedSections: number };
function textForPro(report: MayaProReport, index: number) {
  if (index < 12) {
    const { interpretation, lifeExamples, reflectionQuestions, actionSteps } = report.parts.a.blueprint.sections[index];
    return { interpretation, lifeExamples, reflectionQuestions, actionSteps,
      ...(index === 11 ? { ninetyDayPlan: report.parts.a.blueprint.ninetyDayPlan } : {}) };
  }
  const { interpretation, lifeExamples, reflectionQuestions, actionSteps } = report.parts.d.sections[index - 12];
  return { interpretation, lifeExamples, reflectionQuestions, actionSteps };
}
test('Pro: bilingual fifteen real-engine chapters persist, reads/cache do not call provider; ownership and revocation enforced', async () => {
  const input = await fixture('pro1', 'pro');
  for (const locale of ['en', 'zh-TW'] as const) {
    const mock = mockMayaProReport('1987-07-26', locale);
    const created = await check<Result>(await call('pro', 'reports', locale, { ...input, locale }));
    const duplicate = await check<Result>(await call('pro', 'reports', locale, { ...input, locale }));
    assert.equal(created.id, duplicate.id);
    const start = calls;
    let result = created;
    for (let i = 0; i < 15; i++) {
      responseContent = textForPro(mock, i);
      result = await check<Result>(await call('pro', `reports/${created.id}/advance`, locale, {}));
    }
    assert.equal(calls - start, 15);
    assert.equal(result.status, 'completed');
    assert.ok(result.report && 'kinNumber' in result.report && validateMayaProReport(result.report, 34, locale));
    assert.equal(result.report?.provider, 'openai');
    const before = calls;
    await check(await call('pro', `reports/${created.id}`, locale));
    await check(await call('pro', 'reports', locale, { ...input, locale }));
    await check(await call('pro', `reports/${created.id}/advance`, locale, {}));
    assert.equal(calls, before);
    await check(await call('pro', `reports/${created.id}`, locale, undefined, 'other'), 404);
    await check(await call('pro', `reports/${created.id}`, locale, undefined, ''), 401);
    await env.DB.prepare("UPDATE maya_pro_entitlements SET status='revoked' WHERE id='pro1-access'").run();
    await check(await call('pro', `reports/${created.id}`, locale), 403);
    await env.DB.prepare("UPDATE maya_pro_entitlements SET status='active' WHERE id='pro1-access'").run();
  }
  const budget = await env.DB.prepare("SELECT reserved_twd FROM maya_premium_ai_budgets WHERE order_id='pro1-order'").first<{ reserved_twd: number }>();
  assert.ok(budget && Math.abs(budget.reserved_twd - 30 * 0.02625) < 0.00001);
  assert.deepEqual((await env.DB.prepare('PRAGMA foreign_key_check').all()).results, []);
});
test('Provider errors block without automatic retries; concurrent advance makes one provider call; disabled gates reject', async () => {
  const input = await fixture('failure', 'pro');
  const created = await check<Result>(await call('pro', 'reports', 'en', input));
  failProvider = true;
  const before = calls;
  await check(await call('pro', `reports/${created.id}/advance`, 'en', {}), 502);
  const blocked = await check<Result>(await call('pro', `reports/${created.id}/advance`, 'en', {}));
  assert.equal(blocked.status, 'blocked');
  assert.equal(calls, before + 1);
  failProvider = false;
  const concurrent = await fixture('concurrent', 'pro');
  const job = await check<Result>(await call('pro', 'reports', 'en', concurrent));
  responseContent = textForPro(mockMayaProReport('1987-07-26', 'en'), 0);
  const priorCalls = calls;
  const results = await Promise.all([call('pro', `reports/${job.id}/advance`, 'en', {}), call('pro', `reports/${job.id}/advance`, 'en', {})]);
  assert.equal(calls - priorCalls, 1);
  assert.ok(results.some(r => r.status === 200));
  assert.ok(results.some(r => r.status === 409));
  await check(await call('pro', 'reports', 'en', concurrent, 'owner', { ...env, MAYA_PREMIUM_LIVE_ENABLED: 'false' }), 503);
});
test('Relationship: twelve chapters with three distinct viewpoints and ninety-day plan; no cross-product rights', async () => {
  const input = await fixture('pair', 'relationship');
  await check(await call('relationship', 'reports', 'en', { ...input, entitlement_id: 'pro1-access' }), 403);
  await check(await call('relationship', 'reports', 'en', { ...input, profile_id: 'missing' }), 404);
  const created = await check<Result>(await call('relationship', 'reports', 'en', input));
  const a = mayaForDate('1987-07-26', 'en'), b = mayaForDate('1990-01-01', 'en');
  let result = created;
  for (let i = 0; i < 12; i++) {
    responseContent = {
      interpretation: `Chapter ${i + 1} considers ${a.solar_seal} and ${a.galactic_tone} alongside ${b.solar_seal} and ${b.galactic_tone}. These symbols invite a freely chosen conversation rather than a fixed verdict. Consider whether the specific theme helps you articulate a need without assigning responsibility to the other person. Try a small agreement, notice the response and revise it together. Both people can pause the discussion, seek independent support or decline a proposed exercise. This is an invitation to compare observed choices with symbolic ideas, not a claim about your actual history.`,
      perspectives: { a: `A can name one personal priority in chapter ${i + 1} and invite feedback without demanding agreement.`,
        b: `B can identify an independent concern in chapter ${i + 1}, request clarification and retain personal boundaries.`,
        shared: `Together, choose a reversible practice for chapter ${i + 1} and review whether it respects both people's agency.` },
      lifeExamples: [`For topic ${i + 1}, a hypothetical disagreement can become a clear request instead of a label.`],
      reflectionQuestions: [`Which choice in topic ${i + 1} is genuinely voluntary for both people?`],
      actionSteps: [`Agree on one observable step for topic ${i + 1} and check feedback after a week.`],
      ...(i === 11 ? { ninetyDayPlan: ['awareness', 'action-adjustment', 'integration'].map((id, j) => ({
        id, startDay: j * 30 + 1, endDay: (j + 1) * 30,
        actionSteps: ['Write a need.', 'Ask for consent.', 'Review an agreement.'],
        reflectionQuestions: ['What helped?', 'What changed?', 'What needs adjustment?'],
      })) } : {}),
    };
    result = await check<Result>(await call('relationship', `reports/${created.id}/advance`, 'en', {}));
  }
  assert.equal(result.status, 'completed');
  assert.ok(validateRelationshipReport(result.report));
  const saved = result.report as RelationshipReport;
  assert.equal(saved.sections.length, 12);
  assert.equal(saved.relationshipType, 'friends');
  assert.equal(saved.people.a.kinNumber, a.kin_number);
  assert.equal(saved.people.b.kinNumber, b.kin_number);
  const before = calls;
  await check(await call('relationship', `reports/${created.id}`));
  assert.equal(calls, before);
  await check(await call('relationship', `reports/${created.id}`, 'en', undefined, 'other'), 404);
  await env.DB.prepare("UPDATE maya_relationship_payment_orders SET payment_state='refunded' WHERE order_id='pair-order'").run();
  await check(await call('relationship', `reports/${created.id}`), 403);
});

test('Six distinct birth pairs validate both languages with twelve fixed IDs, canonical evidence and rejected mutations', () => {
  for (const [a, b] of [['1987-07-26', '1990-01-01'], ['2000-01-01', '2001-02-03'], ['1975-08-15', '1980-04-06'],
    ['1999-12-31', '2004-07-26'], ['2020-02-28', '2020-03-01'], ['1960-06-18', '2010-10-10']]) {
    for (const locale of ['en', 'zh-TW'] as const) {
      const pair = relationshipTestFixture(a, b, locale);
      assert.ok(validateRelationshipReport(pair));
      assert.equal(pair.people.a.kinNumber, mayaForDate(a, locale).kin_number);
      const mutated = structuredClone(pair);
      mutated.people.a.oracle.positions.guide.kinNumber = 0;
      assert.ok(!validateRelationshipReport(mutated));
      const duplicate = structuredClone(pair);
      duplicate.sections[1].interpretation = duplicate.sections[0].interpretation;
      assert.ok(!validateRelationshipReport(duplicate));
      const pro = mockMayaProReport(a, locale);
      pro.provider = 'openai';
      assert.ok(validateMayaProReport(pro, mayaForDate(a, locale).kin_number, locale));
    }
  }
});
test('Quality revisions use measured reader text, exclude JSON metadata and require substantive missing characters', () => {
  const draft = { interpretation: '文'.repeat(200), perspectives: { a: '甲'.repeat(30), b: '乙'.repeat(30), shared: '丙'.repeat(30) },
    lifeExamples: ['例'.repeat(20)], reflectionQuestions: ['問'.repeat(10)], actionSteps: ['行'.repeat(20)] };
  const feedback = premiumRevisionFeedback(draft, 'zh-TW');
  assert.match(feedback, /只有340個漢字/);
  assert.match(feedback, /另外增加100至130個漢字/);
  assert.match(feedback, /硬性範圍350至500/);
  assert.match(premiumRevisionFeedback({ ...draft, interpretation: '文'.repeat(370) }, 'zh-TW'), /超過500字上限/);
  assert.match(premiumRevisionFeedback({ interpretation: 'one two', ninetyDayPlan: [
    { id: 'awareness', startDay: 1, actionSteps: ['three'], reflectionQuestions: ['four'] },
  ] }, 'en'), /4 English words/);
  assert.match(premiumRevisionFeedback(null, 'zh-TW'), /只有0個漢字/);
  const pairFeedback = premiumRevisionFeedback(draft, 'zh-TW', true);
  assert.match(pairFeedback, /沒有總字數下限/);
  assert.doesNotMatch(pairFeedback, /距350字硬性下限|另外增加/);
  for (const index of [7, 11]) {
    const prompt = premiumPrompt(MAYA_RELATIONSHIP_PRODUCT.code,
      { a: '1987-07-26', b: '1990-01-01', relationshipType: 'friends' }, 'zh-TW', index, []);
    assert.match(prompt.system, /沒有總字數下限/);
    assert.doesNotMatch(prompt.system, /必須至少350字|切勿縮成300字/);
  }
});
function shortenChineseChapter(report: RelationshipReport, index: number, target: number) {
  const section = report.sections[index];
  const text = [section.interpretation, ...Object.values(section.perspectives), ...section.lifeExamples,
    ...section.reflectionQuestions, ...section.actionSteps].join('');
  const remove = (text.match(/[\u3400-\u9fff]/gu)?.length ?? 0) - target;
  const original = section.interpretation.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  assert.ok(remove >= 0 && original - remove >= 60);
  let seen = 0;
  section.interpretation = section.interpretation.replace(/[\u3400-\u9fff]/gu, character => ++seen <= original - remove ? character : '');
  const shortened = [section.interpretation, ...Object.values(section.perspectives), ...section.lifeExamples,
    ...section.reflectionQuestions, ...section.actionSteps].join('');
  assert.equal(shortened.match(/[\u3400-\u9fff]/gu)?.length, target);
}
test('Chinese relationship has no total character minimum; upper bound, structure and other products remain enforced', () => {
  for (const target of [349, 300]) {
    const report = relationshipTestFixture('1987-07-26', '1990-01-01', 'zh-TW');
    shortenChineseChapter(report, 7, target);
    assert.ok(validateRelationshipReport(report), `${target} characters must be accepted`);
    const emptyPerspective = structuredClone(report);
    emptyPerspective.sections[7].perspectives.b = '';
    assert.ok(!validateRelationshipReport(emptyPerspective));
    const excessive = structuredClone(report);
    excessive.sections[7].interpretation += '文'.repeat(501);
    assert.ok(!validateRelationshipReport(excessive));
  }
  const english = relationshipTestFixture('1987-07-26', '1990-01-01', 'en');
  english.sections[7] = { ...english.sections[7], interpretation: 'Short', perspectives: { a: 'A', b: 'B', shared: 'Shared' },
    lifeExamples: ['Example'], reflectionQuestions: ['Question?'], actionSteps: ['Act'] };
  assert.ok(!validateRelationshipReport(english));
  const pro = mockMayaProReport('1987-07-26', 'zh-TW');
  pro.parts.a.blueprint.sections[7].interpretation = pro.parts.a.blueprint.sections[7].interpretation.slice(0, 65);
  assert.ok(!validateMayaProReport(pro, 34, 'zh-TW'));
});
test('Chinese relationship chapters share live storage; hard budgets and three-attempt quality limits are enforced', async () => {
  const input = { ...await fixture('pairzh', 'relationship'), locale: 'zh-TW' };
  const fixtureReport = relationshipTestFixture('1987-07-26', '1990-01-01', 'zh-TW');
  shortenChineseChapter(fixtureReport, 7, 349);
  const created = await check<Result>(await call('relationship', 'reports', 'zh-TW', input));
  let result = created;
  for (let i = 0; i < 12; i++) {
    const { interpretation, perspectives, lifeExamples, reflectionQuestions, actionSteps } = fixtureReport.sections[i];
    responseContent = { interpretation, perspectives, lifeExamples, reflectionQuestions, actionSteps,
      ...(i === 11 ? { ninetyDayPlan: fixtureReport.ninetyDayPlan } : {}) };
    result = await check<Result>(await call('relationship', `reports/${created.id}/advance`, 'zh-TW', {}));
  }
  assert.equal(result.status, 'completed');
  assert.ok(validateRelationshipReport(result.report));
  const budgetInput = await fixture('budget', 'pro');
  const job = await check<Result>(await call('pro', 'reports', 'en', budgetInput));
  await env.DB.prepare("INSERT INTO maya_premium_ai_budgets(order_id,reserved_twd) VALUES('budget-order',4)").run();
  const before = calls;
  await check(await call('pro', `reports/${job.id}/advance`, 'en', {}), 409);
  assert.equal(calls, before);
  const schemaInput = await fixture('schema', 'pro');
  const invalidJob = await check<Result>(await call('pro', 'reports', 'en', schemaInput));
  responseContent = { interpretation: 'invalid' };
  await check(await call('pro', `reports/${invalidJob.id}/advance`, 'en', {}));
  await check(await call('pro', `reports/${invalidJob.id}/advance`, 'en', {}));
  await check(await call('pro', `reports/${invalidJob.id}/advance`, 'en', {}), 409);
  await check(await call('pro', `reports/${invalidJob.id}/advance`, 'en', {}));
  assert.equal(calls, before + 3);
});

test('Verified named admin generates both premium products without payment; spoofed email and revoked identity fail closed', async () => {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY)').run();
  await env.DB.prepare("INSERT INTO profiles(id,email) VALUES('premium-admin','wadehuang77@gmail.com')").run();
  tokens.set('premium-admin', await signJwt({ sub: 'premium-admin', email: 'wadehuang77@gmail.com' }, env.JWT_SECRET));
  tokens.set('spoofed-admin', await signJwt({ sub: 'other', email: 'wadehuang77@gmail.com' }, env.JWT_SECRET));
  for (const [role, date] of [['personal', '1987-07-26'], ['relationship', '1990-01-01']]) {
    const s = mayaForDate(date, 'en');
    await env.DB.prepare(`INSERT INTO maya_kin_profiles(id,user_id,role,birth_date,kin_number,solar_seal,galactic_tone,wavespell,castle,calculation_version)
      VALUES(?,'premium-admin',?,?,?,?,?,?,?,?)`).bind(`admin-${role}`, role, date, s.kin_number, s.solar_seal_number,
        s.tone_number, s.wavespell, s.castle, MAYA_CALCULATION_VERSION).run();
  }
  const target = { ...env, MAYA_ADMIN_LIVE_ENABLED: 'true' };
  const paidBefore = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE item_type='maya'").first();
  const pro = mockMayaProReport('1987-07-26', 'en');
  const pair = relationshipTestFixture('1987-07-26', '1990-01-01', 'en');
  for (const kind of ['pro', 'relationship'] as const) {
    const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
    const beforeOrders = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id='premium-admin'").first();
    const list = await check<{ entitlements: Array<{ id: string; source: string }> }>(await call(kind, 'entitlements', 'en', undefined, 'premium-admin', target));
    const grant = list.entitlements[0];
    assert.equal(grant.source, 'admin_complimentary');
    assert.deepEqual(await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id='premium-admin'").first(), beforeOrders, 'GET must not create complimentary orders');
    const spoofed = await check<{ entitlements: Array<{ source?: string }> }>(await call(kind, 'entitlements', 'en', undefined, 'spoofed-admin', target));
    assert.ok(!spoofed.entitlements.some(e => e.source === 'admin_complimentary'));
    const input = { profile_id: 'admin-personal', entitlement_id: grant.id, product_code: product.code, locale: 'en',
      ...(kind === 'relationship' ? { relationship_profile_id: 'admin-relationship', relationship_type: 'friends', consent: true } : {}) };
    await check(await call(kind, 'reports', 'en', input, 'other', target), 403);
    await check(await call(kind, 'reports', 'en', input, 'premium-admin', { ...target, MAYA_ADMIN_LIVE_ENABLED: 'false' }), 403);
    const created = await check<Result>(await call(kind, 'reports', 'en', input, 'premium-admin', target));
    const order = await env.DB.prepare('SELECT amount,status,item_type,item_id,ecpay_trade_no FROM orders WHERE id=?').bind(grant.id).first();
    assert.deepEqual(order, { amount: 0, status: 'complimentary', item_type: 'maya_admin', item_id: product.code, ecpay_trade_no: null });
    let result = created;
    for (let i = 0; i < (kind === 'pro' ? 15 : 12); i++) {
      if (kind === 'pro') responseContent = textForPro(pro, i);
      else {
        const { interpretation, perspectives, lifeExamples, reflectionQuestions, actionSteps } = pair.sections[i];
        responseContent = { interpretation, perspectives, lifeExamples, reflectionQuestions, actionSteps,
          ...(i === 11 ? { ninetyDayPlan: pair.ninetyDayPlan } : {}) };
      }
      result = await check<Result>(await call(kind, `reports/${created.id}/advance`, 'en', {}, 'premium-admin', target));
    }
    assert.equal(result.status, 'completed');
    const before = calls;
    await check(await call(kind, `reports/${created.id}`, 'en', undefined, 'premium-admin', target));
    await check(await call(kind, 'reports', 'en', input, 'premium-admin', target));
    assert.equal(calls, before, 'Saved complimentary reports do not regenerate');
    await check(await call(kind, `reports/${created.id}`, 'en', undefined, 'other', target), 404);
    await env.DB.prepare("UPDATE profiles SET email='revoked@example.test' WHERE id='premium-admin'").run();
    await check(await call(kind, `reports/${created.id}`, 'en', undefined, 'premium-admin', target), 403);
    await env.DB.prepare("UPDATE profiles SET email='wadehuang77@gmail.com' WHERE id='premium-admin'").run();
    const budget = await env.DB.prepare('SELECT reserved_twd FROM maya_premium_ai_budgets WHERE order_id=?').bind(grant.id).first<{ reserved_twd: number }>();
    assert.ok(budget && budget.reserved_twd > 0 && budget.reserved_twd <= PREMIUM_LIMITS.orderCapTwd);
  }
  assert.deepEqual(await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE item_type='maya'").first(), paidBefore);
  const paymentRecords = await env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM maya_pro_payment_orders WHERE user_id='premium-admin') +
    (SELECT COUNT(*) FROM maya_relationship_payment_orders WHERE user_id='premium-admin') AS n`).first();
  assert.deepEqual(paymentRecords, { n: 0 });
});
