import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { pathToFileURL } from 'node:url';
import type { WorkflowStep } from 'cloudflare:workers';
import { VedicReportStore, readReportSlot, isJob, jobId, summarize } from '../src/vedicReportStore';
import { startVedicReport, handleVedicReportProgress, findVedicReportProgress } from '../src/vedicReportJobs';
import { runVedicReportWorkflow } from '../src/vedicReportWorkflowRunner';
import { signJwt } from '../src/auth';
import {
  ensureVedicSchema, reportHeadings, publicChartData, generateVedicSectionOnce,
  VedicSectionError, validateCompleteVedicReport, type VedicChartData,
} from '../src/vedicAstrology';
import type { Env } from '../src/utils';

export const chart: VedicChartData = {
  provider: 'prokerala', ayanamsa: 'lahiri',
  birth: { date: '1968-09-06', time: '20:00', location: 'Taipei', latitude: 25.033, longitude: 121.5654, timezone: 'Asia/Taipei', utcOffset: '+08:00' },
  lagna: 'Pisces', lagnaLongitude: 359.76, sunSign: 'Leo', moonSign: 'Aquarius',
  moonNakshatra: 'Shatabhisha', nakshatra: { name: 'Shatabhisha', pada: 3 },
  planets: { Sun: 'Leo', Moon: 'Aquarius', Mercury: 'Virgo', Venus: 'Virgo', Mars: 'Cancer', Jupiter: 'Leo', Saturn: 'Aries', Rahu: 'Pisces', Ketu: 'Virgo' },
  planetLongitudes: {}, houses: {},
  divisionalCharts: {
    d9: { lagna: 'Pisces', planets: { Venus: 'Virgo' }, houses: {} },
    d10: { lagna: 'Leo', planets: { Sun: 'Leo' }, houses: {} },
  },
  mahaDasha: 'Mercury', antarDasha: 'Saturn',
  dashaTimeline: [{
    lord: 'Mercury', start: '2020-01-01T00:00:00Z', end: '2040-01-01T00:00:00Z',
    subPeriods: [{ lord: 'Saturn', start: '2020-01-01T00:00:00Z', end: '2040-01-01T00:00:00Z' }],
  }],
  housePlacements: { Sun: 6, Moon: 12, Mercury: 7, Venus: 7, Mars: 5, Jupiter: 6, Saturn: 2, Rahu: 1, Ketu: 7 },
  houseLords: { '1': 'Jupiter', '2': 'Mars', '5': 'Moon', '6': 'Sun', '7': 'Mercury', '9': 'Mars', '10': 'Jupiter', '11': 'Saturn', '12': 'Saturn' },
  karmaAspects: [], timezone: 'Asia/Taipei', timezoneOffset: '+08:00',
};

function prose(seed: number, count = 460): string {
  let text = '';
  for (let i = 0; i < count; i++) {
    seed = (seed * 16807) % 2147483647;
    text += String.fromCharCode(0x4e00 + seed % 15000);
  }
  return text;
}

