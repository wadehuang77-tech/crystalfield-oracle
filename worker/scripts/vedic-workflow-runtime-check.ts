import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { ensureVedicSchema, reportHeadings, validateCompleteVedicReport } from '../src/vedicAstrology';
import { VedicReportStore, jobId, readReportSlot, isJob } from '../src/vedicReportStore';
import type { VedicReportJobInput } from '../src/vedicReportWorkflowRunner';
import type { Env } from '../src/utils';
import { chart } from './vedic-progress-check';

async function main() {
  const bundle = await build({
    entryPoints: [resolve('src', 'entry.ts')], bundle: true, write: false, format: 'esm',
    platform: 'neutral', mainFields: ['module', 'main'], external: ['cloudflare:*', 'node:*'],
  });
  let aiCalls = 0;
  let active = 0;
  let peak = 0;
  const mf = new Miniflare({
    name: 'vedic-workflow-local-test', modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-04-24', compatibilityFlags: ['nodejs_compat'],
    bindings: { OPENAI_API_KEY: 'synthetic-local-key', JWT_SECRET: 'synthetic-local-jwt' },
    d1Databases: { DB: 'vedic-workflow-local-db', DB_CARDS: 'unused-local-cards' },
    workflows: { VEDIC_REPORT_WORKFLOW: { name: 'vedic-report-local-test', className: 'VedicReportWorkflow' } },
    outboundService: async req => {
      assert.ok(req.url.startsWith('https://api.openai.com/'), 'Unexpected outbound request (no production transport allowed)');
      aiCalls++; active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 20));
      active--;
      return new Response('RAW SYNTHETIC ERROR MUST NOT BE PERSISTED', { status: 400 });
    },
  });
  try {
    const db = await mf.getD1Database('DB');
    const env: Env = { DB: db, DB_CARDS: db, JWT_SECRET: 'local-test' };
    await ensureVedicSchema(env);
    await db.exec("CREATE TABLE orders(id TEXT PRIMARY KEY,user_id TEXT,item_id TEXT,status TEXT,picks_payload TEXT)");
    const chartId = crypto.randomUUID(), orderId = crypto.randomUUID();
    await db.prepare('INSERT INTO vedic_charts VALUES (?,?,?,?,?,?)')
      .bind(chartId, 'owner', JSON.stringify(chart), '{}', new Date().toISOString(), '2100-01-01').run();
    await db.prepare("INSERT INTO orders VALUES (?,'owner','vedic_complete','paid',?)")
      .bind(orderId, JSON.stringify({ vedic_chart_id: chartId })).run();
    const store = new VedicReportStore(db);
    const row = await store.initialize(chartId, orderId, 'zh-Hant', reportHeadings('complete', 'zh-Hant'),
      r => validateCompleteVedicReport(r, 'zh-Hant'));
    const bindings = await mf.getBindings<{ VEDIC_REPORT_WORKFLOW: Workflow<VedicReportJobInput> }>();
    const id = jobId(row.id, 'zh-Hant');
    const params: VedicReportJobInput = { reportId: row.id, chartId, orderId, language: 'zh-Hant', jobId: id };
    await bindings.VEDIC_REPORT_WORKFLOW.createBatch([{ id, params }]);
    await bindings.VEDIC_REPORT_WORKFLOW.createBatch([{ id, params }]);
    const instance = await bindings.VEDIC_REPORT_WORKFLOW.get(id);
    const deadline = Date.now() + 30000;
    let status = await instance.status();
    while (!['complete', 'errored', 'terminated'].includes(status.status) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
      status = await instance.status();
    }
    assert.equal(status.status, 'complete', `Local Workflow failed: ${JSON.stringify(status)}`);
    assert.equal(aiCalls, 9, 'Real Workflow runtime + duplicate createBatch makes exactly nine single attempts');
    assert.ok(peak <= 3);
    const finished = await store.read(row.id);
    const slot = finished && readReportSlot(finished, 'zh-Hant');
    assert.ok(isJob(slot));
    assert.equal(slot.reportStatus, 'failed');
    assert.ok(slot.sections.every(s => s.status === 'failed' && s.attempts === 1));
    assert.doesNotMatch(finished!.content_json, /RAW SYNTHETIC|synthetic-local-key|access_token|client_secret/);
    console.log('Actual local workerd Workflow entrypoint/binding/checkpoints/concurrency/idempotent-createBatch/safe-terminal-state PASS. No remote resources or production API calls.');
  } finally { await mf.dispose(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
