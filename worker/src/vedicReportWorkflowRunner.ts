import type { WorkflowStep, WorkflowStepConfig } from 'cloudflare:workers';
import { generateVedicSectionOnce, VedicSectionError, validateCompleteVedicReport, type VedicChartData } from './vedicAstrology';
import { VedicReportStore, isJob, readReportSlot, jobId, type ReportLanguage } from './vedicReportStore';
import type { Env } from './utils';

export interface VedicReportJobInput {
  reportId: string;
  chartId: string;
  orderId: string;
  language: ReportLanguage;
  jobId: string;
  sectionIndex?: number;
}

const DB_STEP: WorkflowStepConfig = { retries: { limit: 2, delay: '1 second', backoff: 'constant' }, timeout: '30 seconds' };
const AI_STEP: WorkflowStepConfig = { retries: { limit: 0, delay: '1 second' }, timeout: '130 seconds' };

export async function runVedicReportWorkflow(env: Env, input: VedicReportJobInput, step: Pick<WorkflowStep, 'do' | 'sleep'>): Promise<void> {
  const normalId = jobId(input.reportId, input.language);
  if (!['zh-Hant', 'en'].includes(input.language) ||
      (input.sectionIndex !== undefined && (!Number.isInteger(input.sectionIndex) || input.sectionIndex < 0 || input.sectionIndex > 8)) ||
      input.jobId !== (input.sectionIndex === undefined ? normalId : `${normalId}-retry-${input.sectionIndex + 1}`)) {
    throw new Error('REPORT_JOB_INPUT_INVALID');
  }
  const store = new VedicReportStore(env.DB);
  const chart = await step.do('authorized-chart', DB_STEP, async () => {
    const row = await env.DB.prepare(`SELECT c.chart_json FROM vedic_charts c
      JOIN vedic_reports r ON r.chart_id = c.id JOIN orders o ON o.id = r.order_id
      WHERE r.id = ? AND c.id = ? AND o.id = ? AND o.status = 'paid' AND o.item_id = 'vedic_complete'
      AND json_valid(o.picks_payload) AND json_extract(o.picks_payload, '$.vedic_chart_id') = c.id`)
      .bind(input.reportId, input.chartId, input.orderId).first<{ chart_json: string }>();
    if (!row) throw new Error('REPORT_ENTITLEMENT_INVALID');
    return JSON.parse(row.chart_json) as VedicChartData;
  });
  const attemptBase = await step.do('attempt-base', DB_STEP, async () => {
    if (input.sectionIndex === undefined) return 0;
    const row = await store.read(input.reportId);
    const value = row && readReportSlot(row, input.language);
    if (!isJob(value)) throw new Error('REPORT_STATE_INVALID');
    return value.sections[input.sectionIndex].attempts;
  });
  const indexes = input.sectionIndex === undefined ? Array.from({ length: 9 }, (_, i) => i) : [input.sectionIndex];
  let next = 0;
  async function lane() {
    while (next < indexes.length) {
      const index = indexes[next++];
      for (let attempt = 0; attempt < 2; attempt++) {
        const name = `section-${index + 1}-attempt-${attempt + 1}`;
        const claimed = await step.do(`${name}-claim`, DB_STEP,
          () => store.claim(input.reportId, input.language, index, input.jobId,
            attemptBase + attempt + 1));
        if (!claimed) break;
        // Checkpoint the validated result before saving it; DB retries cannot repeat AI.
        const result = await step.do(`${name}-ai`, AI_STEP, async () => {
          const start = performance.now();
          try {
            const report = await generateVedicSectionOnce(env, chart, index, input.language);
            return { report, latencyMs: Math.round(performance.now() - start), retryable: false, retryAfterMs: 0 };
          } catch (error) {
            const safe = error instanceof VedicSectionError ? error : new VedicSectionError('SECTION_INTERNAL_FAILED', false);
            console.warn('[vedic-section]', { section: index + 1, attempt: attempt + 1, code: safe.code });
            return {
              code: safe.code, retryable: safe.retryable,
              retryAfterMs: safe.retryAfterMs, latencyMs: Math.round(performance.now() - start),
            };
          }
        });
        const retry = !('report' in result) && result.retryable && attempt === 0 && result.retryAfterMs <= 60000;
        await step.do(`${name}-persist`, DB_STEP,
          () => store.save(input.reportId, input.language, index, input.jobId, result, retry));
        console.info('[vedic-section-timing]', {
          section: index + 1, attempt: attempt + 1, latencyMs: result.latencyMs, completed: 'report' in result,
        });
        if (!retry) break;
        await step.sleep(`${name}-cooldown`, Math.max(result.retryAfterMs, 1000));
      }
    }
  }
  const lanes = await Promise.allSettled(Array.from({ length: Math.min(3, indexes.length) }, () => lane()));
  if (lanes.some(result => result.status === 'rejected')) throw new Error('REPORT_WORKFLOW_FAILED');
  await step.do('final-status', DB_STEP,
    () => store.finish(input.reportId, input.language, r => validateCompleteVedicReport(r, input.language)));
}
