import { VEDIC_REPORT_FORMAT_VERSION, type VedicPaidReport, type VedicReportSection } from './vedicAstrology';

export type ReportLanguage = 'zh-Hant' | 'en';
export type SectionStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'partial_failed' | 'failed';
export interface ReportSectionState {
  key: string;
  title: string;
  status: SectionStatus;
  content: VedicReportSection | null;
  generatedAt?: string;
  safeErrorCode?: string;
  attempts: number;
  manualRetryUsed: boolean;
  retryLaunched?: boolean;
  jobId: string;
  latencyMs?: number;
}
export interface ReportJobState {
  workflowVersion: 1;
  reportStatus: ReportStatus;
  jobId: string;
  launched: boolean;
  startedAt: string;
  sections: ReportSectionState[];
  title: string;
  introduction: string;
  closing: string;
  report?: VedicPaidReport;
  safeErrorCode?: string;
}
export interface ReportRow {
  id: string;
  chart_id: string;
  order_id: string;
  scope: string;
  content_json: string;
  localized_zh_json: string | null;
  localized_en_json: string | null;
}

function snapshot(row: ReportRow, language: ReportLanguage): string {
  // Keep SQLite numeric literals (1.0); JS reserialization would break the CAS.
  return (language === 'en' ? row.localized_en_json : row.localized_zh_json) ?? 'null';
}

export function reportLanguage(value: unknown): ReportLanguage {
  return value === 'en' ? 'en' : 'zh-Hant';
}

function slotPath(language: ReportLanguage): string {
  return `$.localized_reports."${language}"`;
}

export function jobId(reportId: string, language: ReportLanguage): string {
  return `vedic-${reportId}-${language}`;
}

export function readReportSlot(row: ReportRow, language: ReportLanguage): unknown {
  try {
    const parsed = JSON.parse(row.content_json) as { localized_reports?: Partial<Record<ReportLanguage, unknown>> };
    return parsed.localized_reports ? parsed.localized_reports[language] : language === 'zh-Hant' ? parsed : undefined;
  } catch {
    console.error('[vedic-report-store]', { code: 'REPORT_STATE_INVALID' });
    throw new Error('REPORT_STATE_INVALID');
  }
}

export function isJob(value: unknown): value is ReportJobState {
  return !!value && typeof value === 'object' && 'workflowVersion' in value && value.workflowVersion === 1;
}

export function summarize(sections: ReportSectionState[]): ReportStatus {
  if (sections.some(s => s.status === 'generating')) return 'generating';
  if (sections.some(s => s.status === 'pending')) {
    return sections.some(s => s.status === 'completed') ? 'generating' : 'pending';
  }
  if (sections.every(s => s.status === 'completed')) return 'completed';
  return sections.some(s => s.status === 'completed') ? 'partial_failed' : 'failed';
}

export class VedicReportStore {
  constructor(readonly db: D1Database) {}

  async read(id: string): Promise<ReportRow | null> {
    return this.db.prepare(`SELECT id, chart_id, order_id, scope, content_json,
      json_extract(content_json, '$.localized_reports."zh-Hant"') AS localized_zh_json,
      json_extract(content_json, '$.localized_reports.en') AS localized_en_json
      FROM vedic_reports WHERE id = ?`)
      .bind(id).first<ReportRow>();
  }

