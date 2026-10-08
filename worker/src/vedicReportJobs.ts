import { json, readBody, readSession, requireAdmin, rateLimit, type Env } from './utils';
import { reportHeadings, validateCompleteVedicReport, type VedicPaidReport } from './vedicAstrology';
import {
  VedicReportStore, isJob, readReportSlot, reportLanguage, summarize,
  type ReportLanguage, type ReportRow, type ReportJobState,
} from './vedicReportStore';
import type { VedicReportJobInput } from './vedicReportWorkflowRunner';

function reply(req: Request, env: Env, body: unknown, status = 200): Response {
  return json(req, env, body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function owns(req: Request, env: Env, chartId: string, orderId: string, complete = true): Promise<boolean> {
  const user = await readSession(req, env);
  if (!user) return false;
  const row = await env.DB.prepare(`SELECT o.user_id AS order_user, c.user_id AS chart_user, o.picks_payload
    FROM orders o JOIN vedic_charts c ON c.id = ?
    WHERE o.id = ? AND o.status = 'paid' AND o.item_id LIKE 'vedic_%' AND (? = 0 OR o.item_id = 'vedic_complete')`)
    .bind(chartId, orderId, complete ? 1 : 0).first<{ order_user: string | null; chart_user: string | null; picks_payload: string | null }>();
  if (!row) return false;
  let linked: unknown;
  try {
    linked = (JSON.parse(row.picks_payload || '{}') as { vedic_chart_id?: unknown }).vedic_chart_id;
  } catch {
    console.warn('[vedic-report-access]', { code: 'ORDER_CONTEXT_INVALID' });
    return false;
  }
  if (linked !== chartId) return false;
  return (row.order_user === user.id && row.chart_user === user.id) || await requireAdmin(req, env, user);
}

function validSavedReport(value: unknown, language: ReportLanguage): value is VedicPaidReport {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VedicPaidReport>;
  if (!Array.isArray(candidate.sections) || candidate.sections.some(section =>
    !section || typeof section.heading !== 'string' || typeof section.consultation !== 'string' ||
    !Array.isArray(section.evidence) || (section.timeline !== undefined && (!Array.isArray(section.timeline) ||
      section.timeline.some(p => !p?.interpretation || typeof p.interpretation.consultation !== 'string' ||
        !Array.isArray(p.interpretation.evidence)))))) return false;
  return validateCompleteVedicReport(value as VedicPaidReport, language);
}

function publicProgress(row: ReportRow, language: ReportLanguage) {
  const value = readReportSlot(row, language);
  if (!isJob(value)) {
    if (validSavedReport(value, language)) {
      const report = value;
      return {
        reportId: row.id, chartId: row.chart_id, language, reportStatus: 'completed', totalSections: 9, completedSections: 9,
        title: report.title, introduction: report.introduction, closing: report.closing,
        sections: report.sections.map((s, index) => ({
          key: `section-${index + 1}`, title: s.heading, status: 'completed',
          content: publicContent(s), retryable: false,
        })),
      };
    }
    return { reportId: row.id, chartId: row.chart_id, language, reportStatus: 'pending',
      totalSections: 9, completedSections: 0, sections: [], needsStart: true };
  }
  const state = value as ReportJobState;
  const derived = summarize(state.sections);
  const status = state.safeErrorCode === 'REPORT_QUALITY_FAILED' ? 'failed'
    : derived === 'completed' && state.reportStatus !== 'completed' ? 'generating' : derived;
  return {
    reportId: row.id, chartId: row.chart_id, language, reportStatus: status,
    totalSections: 9, completedSections: state.sections.filter(s => s.status === 'completed').length,
    safeErrorCode: state.safeErrorCode, startedAt: state.startedAt,
    title: state.title, introduction: state.introduction, closing: status === 'completed' ? state.closing : '',
    needsStart: !state.launched || state.sections.some(s => s.manualRetryUsed && s.retryLaunched === false),
    sections: state.sections.map(s => ({
      key: s.key, title: s.title, status: s.status,
      ...(s.status === 'completed' && s.content ? { content: publicContent(s.content) } : {}),
      generatedAt: s.generatedAt, safeErrorCode: s.safeErrorCode,
      retryable: s.status === 'failed' && !s.manualRetryUsed && ['failed', 'partial_failed'].includes(status),
      attempts: s.attempts, latencyMs: s.latencyMs,
    })),
  };
}

function publicContent(section: VedicPaidReport['sections'][number]) {
  return {
    heading: section.heading, consultation: section.consultation,
    // Evidence is kept server-side; status responses expose only report prose/timeline.
    evidence: [],
    ...(section.timeline ? {
      timeline: section.timeline.map(p => ({
        id: p.id, mahaDasha: p.mahaDasha, antarDasha: p.antarDasha, startDate: p.startDate, endDate: p.endDate,
        displayLabel: p.displayLabel, analysisStartDate: p.analysisStartDate, analysisEndDate: p.analysisEndDate,
        interpretation: { consultation: p.interpretation.consultation, evidence: [] },
      })),
    } : {}),
  };
}

async function launch(env: Env, row: ReportRow, language: ReportLanguage, id: string, sectionIndex?: number): Promise<void> {
  if (!env.VEDIC_REPORT_WORKFLOW) throw new Error('REPORT_WORKFLOW_NOT_CONFIGURED');
  const params: VedicReportJobInput = {
    reportId: row.id, chartId: row.chart_id, orderId: row.order_id, language, jobId: id,
    ...(sectionIndex === undefined ? {} : { sectionIndex }),
  };
  // createBatch skips an existing instance ID; repeated POSTs cannot spawn another job.
  await env.VEDIC_REPORT_WORKFLOW.createBatch([{ id, params }]);
}

export async function startVedicReport(req: Request, env: Env, chartId: string, orderId: string,
  language: ReportLanguage): Promise<Response> {
  if (!await owns(req, env, chartId, orderId)) return reply(req, env, { code: 'REPORT_ACCESS_DENIED', error: 'Report access denied.' }, 403);
  const store = new VedicReportStore(env.DB);
  const row = await store.initialize(chartId, orderId, language, reportHeadings('complete', language),
    report => validSavedReport(report, language));
  const slot = readReportSlot(row, language);
  if (isJob(slot) && slot.reportStatus !== 'completed' &&
      (!slot.launched || slot.sections.some(s => s.manualRetryUsed && s.retryLaunched === false))) {
    if (!env.VEDIC_REPORT_WORKFLOW) return reply(req, env, { code: 'REPORT_WORKFLOW_NOT_CONFIGURED', error: 'Report generation is unavailable.' }, 503);
    try {
      if (!slot.launched) {
        await launch(env, row, language, slot.jobId);
        await store.markLaunched(row.id, language, slot.jobId);
      }
      for (const [index, section] of slot.sections.entries()) {
        if (section.manualRetryUsed && section.retryLaunched === false) {
          await launch(env, row, language, section.jobId, index);
          await store.markLaunched(row.id, language, section.jobId, index);
        }
      }
    } catch {
      console.error('[vedic-report-start]', { code: 'REPORT_JOB_START_FAILED' });
      await store.markLaunchFailed(row.id, language);
      return reply(req, env, { reportId: row.id, code: 'REPORT_JOB_START_FAILED', error: 'Report generation could not start.' }, 503);
    }
  }
  const saved = await store.read(row.id);
  if (!saved) throw new Error('REPORT_NOT_FOUND');
  const progress = publicProgress(saved, language);
  const completed = readReportSlot(saved, language);
  const report = isJob(completed) ? completed.report : validSavedReport(completed, language) ? completed : undefined;
  return reply(req, env, {
    scope: 'complete', cached: progress.reportStatus === 'completed', progressive: progress,
    ...(report ? { report } : { generationOnly: true }),
    generation: progress.sections.map((section, index) => ({
      section: index + 1, heading: section.title, status: section.status,
    })),
  }, progress.reportStatus === 'completed' ? 200 : 202);
}

export async function handleVedicReportProgress(req: Request, env: Env, id: string, retryIndex?: number): Promise<Response> {
  if (!await readSession(req, env)) return reply(req, env, { code: 'AUTH_REQUIRED', error: 'Sign in required.' }, 401);
  const store = new VedicReportStore(env.DB);
  const row = await store.read(id);
  if (!row || !await owns(req, env, row.chart_id, row.order_id)) {
    return reply(req, env, { code: 'REPORT_ACCESS_DENIED', error: 'Report access denied.' }, 403);
  }

  const language = reportLanguage(new URL(req.url).searchParams.get('language'));
  if (retryIndex !== undefined) {
    if (req.method !== 'POST' || retryIndex < 0 || retryIndex > 8) return reply(req, env, { code: 'INVALID_SECTION' }, 400);
    const body = await readBody<{ language?: unknown }>(req);
    const retryLanguage = reportLanguage(body.language);
    if (!env.VEDIC_REPORT_WORKFLOW) return reply(req, env, { code: 'REPORT_WORKFLOW_NOT_CONFIGURED' }, 503);
    const limit = await rateLimit(env, 'vedic-section-retry', `${id}:${retryLanguage}`, 9, 3600);
    if (!limit.allowed) return reply(req, env, { code: 'REPORT_RETRY_RATE_LIMITED' }, 429);
    const retryId = await store.reserveRetry(id, retryLanguage, retryIndex);
    if (!retryId) return reply(req, env, { code: 'SECTION_NOT_RETRYABLE' }, 409);
    try {
      await launch(env, row, retryLanguage, retryId, retryIndex);
      await store.markLaunched(id, retryLanguage, retryId, retryIndex);
    } catch {
      console.error('[vedic-report-retry]', { code: 'REPORT_JOB_START_FAILED' });
      await store.markLaunchFailed(id, retryLanguage);
      return reply(req, env, { code: 'REPORT_JOB_START_FAILED', error: 'Report retry could not start.' }, 503);
    }
    const saved = await store.read(id);
    if (!saved) throw new Error('REPORT_NOT_FOUND');
    return reply(req, env, publicProgress(saved, retryLanguage), 202);
  }
  if (req.method !== 'GET') return reply(req, env, { code: 'METHOD_NOT_ALLOWED' }, 405);
  return reply(req, env, publicProgress(row, language));
}

export async function findVedicReportProgress(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'GET') return reply(req, env, { code: 'METHOD_NOT_ALLOWED' }, 405);
  if (!await readSession(req, env)) return reply(req, env, { code: 'AUTH_REQUIRED' }, 401);
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id') || '';
  const language = reportLanguage(url.searchParams.get('language'));
  const order = await env.DB.prepare("SELECT picks_payload, item_id FROM orders WHERE id = ? AND status = 'paid' AND item_id LIKE 'vedic_%'")
    .bind(orderId).first<{ picks_payload: string | null; item_id: string }>();
  let chartId: string | undefined;
  try {
    chartId = order ? (JSON.parse(order.picks_payload || '{}') as { vedic_chart_id?: string }).vedic_chart_id : undefined;
  } catch {
    console.warn('[vedic-report-lookup]', { code: 'ORDER_CONTEXT_INVALID' });
  }
  if (!chartId || !await owns(req, env, chartId, orderId, false)) return reply(req, env, { code: 'REPORT_ACCESS_DENIED' }, 403);
  if (order?.item_id !== 'vedic_complete') return reply(req, env, { legacy: true, language });
  const row = await env.DB.prepare('SELECT id, chart_id, order_id, scope, content_json FROM vedic_reports WHERE order_id = ?')
    .bind(orderId).first<ReportRow>();
  return reply(req, env, row ? publicProgress(row, language) : {
    language, needsStart: true, reportStatus: 'pending', totalSections: 9, completedSections: 0, sections: [],
  });
}
