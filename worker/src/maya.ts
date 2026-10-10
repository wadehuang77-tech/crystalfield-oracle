import { json, isAllowedOrigin, readBody, readSession, PayloadTooLargeError, type Env } from './utils';
import { mayaSandboxEnabled } from './mayaSandbox';
import { routeMayaPro } from './mayaPro';
import { routeMayaRelationship } from './mayaRelationship';
import { mayaAdminLive, mayaFeatures, mayaSessionFeatures } from './mayaFeatures';
import { generateMayaReport, liveReportTemplate, mayaAiMode, MayaAiError } from './mayaAi';
import {
  isMayaDate, isMayaLocale, isMayaProduct, MAYA_BLOCKED_RULES, MAYA_CALCULATION_VERSION,
  MAYA_CONTENT_VERSION, mayaOrderAmounts, mayaForDate, mayaSignature, mayaSummary,
  mockMayaReport, taipeiDate, validateMayaReport,
  type MayaLocale, type MayaProductCode, type MayaProfile, type MayaReport,
} from '../../app/src/lib/maya';

interface ProfileRow {
  id: string;
  birth_date: string;
  role: 'personal' | 'relationship';
  kin_number: number;
  calculation_version: string;
}
interface EntitlementRow { id: string; order_id: string }
interface ReportRow {
  id: string;
  entitlement_id: string;
  order_id: string;
  report_type: MayaProductCode;
  locale: MayaLocale;
  request_fingerprint: string;
  report_status: 'pending' | 'processing' | 'completed' | 'failed';
  report_content: string | null;
  attempts: number;
  model_name: MayaReport['model_name'];
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
  cost_twd: number;
}
class MayaError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const errors: Record<string, [string, string]> = {
  LOGIN_REQUIRED: ['請先登入。', 'Please sign in first.'],
  FEATURE_DISABLED: ['此功能尚未啟用。', 'This feature is not enabled.'],
  AI_DISABLED: ['AI 報告尚未啟用。', 'AI reports are not enabled.'],
  AI_NOT_CONFIGURED: ['AI 服務尚未設定。', 'AI service is not configured.'],
  AI_OUTCOME_UNKNOWN: ['生成結果待核對，暫停自動重試以避免重複費用。', 'Generation outcome requires reconciliation; automatic retry is paused to avoid duplicate costs.'],
  AI_COST_LIMIT: ['此訂單已達 AI 費用上限。', 'This order has reached its AI cost limit.'],
  AI_SCHEMA_INVALID: ['AI 回傳格式或語言不符，請重試。', 'AI output failed format or language validation. Please retry.'],
  BAD_ORIGIN: ['請求來源不受允許。', 'Request origin is not allowed.'],
  INVALID_INPUT: ['輸入格式錯誤。', 'Invalid request input.'],
  INVALID_DATE: ['日期必須為 1900 年至今日之間的有效 YYYY-MM-DD。', 'Use a valid YYYY-MM-DD between 1900 and today.'],
  LEAP_DAY_BLOCKED: ['2 月 29 日的個人印記規則待確認，暫停此日期計算。', 'February 29 signatures are blocked pending birth-time rules.'],
  PAYMENT_REQUIRED: ['需要有效付款與未撤銷的商品權限。', 'A verified payment and active product entitlement are required.'],
  NOT_FOUND: ['找不到資料。', 'Not found.'],
  RATE_LIMITED: ['請求次數過多，請稍後再試。', 'Too many requests. Please try again later.'],
  MOCK_ONLY: ['本階段僅支援本地 Mock AI，正式報告尚未啟用。', 'Only local Mock AI is enabled in Phase 2.'],
  DAILY_PRODUCT_BLOCKED: ['每日深度商品尚未啟用，個人報告方案不包含此權限。', 'Daily premium is a future product, not included in personal reports.'],
  CONFLICT: ['此冪等鍵或訂單已綁定其他報告輸入。', 'This idempotency key or order is bound to different report inputs.'],
  RETRY_LIMIT: ['重試已達上限，請聯絡支援。', 'Retry limit reached. Please contact support.'],
  INTERNAL_ERROR: ['服務暫時無法使用，請稍後重試。', 'Service temporarily unavailable. Please try again later.'],
  TOO_LARGE: ['請求內容過大。', 'Request body is too large.'],
  REPORT_LANGUAGE: ['請先從方案區產生此語言版本的報告。', 'Generate this language version from the product panel first.'],
};