async function main() {
  const mf = new Miniflare({ modules: true, script: "export default { fetch(){return new Response('ok')} }",
    compatibilityDate: '2026-04-24', d1Databases: { DB: 'vedic-progress-tests' } });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    assert.doesNotMatch(String(input), /api\.openai\.com|prokerala|vedastro/, 'Unexpected upstream call before the synthetic transport is installed');
    return originalFetch(input, init);
  };
  try {
    const db = await mf.getD1Database('DB');
    const instances = new Map<string, unknown>();
    let creates = 0;
    const env: Env = {
      DB: db, DB_CARDS: db, JWT_SECRET: 'test-only-key', OPENAI_API_KEY: 'test-only-openai',
      VEDIC_REPORT_WORKFLOW: {
        createBatch: async options => {
          for (const option of options) {
            if (!instances.has(option.id!)) { creates++; instances.set(option.id!, option.params); }
          }
          return [];
        },
      } as Env['VEDIC_REPORT_WORKFLOW'],
    };
    await ensureVedicSchema(env);
    await db.exec("CREATE TABLE profiles(id TEXT PRIMARY KEY, token_generation INTEGER); CREATE TABLE admins(id TEXT PRIMARY KEY); CREATE TABLE orders(id TEXT PRIMARY KEY,user_id TEXT,item_id TEXT,item_name TEXT,status TEXT,picks_payload TEXT);");
    await db.prepare('INSERT INTO profiles VALUES (?,0), (?,0)').bind('owner', 'stranger').run();
    const chartId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    await db.prepare('INSERT INTO vedic_charts VALUES (?,?,?,?,?,?)')
      .bind(chartId, 'owner', JSON.stringify(chart), '{}', new Date().toISOString(), '2100-01-01').run();
    await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','pending',?)")
      .bind(orderId, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
    const ownerToken = await signJwt({ sub: 'owner', email: 'owner@example.test' }, env.JWT_SECRET, 3600);
    const otherToken = await signJwt({ sub: 'stranger', email: 'stranger@example.test' }, env.JWT_SECRET, 3600);
    const req = (token = ownerToken, method = 'GET', body?: unknown, path = '/status') => new Request(`https://api.example.test${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const store = new VedicReportStore(db);
    assert.equal((await startVedicReport(req(), env, chartId, orderId, 'zh-Hant')).status, 403);
    assert.equal(creates, 0, 'Unpaid chart never starts a Workflow');
    await db.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(orderId).run();
    const responses = await Promise.all(Array.from({ length: 3 }, () => startVedicReport(req(), env, chartId, orderId, 'zh-Hant')));
    assert.ok(responses.every(r => r.status === 202));
    assert.equal(creates, 1, 'Duplicate POST creates exactly one deterministic instance');
    const response = await responses[0].json() as { progressive: { reportId: string } };
    const id = response.progressive.reportId;
    assert.equal((await handleVedicReportProgress(new Request('https://api.example.test/status'), env, id)).status, 401);
    assert.equal((await handleVedicReportProgress(req(otherToken), env, id)).status, 403);
    assert.equal((await handleVedicReportProgress(req(), env, crypto.randomUUID())).status, 403);
    await store.initialize(chartId, orderId, 'en', reportHeadings('complete', 'en'), r => validateCompleteVedicReport(r, 'en'));
    const section = (index: number) => ({
      formatVersion: 10, title: 'test', introduction: 'test', closing: 'test',
      sections: [{ heading: reportHeadings('complete', 'zh-Hant')[index], consultation: prose(index + 100), evidence: [
        { factor: 'test', value: 'test', relevance: 'test' }, { factor: 'test2', value: 'test2', relevance: 'test2' },
      ] }],
    });
    for (const index of [0, 1, 2]) assert.ok(await store.claim(id, 'zh-Hant', index, jobId(id, 'zh-Hant')));
    // Out-of-order overlapping saves must retain all three sections and both languages.
    await store.save(id, 'zh-Hant', 1, jobId(id, 'zh-Hant'), { report: section(1), latencyMs: 3 });
    let partial = await (await handleVedicReportProgress(req(), env, id)).json() as { completedSections: number };
    assert.equal(partial.completedSections, 1, 'One section readable before sibling completion');
    assert.ok(await store.claim(id, 'en', 0, jobId(id, 'en')));
    await Promise.all([
      ...[2, 0].map(i => store.save(id, 'zh-Hant', i, jobId(id, 'zh-Hant'), { report: section(i), latencyMs: 4 })),
      store.save(id, 'en', 0, jobId(id, 'en'), { report: section(0), latencyMs: 5 }),
    ]);
    partial = await (await handleVedicReportProgress(req(), env, id)).json() as { completedSections: number };
    assert.equal(partial.completedSections, 3);
    const en = await (await handleVedicReportProgress(req(undefined, 'GET', undefined, '/status?language=en'), env, id)).json() as { completedSections: number };
    assert.equal(en.completedSections, 1, 'Locale writes do not overwrite each other');
    const lookup = await findVedicReportProgress(req(undefined, 'GET', undefined, `/status?order_id=${orderId}`), env);
    assert.equal((await lookup.json() as { completedSections: number }).completedSections, 3, 'Reload restores 3/9 without starting job');
    assert.equal(creates, 1);

    let aiCalls = 0;
    let active = 0;
    let maxActive = 0;
    let mode = 'ok';
    globalThis.fetch = async (input, init) => {
      // Miniflare's D1 bridge uses fetch too; forward only its local traffic.
      const url = String(input);
      if (!url.startsWith('https://api.openai.com/')) {
        assert.doesNotMatch(url, /prokerala|vedastro/);
        return originalFetch(input, init);
      }
      aiCalls++; active++; maxActive = Math.max(maxActive, active);
      try {
        await new Promise(resolve => setTimeout(resolve, 3));
        if (mode === 'permanent') return new Response('SECRET RAW ERROR', { status: 400 });
        if (mode === 'transient') return new Response('SECRET RAW ERROR', { status: 429, headers: { 'Retry-After': '0' } });
        if (mode === 'malformed') return Response.json({ output_text: 'null' });
        const body = JSON.parse(String(init?.body)) as { input: Array<{ content: string }> };
        const prompt = JSON.parse(body.input[1].content) as {
          sections: Array<{ heading: string }>;
          forecast_periods: Array<{ id: string }>;
        };
        const index = reportHeadings('complete', 'zh-Hant').indexOf(prompt.sections[0].heading);
        return Response.json({ output_text: JSON.stringify({
          title: 'test', introduction: 'test', closing: 'test',
          sections: [{ heading: prompt.sections[0].heading, consultation: prose(index + 500) }],
          forecastInterpretations: Object.fromEntries(prompt.forecast_periods.map(p => [p.id, { consultation: prose(600) }])),
        }) });
      } finally { active--; }
    };
    const checkpoints = new Map<string, unknown>();
    let fatalPersist = false;
    const cooldowns: number[] = [];
    const steps = {
      do: async (name: string, _config: unknown, fn: () => Promise<unknown>) => {
        if (fatalPersist && name === 'section-1-attempt-1-persist') throw new Error('SYNTHETIC DB FAILURE');
        if (checkpoints.has(name)) return checkpoints.get(name);
        const result = await fn(); checkpoints.set(name, result); return result;
      },
      sleep: async (_name: string, milliseconds: number) => { cooldowns.push(milliseconds); },
    } as Pick<WorkflowStep, 'do' | 'sleep'>;
    await runVedicReportWorkflow(env, { reportId: id, chartId, orderId, language: 'zh-Hant', jobId: jobId(id, 'zh-Hant') }, steps);
    assert.equal(aiCalls, 6, 'Existing three completed sections are not regenerated');
    assert.ok(maxActive <= 3);
    const finished = await (await handleVedicReportProgress(req(), env, id)).json() as { completedSections: number; reportStatus: string };
    assert.equal(finished.completedSections, 9);
    assert.equal(finished.reportStatus, 'completed');
    await startVedicReport(req(), env, chartId, orderId, 'zh-Hant');
    assert.equal(creates, 1);
    assert.equal(aiCalls, 6, 'Completed report reopening has zero AI calls');
    assert.equal((await handleVedicReportProgress(req(undefined, 'POST', { language: 'zh-Hant' }), env, id, 0)).status, 409);

    const allIndexes = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const order of allIndexes) {
      for (const concurrent of [true, false]) {
        const permutationOrder = crypto.randomUUID();
        await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
          .bind(permutationOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
        const target = await store.initialize(chartId, permutationOrder, 'zh-Hant', reportHeadings('complete', 'zh-Hant'),
          r => validateCompleteVedicReport(r, 'zh-Hant'));
        await Promise.all(order.map(i => store.claim(target.id, 'zh-Hant', i, jobId(target.id, 'zh-Hant'))));
        if (concurrent) {
          await Promise.all(order.map(i => store.save(target.id, 'zh-Hant', i, jobId(target.id, 'zh-Hant'), { report: section(i), latencyMs: 1 })));
        } else {
          for (const i of order) await store.save(target.id, 'zh-Hant', i, jobId(target.id, 'zh-Hant'), { report: section(i), latencyMs: 1 });
        }
        const saved = await store.read(target.id);
        const slot = saved && readReportSlot(saved, 'zh-Hant');
        assert.ok(isJob(slot));
        assert.ok(slot.sections.slice(0, 3).every(s => s.status === 'completed' && s.content));
      }
    }
    const completeOrder = crypto.randomUUID();
    await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
      .bind(completeOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
    const normal = await store.initialize(chartId, completeOrder, 'zh-Hant', reportHeadings('complete', 'zh-Hant'),
      r => validateCompleteVedicReport(r, 'zh-Hant'));
    const normalInput = { reportId: normal.id, chartId, orderId: completeOrder, language: 'zh-Hant' as const, jobId: jobId(normal.id, 'zh-Hant') };
    checkpoints.clear();
    const normalBefore = aiCalls;
    await runVedicReportWorkflow(env, normalInput, steps);
    assert.equal(aiCalls - normalBefore, 9, 'A fresh complete report makes nine AI calls, not one prompt or nine parallel calls');
    const normalRow = await store.read(normal.id);
    const normalState = normalRow && readReportSlot(normalRow, 'zh-Hant');
    assert.ok(isJob(normalState));
    assert.equal(normalState.reportStatus, 'completed', 'Nine validated sections pass the frozen aggregate validator');
    const noBinding: Env = { ...env, VEDIC_REPORT_WORKFLOW: undefined };
    assert.equal((await startVedicReport(req(), noBinding, chartId, completeOrder, 'zh-Hant')).status, 200,
      'An already completed report does not depend on creating a Workflow');
    const legacyOrder = crypto.randomUUID(), legacyId = crypto.randomUUID();
    await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
      .bind(legacyOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
    await db.prepare("INSERT INTO vedic_reports VALUES (?,?,?,'complete',?,?)")
      .bind(legacyId, chartId, legacyOrder, JSON.stringify(normalState.report), new Date().toISOString()).run();
    assert.equal((await startVedicReport(req(), noBinding, chartId, legacyOrder, 'zh-Hant')).status, 200,
      'Valid completed legacy report is retained without AI or a new Workflow');
    await runVedicReportWorkflow(env, normalInput, steps);
    assert.equal(aiCalls - normalBefore, 9, 'Durable checkpoint replay does not regenerate sections');

    const fatalOrder = crypto.randomUUID();
    await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
      .bind(fatalOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
    const fatalRow = await store.initialize(chartId, fatalOrder, 'zh-Hant', reportHeadings('complete', 'zh-Hant'),
      r => validateCompleteVedicReport(r, 'zh-Hant'));
    checkpoints.clear(); fatalPersist = true;
    await assert.rejects(runVedicReportWorkflow(env, {
      reportId: fatalRow.id, chartId, orderId: fatalOrder, language: 'zh-Hant', jobId: jobId(fatalRow.id, 'zh-Hant'),
    }, steps), /REPORT_WORKFLOW_FAILED/);
    fatalPersist = false;
    await store.failJob(fatalRow.id, 'zh-Hant', jobId(fatalRow.id, 'zh-Hant'), 'REPORT_WORKFLOW_FAILED');
    await store.finish(fatalRow.id, 'zh-Hant', r => validateCompleteVedicReport(r, 'zh-Hant'));
    const fatalSaved = await store.read(fatalRow.id);
    const fatalState = fatalSaved && readReportSlot(fatalSaved, 'zh-Hant');
    assert.ok(isJob(fatalState));
    assert.equal(fatalState.reportStatus, 'partial_failed');
    assert.equal(fatalState.sections.filter(s => s.status === 'completed').length, 8,
      'A fatal lane must settle successful siblings before terminal failure cleanup');

    for (const failure of ['permanent', 'transient']) {
      mode = failure; checkpoints.clear();
      const before = aiCalls;
      // Single-call helper itself must never retry or expose raw error bodies.
      await assert.rejects(generateVedicSectionOnce(env, chart, 0, 'zh-Hant'), (error: unknown) => {
        assert.ok(error instanceof VedicSectionError);
        assert.doesNotMatch(error.message, /SECRET|RAW|test-only/);
        assert.equal(error.retryable, failure === 'transient');
        return true;
      });
      assert.equal(aiCalls, before + 1);
      const failureOrder = crypto.randomUUID();
      await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
        .bind(failureOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
      const failedRow = await store.initialize(chartId, failureOrder, 'zh-Hant', reportHeadings('complete', 'zh-Hant'),
        r => validateCompleteVedicReport(r, 'zh-Hant'));
      const failedId = failedRow.id;
      await store.claim(failedId, 'zh-Hant', 0, jobId(failedId, 'zh-Hant'));
      await store.save(failedId, 'zh-Hant', 0, jobId(failedId, 'zh-Hant'), { report: section(0), latencyMs: 2 });
      const initial = aiCalls;
      const cooldownBefore = cooldowns.length;
      await runVedicReportWorkflow(env, { reportId: failedId, chartId, orderId: failureOrder, language: 'zh-Hant', jobId: jobId(failedId, 'zh-Hant') }, steps);
      assert.equal(aiCalls - initial, failure === 'transient' ? 16 : 8);
      assert.equal(cooldowns.length - cooldownBefore, failure === 'transient' ? 8 : 0);
      assert.ok(cooldowns.slice(cooldownBefore).every(ms => ms >= 1000 && ms <= 60000));
      const row = await store.read(failedId);
      const state = row && readReportSlot(row, 'zh-Hant');
      assert.ok(isJob(state));
      assert.equal(state.sections[0].status, 'completed', 'Failure never erases completed section');
      assert.equal(summarize(state.sections), 'partial_failed');
      assert.equal(state.sections[1].attempts, failure === 'transient' ? 2 : 1);
      const retries = await Promise.all([
        handleVedicReportProgress(req(undefined, 'POST', { language: 'zh-Hant' }), env, failedId, 1),
        handleVedicReportProgress(req(undefined, 'POST', { language: 'zh-Hant' }), env, failedId, 1),
      ]);
      assert.deepEqual(retries.map(r => r.status).sort(), [202, 409], 'Explicit section retry is deduplicated');
      assert.equal((await handleVedicReportProgress(req(undefined, 'POST', { language: 'zh-Hant' }), env, failedId, 0)).status, 409);
      mode = 'ok'; checkpoints.clear();
      const retryBefore = aiCalls;
      await runVedicReportWorkflow(env, {
        reportId: failedId, chartId, orderId: failureOrder, language: 'zh-Hant',
        jobId: `${jobId(failedId, 'zh-Hant')}-retry-2`, sectionIndex: 1,
      }, steps);
      assert.equal(aiCalls, retryBefore + 1, 'Manual retry generates only the selected failed section');
      const retried = await store.read(failedId);
      const retryState = retried && readReportSlot(retried, 'zh-Hant');
      assert.ok(isJob(retryState));
      assert.equal(retryState.sections[1].status, 'completed');
      assert.equal(retryState.sections[1].attempts, failure === 'transient' ? 3 : 2, 'Attempt count reflects actual calls, not skipped numbers');
      assert.equal((await handleVedicReportProgress(req(undefined, 'POST', { language: 'zh-Hant' }), env, failedId, 1)).status, 409);
    }
    const failCreateOrder = crypto.randomUUID();
    await db.prepare("INSERT INTO orders VALUES (?,?,'vedic_complete','complete','paid',?)")
      .bind(failCreateOrder, 'owner', JSON.stringify({ vedic_chart_id: chartId })).run();
    const unavailable: Env = { ...env, VEDIC_REPORT_WORKFLOW: {
      createBatch: async () => { throw new Error('SYNTHETIC LAUNCH ERROR'); },
    } as Env['VEDIC_REPORT_WORKFLOW'] };
    assert.equal((await startVedicReport(req(), unavailable, chartId, failCreateOrder, 'zh-Hant')).status, 503);
    const launchState = await (await findVedicReportProgress(req(undefined, 'GET', undefined, `/status?order_id=${failCreateOrder}`), env)).json() as { needsStart: boolean };
    assert.equal(launchState.needsStart, true, 'A failed launch is recoverable with the same deterministic ID');
    assert.equal((await startVedicReport(req(), env, chartId, failCreateOrder, 'zh-Hant')).status, 202);
    mode = 'malformed';
    const malformedBefore = aiCalls;
    await assert.rejects(generateVedicSectionOnce(env, chart, 0, 'zh-Hant'), (error: unknown) => {
      assert.ok(error instanceof VedicSectionError);
      assert.equal(error.code, 'SECTION_VALIDATION_FAILED');
      assert.equal(error.retryable, false, 'A schema TypeError is permanent, not a transport failure');
      return true;
    });
    assert.equal(aiCalls, malformedBefore + 1);
    const publicChart = publicChartData(chart);
    assert.equal(publicChart.presentation.ascendantLongitude, 359.76);
    assert.doesNotMatch(JSON.stringify(publicChart), /calculationData|access_token|client_secret/);
    console.log('Vedic progressive local D1 atomic/partial/reload/ownership/idempotency/concurrency/retry/redaction PASS. Synthetic AI only; zero production calls.');
  } finally {
    globalThis.fetch = originalFetch;
    await mf.dispose();
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(error => { console.error(error); process.exitCode = 1; });
}
