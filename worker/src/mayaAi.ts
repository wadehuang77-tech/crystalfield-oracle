import { mayaFeatures } from './mayaFeatures';
import type { Env } from './utils';
import { validateMayaReport, type MayaReport } from '../../app/src/lib/maya';

export const MAYA_AI_MODEL = 'gpt-4o-mini';
export const MAYA_AI_MAX_INPUT = 6000;
export const MAYA_AI_MAX_OUTPUT = 1200;
export const MAYA_AI_RESERVATION_TWD = 0.0567;
export const MAYA_AI_ORDER_CAP_TWD = 1;
export const MAYA_AI_TEST_TOTAL_TWD = 2;
export const MAYA_AI_TEST_REPORT_TWD = 0.4;
export const MAYA_AI_TIMEOUT_MS = 25_000;
export class MayaAiError extends Error {
  constructor(readonly code: string) { super(code); }
}
export function mayaAiMode(env: Env): 'mock' | 'live' {
  if (!mayaFeatures(env).ai) throw new MayaAiError('AI_DISABLED');
  if (env.ENV === 'dev' && env.MAYA_AI_MODE === 'mock') return 'mock';
  if (env.ENV === 'dev' && env.MAYA_AI_TEST_CAP_ENABLED !== 'true') throw new MayaAiError('AI_TEST_CAP_REQUIRED');
  if (env.MAYA_AI_MODE === 'live' && env.OPENAI_API_KEY) return 'live';
  throw new MayaAiError('AI_NOT_CONFIGURED');
}
export async function reserveMayaTestSection(env: Env, reportId: string, orderId: string, index: number): Promise<void> {
  if (env.ENV !== 'dev' || env.MAYA_AI_TEST_CAP_ENABLED !== 'true') throw new MayaAiError('AI_TEST_CAP_REQUIRED');
  await env.DB.prepare('INSERT OR IGNORE INTO maya_ai_budgets(order_id) VALUES (?)').bind(orderId).run();
  // D1 serializes this atomic batch. The section reservation is the global test-provider lock.
  // Any uncertain/failed section stops the entire campaign; reservations never reset automatically.
  const result = await env.DB.batch([
    env.DB.prepare(`UPDATE maya_ai_budgets SET reserved_twd=reserved_twd+?
      WHERE order_id=? AND reserved_twd+? <= ?
      AND (SELECT COALESCE(SUM(reserved_twd),0) FROM maya_ai_budgets)+? <= ?
      AND (SELECT COALESCE(SUM(reserved_twd),0) FROM maya_ai_sections WHERE report_id=?)+? <= ?
      AND NOT EXISTS (SELECT 1 FROM maya_ai_sections WHERE state IN ('reserved','unknown','failed'))
      AND NOT EXISTS (SELECT 1 FROM maya_ai_sections WHERE report_id=? AND section_index=?)`)
      .bind(MAYA_AI_RESERVATION_TWD, orderId, MAYA_AI_RESERVATION_TWD, MAYA_AI_ORDER_CAP_TWD,
        MAYA_AI_RESERVATION_TWD, MAYA_AI_TEST_TOTAL_TWD, reportId, MAYA_AI_RESERVATION_TWD, MAYA_AI_TEST_REPORT_TWD, reportId, index),
    env.DB.prepare(`INSERT INTO maya_ai_sections(report_id,section_index,state,model_name,reserved_twd)
      SELECT ?,?,'reserved',?,? WHERE changes()=1`)
      .bind(reportId, index, MAYA_AI_MODEL, MAYA_AI_RESERVATION_TWD),
  ]);
  if (result[1].meta.changes !== 1) throw new MayaAiError('AI_TEST_STOPPED');
}
export function liveReportTemplate(expected: MayaReport): MayaReport {
  return { ...expected, model_name: MAYA_AI_MODEL, prompt_version: `maya-${expected.locale}-${expected.product_code}-live-1` };
}
interface SectionRow {
  state: 'reserved' | 'completed' | 'failed' | 'unknown';
  body: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_twd: number;
  attempts: number;
}
function prompt(expected: MayaReport, index: number) {
  return [
    expected.locale === 'en'
      ? 'Write ONLY English. Return JSON {"body":"..."}.'
      : '只使用繁體中文撰寫。回傳 JSON {"body":"..."}，不得使用簡體中文。',
    'You write grounded self-reflection, not scientific prediction. Do not predict disease, wealth, destiny or future events.',
    'Use ONLY the immutable server-calculated signatures. Never calculate, change or invent KIN, seals, tones, wavespells or castles.',
    'Fifth-force oracle, castle symbolism, leap-day signatures and legacy moon dates are BLOCKED. Do not interpret them.',
    'No compatibility score. Offer realistic choices, questions and practices, not certainty. No HTML, no identifying information.',
    'Do not write KIN numbers, numeric castle/wavespell claims, or new seal/tone names in prose; the application displays the validated signature separately.',
    `Write one section of 120-350 words or 250-700 Chinese characters: ${expected.sections[index].heading}.`,
    JSON.stringify({ product: expected.product_code, signature: expected.signature, relationship: expected.relationship_signature }),
  ].join('\n');
}
export async function generateMayaReport(
  env: Env, reportId: string, orderId: string, expected: MayaReport,
  authorize: () => Promise<unknown>,
  reportTable: 'maya_reports' | 'maya_admin_reports' = 'maya_reports',
): Promise<MayaReport> {
  const mode = mayaAiMode(env);
  if (mode === 'mock') return expected;
  const template = liveReportTemplate(expected);
  const sectionTable = reportTable === 'maya_admin_reports' ? 'maya_admin_ai_sections' : 'maya_ai_sections';
  const sections: MayaReport['sections'] = [];
  for (const [index, section] of template.sections.entries()) {
    await authorize();
    let row = await env.DB.prepare(`SELECT state,body,input_tokens,output_tokens,cost_twd,attempts FROM ${sectionTable} WHERE report_id=? AND section_index=?`)
      .bind(reportId, index).first<SectionRow>();
    if (row?.state === 'unknown' || row?.state === 'reserved') throw new MayaAiError('AI_OUTCOME_UNKNOWN');
    if (row?.state !== 'completed') {
      if (row && row.attempts >= 3) throw new MayaAiError('AI_RETRY_LIMIT');
      const input = prompt(template, index);
      if (new TextEncoder().encode(input).length > MAYA_AI_MAX_INPUT - 512) throw new MayaAiError('AI_INPUT_LIMIT');
      // Reserve the worst-case cost BEFORE the network call, shared across both languages.
      // Reservations are never refunded automatically: uncertain provider outcomes may be billable.
      if (env.ENV === 'dev') {
        await reserveMayaTestSection(env, reportId, orderId, index);
      } else {
        await env.DB.prepare('INSERT OR IGNORE INTO maya_ai_budgets(order_id) VALUES (?)').bind(orderId).run();
        const budget = await env.DB.prepare(`UPDATE maya_ai_budgets SET reserved_twd=reserved_twd+?
          WHERE order_id=? AND reserved_twd+? <= ? RETURNING order_id`)
          .bind(MAYA_AI_RESERVATION_TWD, orderId, MAYA_AI_RESERVATION_TWD, MAYA_AI_ORDER_CAP_TWD).first();
        if (!budget) throw new MayaAiError('AI_COST_LIMIT');
        const claim = await env.DB.prepare(`INSERT INTO ${sectionTable}(report_id,section_index,state,model_name,reserved_twd)
          VALUES (?,?,'reserved',?,?)
          ON CONFLICT(report_id,section_index) DO UPDATE SET state='reserved',attempts=attempts+1,
            reserved_twd=reserved_twd+excluded.reserved_twd,updated_at=datetime('now')
          WHERE state='failed' AND attempts<3 RETURNING report_id`)
          .bind(reportId, index, MAYA_AI_MODEL, MAYA_AI_RESERVATION_TWD).first();
        if (!claim) throw new MayaAiError('AI_OUTCOME_UNKNOWN');
      }
      let payload: unknown;
      try {
        mayaAiMode(env);
        await authorize();
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(MAYA_AI_TIMEOUT_MS),
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MAYA_AI_MODEL, max_completion_tokens: MAYA_AI_MAX_OUTPUT,
            messages: [{ role: 'system', content: input }],
            response_format: { type: 'json_schema', json_schema: {
              name: 'maya_reflection_section', strict: true,
              schema: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'], additionalProperties: false },
            } },
          }),
        });
        // No provider error body is read or logged; uncertain errors require reconciliation.
        if (!response.ok) throw new MayaAiError('AI_PROVIDER_FAILED');
        const reader = response.body?.getReader();
        if (!reader) throw new MayaAiError('AI_EMPTY_RESPONSE');
        const decoder = new TextDecoder();
        let bytes = 0;
        let text = '';
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.length;
            if (bytes > 64_000) { await reader.cancel(); throw new MayaAiError('AI_OUTPUT_LIMIT'); }
            text += decoder.decode(chunk.value, { stream: true });
          }
          text += decoder.decode();
        } finally { reader.releaseLock(); }
        payload = JSON.parse(text);
      } catch {
        await env.DB.prepare(`UPDATE ${sectionTable} SET state='unknown',updated_at=datetime('now') WHERE report_id=? AND section_index=?`)
          .bind(reportId, index).run();
        throw new MayaAiError('AI_OUTCOME_UNKNOWN');
      }
      const result = payload as {
        model?: unknown; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
        choices?: { finish_reason?: unknown; message?: { content?: unknown } }[];
      };
      const inputTokens = result?.usage?.prompt_tokens;
      const outputTokens = result?.usage?.completion_tokens;
      if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number'
        || !Number.isInteger(inputTokens) || !Number.isInteger(outputTokens)
        || inputTokens < 0 || inputTokens > MAYA_AI_MAX_INPUT || outputTokens < 0 || outputTokens > MAYA_AI_MAX_OUTPUT) {
        await env.DB.prepare(`UPDATE ${sectionTable} SET state='unknown' WHERE report_id=? AND section_index=?`).bind(reportId, index).run();
        throw new MayaAiError('AI_USAGE_INVALID');
      }
      const cost = (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000 * 35;
      let body: unknown;
      try {
        const content = result.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || result.choices?.[0]?.finish_reason !== 'stop') throw new Error('Incomplete output');
        const parsed: unknown = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).join() !== 'body') throw new Error('Invalid schema');
        body = (parsed as { body: unknown }).body;
      } catch { body = null; }
      const valid = typeof body === 'string' && body.length >= 40 && body.length <= 4000
        && !/[<>]/.test(body) && (template.locale === 'en' ? !/[\u3400-\u9fff]/u.test(body) : /[\u3400-\u9fff]/u.test(body))
        && typeof result.model === 'string' && result.model.startsWith(MAYA_AI_MODEL)
        && !/(?:KIN\s*\d+|波符\s*\d+|castle\s*\d+|wavespell\s*\d+)/gi.test(body);
      // Numeric signatures are displayed separately; prose cannot introduce alternate numbers.
      await env.DB.batch([
        env.DB.prepare(`UPDATE ${sectionTable} SET state=?,body=?,model_name=?,input_tokens=input_tokens+?,output_tokens=output_tokens+?,
          cost_twd=cost_twd+?,updated_at=datetime('now') WHERE report_id=? AND section_index=?`)
          .bind(valid ? 'completed' : 'failed', valid ? body : null, typeof result.model === 'string' ? result.model : MAYA_AI_MODEL, inputTokens, outputTokens, cost, reportId, index),
        env.DB.prepare('UPDATE maya_ai_budgets SET actual_twd=actual_twd+? WHERE order_id=?').bind(cost, orderId),
        env.DB.prepare(`UPDATE ${reportTable} SET model_name=?,input_tokens=input_tokens+?,output_tokens=output_tokens+?,cost_twd=cost_twd+? WHERE id=?`)
          .bind(MAYA_AI_MODEL, inputTokens, outputTokens, cost, reportId),
      ]);
      if (!valid) throw new MayaAiError('AI_SCHEMA_INVALID');
      row = await env.DB.prepare(`SELECT state,body,input_tokens,output_tokens,cost_twd,attempts FROM ${sectionTable} WHERE report_id=? AND section_index=?`)
        .bind(reportId, index).first<SectionRow>();
    }
    if (!row?.body) throw new MayaAiError('AI_PERSISTENCE_FAILED');
    sections.push({ heading: section.heading, body: row.body });
  }
  await authorize();
  const usage = await env.DB.prepare(`SELECT input_tokens,output_tokens,cost_twd FROM ${reportTable} WHERE id=?`)
    .bind(reportId).first<{ input_tokens: number; output_tokens: number; cost_twd: number }>();
  if (!usage) throw new MayaAiError('AI_PERSISTENCE_FAILED');
  const report: MayaReport = { ...template, sections, usage };
  if (!validateMayaReport(report, report)) throw new MayaAiError('AI_SCHEMA_INVALID');
  return report;
}