function localMock(env: Env): boolean { return env.ENV === 'dev' && env.MAYA_AI_MODE === 'mock'; }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MayaError(400, 'INVALID_INPUT');
  return value as Record<string, unknown>;
}
function onlyKeys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new MayaError(400, 'INVALID_INPUT');
}
function localeOf(value: unknown): MayaLocale {
  if (value === undefined || value === null) return 'zh-TW';
  if (!isMayaLocale(value)) throw new MayaError(400, 'INVALID_INPUT');
  return value;
}
function dateOf(value: unknown): string {
  if (!isMayaDate(value)) throw new MayaError(400, 'INVALID_DATE');
  if (value.slice(5) === '02-29') throw new MayaError(422, 'LEAP_DAY_BLOCKED');
  return value;
}
function idOf(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new MayaError(400, 'INVALID_INPUT');
  return value;
}
async function limit(env: Env, user: string, scope: string, maximum: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const row = await env.DB.prepare(`
    INSERT INTO maya_rate_limits(scope, user_id, bucket, used) VALUES (?, ?, ?, 1)
    ON CONFLICT(scope, user_id, bucket) DO UPDATE SET used = used + 1 WHERE used < ?
    RETURNING used
  `).bind(scope, user, bucket, maximum).first<{ used: number }>();
  if (!row) throw new MayaError(429, 'RATE_LIMITED');
}
async function profileFor(env: Env, user: string, id: string): Promise<ProfileRow> {
  const row = await env.DB.prepare('SELECT id, birth_date, role, kin_number, calculation_version FROM maya_kin_profiles WHERE id = ? AND user_id = ?')
    .bind(id, user).first<ProfileRow>();
  if (!row) throw new MayaError(404, 'NOT_FOUND');
  dateOf(row.birth_date);
  if (row.calculation_version !== MAYA_CALCULATION_VERSION || mayaForDate(row.birth_date, 'en').kin_number !== row.kin_number) {
    throw new MayaError(409, 'CONFLICT');
  }
  return row;
}
function profilePayload(row: ProfileRow, locale: MayaLocale): MayaProfile {
  if (row.calculation_version !== MAYA_CALCULATION_VERSION) throw new MayaError(409, 'CONFLICT');
  const signature = mayaForDate(row.birth_date, locale);
  return { ...signature, id: row.id, birth_date: row.birth_date, role: row.role, free_summary: mayaSummary(signature, locale) };
}
async function entitlement(env: Env, user: string, product: MayaProductCode, entitlementId?: string): Promise<EntitlementRow> {
  const prices = mayaOrderAmounts(product);
  const row = await env.DB.prepare(`
    SELECT e.id, e.order_id FROM maya_entitlements e JOIN orders o ON o.id = e.order_id
    WHERE e.user_id = ? AND o.user_id = e.user_id AND e.product_code = ?
      AND e.status = 'active' AND o.status = 'paid' AND o.item_id = e.product_code AND o.amount IN (?,?)
      AND o.paid_at IS NOT NULL AND julianday(e.starts_at) <= julianday('now')
      AND (e.expires_at IS NULL OR julianday(e.expires_at) > julianday('now'))
      AND ((e.source = 'local_mock' AND ? = 1 AND o.item_type = 'maya_mock')
        OR (e.source = 'verified_payment' AND o.ecpay_trade_no IS NOT NULL
          AND ((o.item_type = 'maya' AND EXISTS (
            SELECT 1 FROM maya_payment_orders p WHERE p.order_id=o.id AND p.user_id=o.user_id
              AND p.product_code=o.item_id AND p.trade_no=o.ecpay_trade_no AND p.payment_state='paid'))
            OR (o.item_type = 'maya_sandbox' AND ? = 1))))
      AND (? IS NULL OR e.id = ?)
    ORDER BY e.created_at DESC LIMIT 1
  `).bind(user, product, prices[0], prices[1] ?? prices[0], localMock(env) ? 1 : 0, mayaSandboxEnabled(env) ? 1 : 0, entitlementId ?? null, entitlementId ?? null).first<EntitlementRow>();
  if (!row) throw new MayaError(403, 'PAYMENT_REQUIRED');
  return row;
}
async function freeContent(env: Env, kin: number, locale: MayaLocale): Promise<string> {
  if (env.MAYA_CONTENT_SOURCE === 'cards') {
    const row = await env.DB_CARDS.prepare('SELECT summary,solar_seal_name,tone_name FROM maya_kin_content WHERE kin_number=? AND locale=? AND content_version=?')
      .bind(kin, locale, MAYA_CONTENT_VERSION).first<{ summary: string; solar_seal_name: string; tone_name: string }>();
    const signature = mayaSignature(kin, locale);
    if (!row || row.solar_seal_name !== signature.solar_seal || row.tone_name !== signature.galactic_tone
      || row.summary !== mayaSummary(signature, locale)) throw new Error('Maya Cards content is missing or inconsistent');
    return row.summary;
  }
  if (env.MAYA_CONTENT_SOURCE !== undefined && env.MAYA_CONTENT_SOURCE !== 'customer') throw new Error('Invalid Maya content source');
  const signature = mayaSignature(kin, locale);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO maya_kin_content
      (kin_number, locale, title, solar_seal_name, tone_name, summary, strengths, challenges, growth_guidance, content_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(kin, locale, `KIN ${kin}`, signature.solar_seal, signature.galactic_tone, mayaSummary(signature, locale),
    locale === 'en' ? 'Notice a strength in your real experience.' : '觀察真實經驗中的優勢。',
    locale === 'en' ? 'Review assumptions before acting.' : '行動前回顧自己的假設。',
    locale === 'en' ? 'Practice one small, realistic action.' : '實踐一個可行的小行動。', MAYA_CONTENT_VERSION).run();
  const row = await env.DB.prepare('SELECT summary FROM maya_kin_content WHERE kin_number = ? AND locale = ? AND content_version = ?')
    .bind(kin, locale, MAYA_CONTENT_VERSION).first<{ summary: string }>();
  if (!row) throw new Error('Maya content persistence failed');
  return row.summary;
}
function storedReport(row: ReportRow): MayaReport | null {
  if (row.report_status !== 'completed') return null;
  let value: unknown;
  try { value = JSON.parse(row.report_content ?? 'null'); }
  catch { throw new Error('Invalid stored report JSON'); }
  const storedObject = (input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid stored report object');
    return input as Record<string, unknown>;
  };
  const candidate = storedObject(value);
  const signature = storedObject(candidate.signature);
  const kin = signature.kin_number;
  if (!Number.isInteger(kin) || typeof kin !== 'number' || kin < 1 || kin > 260) throw new Error('Invalid stored signature');
  let relationship = null;
  if (candidate.relationship_signature !== null) {
    const partner = storedObject(candidate.relationship_signature);
    if (typeof partner.kin_number !== 'number' || !Number.isInteger(partner.kin_number) || partner.kin_number < 1 || partner.kin_number > 260) throw new Error('Invalid partner signature');
    relationship = mayaSignature(partner.kin_number, row.locale);
  }
  const mock = mockMayaReport(mayaSignature(kin, row.locale), relationship, row.locale, row.report_type);
  const expected = row.model_name === 'gpt-4o-mini'
    ? { ...liveReportTemplate(mock), usage: { input_tokens: row.input_tokens, output_tokens: row.output_tokens, cost_twd: row.cost_twd } }
    : mock;
  if (row.prompt_version !== expected.prompt_version || row.model_name !== expected.model_name) throw new Error('Stored report provider mismatch');
  if (!validateMayaReport(value, expected)) throw new Error('Invalid stored report schema');
  return value;
}

export async function routeMayaApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/maya/pro/')) return routeMayaPro(req, env);
  if (url.pathname.startsWith('/api/maya/relationship/')) return routeMayaRelationship(req, env);
  let locale: MayaLocale = url.searchParams.get('locale') === 'en' ? 'en' : 'zh-TW';
  const respond = (data: unknown, status = 200) => json(req, env, data, {
    status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
  try {
    if (url.pathname === '/api/maya/config' && req.method === 'GET') {
      const user = env.MAYA_MEMBER_TEST_USER_IDS || env.MAYA_ADMIN_PREVIEW_ENABLED === 'true' || env.MAYA_ADMIN_LIVE_ENABLED === 'true' ? await readSession(req, env, true) : null;
      return respond(await mayaSessionFeatures(req, env, user));
    }
    const content = url.pathname.match(/^\/api\/maya\/content\/([1-9]\d{0,2})$/);
    if (content && req.method === 'GET') {
      if (!mayaFeatures(env).public) throw new MayaError(503, 'FEATURE_DISABLED');
      onlyKeys(Object.fromEntries(url.searchParams), ['locale']);
      locale = localeOf(url.searchParams.get('locale'));
      const kin = Number(content[1]);
      if (kin > 260) throw new MayaError(400, 'INVALID_INPUT');
      return respond({ ...mayaSignature(kin, locale), free_summary: await freeContent(env, kin, locale) });
    }
    if (!mayaFeatures(env).member && !env.MAYA_MEMBER_TEST_USER_IDS && env.MAYA_ADMIN_PREVIEW_ENABLED !== 'true') throw new MayaError(503, 'FEATURE_DISABLED');
    if (req.method !== 'GET' && !isAllowedOrigin(req, env)) throw new MayaError(403, 'BAD_ORIGIN');
    const user = await readSession(req, env, true);
    if (!user) throw new MayaError(401, 'LOGIN_REQUIRED');
    const sessionFeatures = await mayaSessionFeatures(req, env, user);
    if (!sessionFeatures.member) throw new MayaError(503, 'FEATURE_DISABLED');
    const query = Object.fromEntries(url.searchParams);
    onlyKeys(query, ['locale', 'date']);
    locale = localeOf(query.locale);
    if (url.pathname.startsWith('/api/maya/reports') && !mayaFeatures(env).ai) throw new MayaError(503, 'AI_DISABLED');
    await limit(env, user.id, 'api', 120, 3600);
    const path = url.pathname;

    if (path === '/api/maya/admin-preview' && req.method === 'POST') {
      if (!('admin_preview' in sessionFeatures) || !sessionFeatures.admin_preview) throw new MayaError(403, 'PAYMENT_REQUIRED');
      const body = object(await readBody(req, 4096));
      onlyKeys(body, ['locale', 'product_code', 'profile_id', 'relationship_profile_id']);
      locale = localeOf(body.locale);
      if (!isMayaProduct(body.product_code)) throw new MayaError(400, 'INVALID_INPUT');
      const profile = await profileFor(env, user.id, idOf(body.profile_id));
      if (profile.role !== 'personal') throw new MayaError(400, 'INVALID_INPUT');
      const partner = body.product_code === 'MAYA_RELATIONSHIP_699'
        ? await profileFor(env, user.id, idOf(body.relationship_profile_id)) : null;
      if ((partner && partner.role !== 'relationship') || (!partner && body.relationship_profile_id !== undefined)) throw new MayaError(400, 'INVALID_INPUT');
      await limit(env, user.id, 'admin-preview', 30, 3600);
      const report = mockMayaReport(mayaForDate(profile.birth_date, locale), partner ? mayaForDate(partner.birth_date, locale) : null, locale, body.product_code);
      if (!validateMayaReport(report, report)) throw new Error('Admin preview schema failed');
      return respond({ mode: 'admin_mock_preview', persisted: false, report });
    }
    if (path === '/api/maya/calculate' && req.method === 'POST') {
      const body = object(await readBody(req, 4096));
      onlyKeys(body, ['birth_date', 'locale', 'role']);
      locale = localeOf(body.locale);
      const date = dateOf(body.birth_date);
      const role = body.role ?? 'personal';
      if (role !== 'personal' && role !== 'relationship') throw new MayaError(400, 'INVALID_INPUT');
      await limit(env, user.id, 'calculate', 20, 3600);
      const signature = mayaForDate(date, locale);
      const row = await env.DB.prepare(`
        INSERT INTO maya_kin_profiles(id, user_id, role, birth_date, kin_number, solar_seal, galactic_tone, wavespell, castle, calculation_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, role) DO UPDATE SET birth_date = excluded.birth_date, kin_number = excluded.kin_number,
          solar_seal = excluded.solar_seal, galactic_tone = excluded.galactic_tone, wavespell = excluded.wavespell,
          castle = excluded.castle, calculation_version = excluded.calculation_version, updated_at = datetime('now')
        RETURNING id, birth_date, role, kin_number, calculation_version
      `).bind(crypto.randomUUID(), user.id, role, date, signature.kin_number, signature.solar_seal_number,
        signature.tone_number, signature.wavespell, signature.castle, MAYA_CALCULATION_VERSION).first<ProfileRow>();
      if (!row) throw new Error('Maya profile persistence failed');
      return respond({ profile: { ...profilePayload(row, locale), free_summary: await freeContent(env, signature.kin_number, locale) }, blocked_rules: MAYA_BLOCKED_RULES });
    }
    if (path === '/api/maya/profile' && req.method === 'GET') {
      const rows = await env.DB.prepare('SELECT id, birth_date, role, kin_number, calculation_version FROM maya_kin_profiles WHERE user_id = ? ORDER BY role')
        .bind(user.id).all<ProfileRow>();
      return respond({ profiles: rows.results.map((row) => profilePayload(row, locale)), blocked_rules: MAYA_BLOCKED_RULES });
    }
    if (path === '/api/maya/profile' && req.method === 'DELETE') {
      const adminSchema = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='maya_admin_reports'").first();
      // Only this member's Dreamspell records are removed; orders and other systems remain untouched.
      await env.DB.batch([
        env.DB.prepare('DELETE FROM maya_reports WHERE user_id = ?').bind(user.id),
        ...(adminSchema ? [env.DB.prepare('DELETE FROM maya_admin_reports WHERE user_id = ?').bind(user.id)] : []),
        env.DB.prepare('DELETE FROM maya_kin_profiles WHERE user_id = ?').bind(user.id),
      ]);
      return respond({ deleted: true });
    }
    if (path === '/api/maya/daily' && req.method === 'GET') {
      const date = dateOf(query.date ?? taipeiDate());
      const signature = mayaForDate(date, locale);
      await env.DB.prepare(`
        INSERT OR IGNORE INTO maya_daily_energy(date, locale, kin_number, free_summary, content_version, calculation_version)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(date, locale, signature.kin_number, await freeContent(env, signature.kin_number, locale), MAYA_CONTENT_VERSION, MAYA_CALCULATION_VERSION).run();
      const row = await env.DB.prepare(`
        SELECT free_summary FROM maya_daily_energy WHERE date = ? AND locale = ? AND content_version = ? AND calculation_version = ?
      `).bind(date, locale, MAYA_CONTENT_VERSION, MAYA_CALCULATION_VERSION).first<{ free_summary: string }>();
      if (!row) throw new Error('Maya daily persistence failed');
      return respond({ daily: {
        ...signature, date, timezone: 'Asia/Taipei', free_summary: row.free_summary,
        awareness_prompt: locale === 'en' ? 'What small action would support your values today?' : '今天哪個小行動能支持你的價值觀？',
        special_day: date.slice(5) === '07-25' ? 'day_out_of_time' : date.slice(5) === '07-26' ? 'new_year' : null,
      }, blocked_rules: MAYA_BLOCKED_RULES });
    }
    if (path === '/api/maya/daily/premium' && req.method === 'GET') throw new MayaError(403, 'DAILY_PRODUCT_BLOCKED');
    if (path === '/api/maya/reports' && req.method === 'GET') {
      const rows = await env.DB.prepare(`
        SELECT r.id, r.locale, r.report_type AS product_code, r.report_status, r.created_at, o.status AS payment_status
        FROM maya_reports r JOIN orders o ON o.id = r.order_id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 100
      `).bind(user.id).all();
      const adminRows = await mayaAdminLive(req, env, user) ? (await env.DB.prepare(`
        SELECT id,locale,report_type AS product_code,report_status,created_at,'complimentary' AS payment_status
        FROM maya_admin_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 100
      `).bind(user.id).all()).results : [];
      return respond({ reports: [...rows.results, ...adminRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 100) });
    }
    const reportMatch = path.match(/^\/api\/maya\/reports\/([a-zA-Z0-9_-]{1,80})$/);
    if (reportMatch && req.method === 'GET') {
      let row = await env.DB.prepare('SELECT * FROM maya_reports WHERE id = ? AND user_id = ?').bind(reportMatch[1], user.id).first<ReportRow>();
      let table: 'maya_reports' | 'maya_admin_reports' = 'maya_reports';
      if (!row && await mayaAdminLive(req, env, user)) {
        row = await env.DB.prepare('SELECT * FROM maya_admin_reports WHERE id=? AND user_id=?').bind(reportMatch[1], user.id).first<ReportRow>();
        table = 'maya_admin_reports';
      }
      if (!row) throw new MayaError(404, 'NOT_FOUND');
      if (table === 'maya_reports') await entitlement(env, user.id, row.report_type, row.entitlement_id);
      else if (!await env.DB.prepare("SELECT id FROM orders WHERE id=? AND user_id=? AND item_type='maya_admin' AND amount=0 AND status='complimentary' AND item_id=?")
        .bind(row.order_id, user.id, row.report_type).first()) throw new MayaError(403, 'PAYMENT_REQUIRED');
      if (row.locale !== locale) {
        row = await env.DB.prepare(`SELECT * FROM ${table} WHERE order_id = ? AND user_id = ? AND locale = ?`).bind(row.order_id, user.id, locale).first<ReportRow>();
        if (!row) throw new MayaError(409, 'REPORT_LANGUAGE');
        if (table === 'maya_reports') await entitlement(env, user.id, row.report_type, row.entitlement_id);
      }
      return respond({ id: row.id, status: row.report_status, report: storedReport(row) });
    }
    if ((path === '/api/maya/reports' || path === '/api/maya/admin-reports') && req.method === 'POST') {
      const admin = path === '/api/maya/admin-reports';
      if (admin && !await mayaAdminLive(req, env, user)) throw new MayaError(403, 'PAYMENT_REQUIRED');
      const table = admin ? 'maya_admin_reports' : 'maya_reports';
      const provider = mayaAiMode(env);
      const body = object(await readBody(req, 4096));
      onlyKeys(body, ['locale', 'product_code', 'profile_id', 'relationship_profile_id', 'idempotency_key', 'entitlement_id']);
      locale = localeOf(body.locale);
      if (!isMayaProduct(body.product_code)) throw new MayaError(400, 'INVALID_INPUT');
      const product = body.product_code;
      const profile = await profileFor(env, user.id, idOf(body.profile_id));
      if (profile.role !== 'personal') throw new MayaError(400, 'INVALID_INPUT');
      const partner = product === 'MAYA_RELATIONSHIP_699'
        ? await profileFor(env, user.id, idOf(body.relationship_profile_id)) : null;
      if ((partner && partner.role !== 'relationship') || (!partner && body.relationship_profile_id !== undefined)) throw new MayaError(400, 'INVALID_INPUT');
      const key = idOf(body.idempotency_key);
      const expected = mockMayaReport(mayaForDate(profile.birth_date, locale), partner ? mayaForDate(partner.birth_date, locale) : null, locale, product);
      const template = provider === 'live' ? liveReportTemplate(expected) : expected;
      if (admin && body.entitlement_id !== undefined) throw new MayaError(400, 'INVALID_INPUT');
      const grant = admin ? `admin-${Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
        JSON.stringify([user.id, profile.id, profile.birth_date, partner?.id ?? null, partner?.birth_date ?? null, template]),
      )))).map(byte => byte.toString(16).padStart(2, '0')).join('')}` : '';
      const access = admin ? { id: grant, order_id: grant } : await entitlement(env, user.id, product, idOf(body.entitlement_id));
      const authorize = async () => {
        if (!admin) return entitlement(env, user.id, product, access.id);
        const current = await readSession(req, env, true);
        if (!current || current.id !== user.id || !await mayaAdminLive(req, env, current)) throw new MayaError(403, 'PAYMENT_REQUIRED');
        const order = await env.DB.prepare("SELECT id FROM orders WHERE id=? AND user_id=? AND item_type='maya_admin' AND item_id=? AND amount=0 AND status='complimentary'")
          .bind(access.order_id, user.id, product).first();
        if (!order) throw new MayaError(403, 'PAYMENT_REQUIRED');
        return access;
      };
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
        JSON.stringify([profile.id, partner?.id ?? null, template, access.id]),
      )))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (admin) {
        await env.DB.prepare(`INSERT OR IGNORE INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status)
          VALUES (?,?,?,?,'maya_admin',?,?,0,'complimentary')`)
          .bind(grant, `A${grant.slice(6, 25)}`, user.id, user.email, product, `Admin complimentary ${product}`).run();
        await authorize();
      }
      await env.DB.prepare(`
        INSERT OR IGNORE INTO ${table}(id, user_id, report_type, locale, profile_id, relationship_profile_id,
          order_id, entitlement_id, idempotency_key, request_fingerprint, prompt_version, calculation_version, model_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), user.id, product, locale, profile.id, partner?.id ?? null, access.order_id, access.id, key,
        fingerprint, template.prompt_version, MAYA_CALCULATION_VERSION, template.model_name).run();
      const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ? AND idempotency_key = ?`)
        .bind(user.id, key).first<ReportRow>()
        ?? await env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ? AND order_id = ? AND locale = ?`)
          .bind(user.id, access.order_id, locale).first<ReportRow>();
      if (!row || row.request_fingerprint !== fingerprint || row.order_id !== access.order_id) throw new MayaError(409, 'CONFLICT');
      if (row.report_status === 'completed') return respond({ id: row.id, status: row.report_status, report: storedReport(row) });
      if (row.attempts >= 3) throw new MayaError(409, 'RETRY_LIMIT');
      const claim = await env.DB.prepare(`
        UPDATE ${table} SET report_status = 'processing', attempts = attempts + 1,
          lease_expires_at = datetime('now', '+2 minutes'), updated_at = datetime('now')
        WHERE id = ? AND user_id = ? AND attempts < 3
          AND (report_status IN ('pending', 'failed') OR (report_status = 'processing' AND julianday(lease_expires_at) < julianday('now')))
        RETURNING id
      `).bind(row.id, user.id).first<{ id: string }>();
      if (!claim) return respond({ id: row.id, status: 'processing', report: null }, 202);
      try {
        await limit(env, user.id, 'report-generation', 6, 86400);
        const generated = await generateMayaReport(env, row.id, access.order_id, expected, async () => {
          await env.DB.prepare(`UPDATE ${table} SET lease_expires_at=datetime('now','+2 minutes') WHERE id=? AND user_id=?`)
            .bind(row.id, user.id).run();
          return authorize();
        }, table);
        if (!validateMayaReport(generated, generated)) throw new Error('AI output schema failed');
        await authorize();
        await env.DB.prepare(`
          UPDATE ${table} SET report_status = 'completed', report_content = ?, lease_expires_at = NULL,
            last_error_code = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?
        `).bind(JSON.stringify(generated), row.id, user.id).run();
      } catch (error) {
        await env.DB.prepare(`
          UPDATE ${table} SET report_status = 'failed', lease_expires_at = NULL, last_error_code = ?,
            updated_at = datetime('now') WHERE id = ? AND user_id = ?
        `).bind(error instanceof MayaAiError ? error.code : 'GENERATION_FAILED', row.id, user.id).run();
        throw error;
      }
      const completed = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND user_id=?`).bind(row.id, user.id).first<ReportRow>();
      if (!completed) throw new Error('Completed report not found');
      return respond({ id: row.id, status: 'completed', report: storedReport(completed) });
    }
    if (path === '/api/maya/entitlements' && req.method === 'GET') {
      const rows = await env.DB.prepare('SELECT id, product_code, status FROM maya_entitlements WHERE user_id = ?').bind(user.id).all<{ id: string; product_code: MayaProductCode; status: string }>();
      const active = [];
      for (const row of rows.results) {
        try {
          await entitlement(env, user.id, row.product_code, row.id);
          active.push(row);
        } catch (error) {
          if (!(error instanceof MayaError) || error.code !== 'PAYMENT_REQUIRED') throw error;
        }
      }
      return respond({ entitlements: active });
    }
    throw new MayaError(404, 'NOT_FOUND');
  } catch (error) {
    const known = error instanceof MayaError ? error
      : error instanceof MayaAiError ? new MayaError(503, error.code)
      : error instanceof SyntaxError ? new MayaError(400, 'INVALID_INPUT')
      : error instanceof PayloadTooLargeError ? new MayaError(413, 'TOO_LARGE')
      : new MayaError(500, 'INTERNAL_ERROR');
    if (known.status >= 500) console.error(JSON.stringify({ event: 'maya_api_error', code: known.code }));
    if (known.status === 403 || known.status === 429) console.warn(JSON.stringify({ event: 'maya_access_denied', code: known.code }));
    return respond({ error: (errors[known.code] ?? errors.INTERNAL_ERROR)[locale === 'en' ? 1 : 0], code: known.code }, known.status);
  }
}