  async initialize(chartId: string, orderId: string, language: ReportLanguage, titles: string[],
    validateLegacy: (report: VedicPaidReport) => boolean): Promise<ReportRow> {
    await this.db.prepare(`INSERT OR IGNORE INTO vedic_reports
      (id, chart_id, order_id, scope, content_json, created_at) VALUES (?, ?, ?, 'complete', '{}', ?)`)
      .bind(crypto.randomUUID(), chartId, orderId, new Date().toISOString()).run();
    // Preserve legacy Chinese reports, without a read-modify-overwrite race.
    await this.db.prepare(`UPDATE vedic_reports SET content_json =
      CASE WHEN json_extract(content_json, '$.formatVersion') IS NOT NULL
        THEN json_object('localized_reports', json_object('zh-Hant', json(content_json)))
        ELSE json_set(content_json, '$.localized_reports', json('{}')) END
      WHERE order_id = ? AND json_type(content_json, '$.localized_reports') IS NULL`)
      .bind(orderId).run();
    const row = await this.db.prepare(`SELECT id, chart_id, order_id, scope, content_json,
      json_extract(content_json, '$.localized_reports."zh-Hant"') AS localized_zh_json,
      json_extract(content_json, '$.localized_reports.en') AS localized_en_json
      FROM vedic_reports WHERE order_id = ?`)
      .bind(orderId).first<ReportRow>();
    if (!row || row.chart_id !== chartId || row.scope !== 'complete') throw new Error('REPORT_RELATIONSHIP_INVALID');
    const existing = readReportSlot(row, language);
    if (isJob(existing)) return row;
    if (existing && validateLegacy(existing as VedicPaidReport)) return row;
    const id = jobId(row.id, language);
    const previous = existing && typeof existing === 'object' && 'generationOnly' in existing
      ? existing as { sections?: Array<VedicReportSection | null>; title?: string; introduction?: string; closing?: string }
      : undefined;
    const state: ReportJobState = {
      workflowVersion: 1, reportStatus: 'pending', jobId: id, launched: false,
      startedAt: new Date().toISOString(), title: previous?.title || '', introduction: previous?.introduction || '',
      closing: previous?.closing || '',
      sections: titles.map((title, index) => ({
        key: `section-${index + 1}`, title, status: previous?.sections?.[index] ? 'completed' : 'pending',
        content: previous?.sections?.[index] || null, attempts: 0, manualRetryUsed: false, jobId: id,
      })),
    };
    await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json, ?, json(?))
      WHERE id = ? AND json_extract(content_json, ?) IS NULL
      AND COALESCE(json(json_extract(content_json, ?)), 'null') = json(?)`)
      .bind(slotPath(language), JSON.stringify(state), row.id,
        `${slotPath(language)}.workflowVersion`, slotPath(language), snapshot(row, language)).run();
    const updated = await this.read(row.id);
    if (!updated) throw new Error('REPORT_NOT_FOUND');
    return updated;
  }

  async markLaunched(id: string, language: ReportLanguage, launchedJobId: string, index?: number): Promise<void> {
    const p = slotPath(language);
    const ownerPath = index === undefined ? p : `${p}.sections[${index}]`;
    await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json, ?, json('true'),
      ?, CASE WHEN json_extract(content_json, ?) = 'REPORT_JOB_START_FAILED' THEN NULL ELSE json_extract(content_json, ?) END)
      WHERE id = ? AND json_extract(content_json, ?) = ?`)
      .bind(index === undefined ? `${p}.launched` : `${ownerPath}.retryLaunched`,
        `${p}.safeErrorCode`, `${p}.safeErrorCode`, `${p}.safeErrorCode`, id, `${ownerPath}.jobId`, launchedJobId).run();
  }

  async markLaunchFailed(id: string, language: ReportLanguage): Promise<void> {
    await this.db.prepare('UPDATE vedic_reports SET content_json = json_set(content_json, ?, ?) WHERE id = ?')
      .bind(`${slotPath(language)}.safeErrorCode`, 'REPORT_JOB_START_FAILED', id).run();
  }

  async claim(id: string, language: ReportLanguage, index: number, owner: string, attempt = 1): Promise<boolean> {
    const p = `${slotPath(language)}.sections[${index}]`;
    const result = await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json,
      ?, 'generating', ?, ?, ?, NULL)
      WHERE id = ? AND json_extract(content_json, ?) = ?
      AND json_extract(content_json, ?) IN ('pending','generating')
      AND COALESCE(json_extract(content_json, ?), 0) <= ?`)
      .bind(`${p}.status`, `${p}.attempts`, attempt, `${p}.safeErrorCode`, id,
        `${p}.jobId`, owner, `${p}.status`, `${p}.attempts`, attempt).run();
    return result.meta.changes === 1;
  }

  async save(id: string, language: ReportLanguage, index: number, owner: string,
    result: { report?: VedicPaidReport; code?: string; latencyMs: number }, retryPending = false): Promise<void> {
    const p = `${slotPath(language)}.sections[${index}]`;
    const s = slotPath(language);
    const status = result.report ? 'completed' : retryPending ? 'generating' : 'failed';
    await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json,
      ?, ?, ?, json(?), ?, ?, ?, ?, ?, ?,
      ?, CASE WHEN json_extract(content_json, ?) = '' THEN ? ELSE json_extract(content_json, ?) END,
      ?, CASE WHEN json_extract(content_json, ?) = '' THEN ? ELSE json_extract(content_json, ?) END,
      ?, CASE WHEN ? != '' THEN ? ELSE json_extract(content_json, ?) END)
      WHERE id = ? AND json_extract(content_json, ?) = ?
      AND json_extract(content_json, ?) = 'generating'`)
      .bind(`${p}.status`, status, `${p}.content`, JSON.stringify(result.report?.sections[0] ?? null),
        `${p}.generatedAt`, result.report ? new Date().toISOString() : null,
        `${p}.safeErrorCode`, result.code ?? null, `${p}.latencyMs`, result.latencyMs,
        `${s}.title`, `${s}.title`, result.report?.title ?? '', `${s}.title`,
        `${s}.introduction`, `${s}.introduction`, result.report?.introduction ?? '', `${s}.introduction`,
        `${s}.closing`, result.report?.closing ?? '', result.report?.closing ?? '', `${s}.closing`,
        id, `${p}.jobId`, owner, `${p}.status`).run();
  }

  async reserveRetry(id: string, language: ReportLanguage, index: number): Promise<string | null> {
    const row = await this.read(id);
    const value = row && readReportSlot(row, language);
    if (!isJob(value) || !['partial_failed', 'failed'].includes(summarize(value.sections))) return null;
    const p = `${slotPath(language)}.sections[${index}]`;
    const retryId = `${jobId(id, language)}-retry-${index + 1}`;
    const result = await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json,
      ?, 'pending', ?, json('true'), ?, ?, ?, 'generating', ?, json('false'))
      WHERE id = ? AND json(json_extract(content_json, ?)) = json(?) AND json_extract(content_json, ?) = 'failed'
      AND json_extract(content_json, ?) = 0`)
      .bind(`${p}.status`, `${p}.manualRetryUsed`, `${p}.jobId`, retryId,
        `${slotPath(language)}.reportStatus`, `${p}.retryLaunched`,
        id, slotPath(language), snapshot(row!, language), `${p}.status`, `${p}.manualRetryUsed`).run();
    return result.meta.changes === 1 ? retryId : null;
  }

  async finish(id: string, language: ReportLanguage, validate: (r: VedicPaidReport) => boolean): Promise<void> {
    // CAS applies only metadata/assembled report paths, never overwrites the JSON.
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await this.read(id);
      const value = row && readReportSlot(row, language);
      if (!row || !isJob(value)) throw new Error('REPORT_STATE_INVALID');
      let status = summarize(value.sections);
      const report: VedicPaidReport = {
        formatVersion: VEDIC_REPORT_FORMAT_VERSION, title: value.title, introduction: value.introduction, closing: value.closing,
        sections: value.sections.flatMap(s => s.content ? [s.content] : []),
      };
      const invalid = status === 'completed' && !validate(report);
      if (invalid) status = 'failed';
      const p = slotPath(language);
      const updated = await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json,
        ?, ?, ?, json(?), ?, ?) WHERE id = ? AND json(json_extract(content_json, ?)) = json(?)`)
        .bind(`${p}.reportStatus`, status, `${p}.report`, JSON.stringify(status === 'completed' ? report : null),
          `${p}.safeErrorCode`, invalid ? 'REPORT_QUALITY_FAILED' : null, id, p, snapshot(row, language)).run();
      if (updated.meta.changes === 1) return;
    }
    throw new Error('REPORT_FINALIZATION_CONFLICT');
  }

  async failJob(id: string, language: ReportLanguage, owner: string, code: string): Promise<void> {
    for (let index = 0; index < 9; index++) {
      const p = `${slotPath(language)}.sections[${index}]`;
      await this.db.prepare(`UPDATE vedic_reports SET content_json = json_set(content_json, ?, 'failed', ?, ?)
        WHERE id = ? AND json_extract(content_json, ?) = ?
        AND json_extract(content_json, ?) IN ('pending','generating')`)
        .bind(`${p}.status`, `${p}.safeErrorCode`, code, id, `${p}.jobId`, owner, `${p}.status`).run();
    }
  }
}
