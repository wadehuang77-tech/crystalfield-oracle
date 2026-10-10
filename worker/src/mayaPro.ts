import { json, readBody, readSession, isAllowedOrigin, type Env } from './utils';
import { mayaSessionFeatures } from './mayaFeatures';
import { MAYA_CALCULATION_VERSION, isMayaDate, isMayaLocale, mayaForDate, type MayaLocale } from '../../app/src/lib/maya';
import { MAYA_PRO_PRODUCT, MAYA_PRO_VERSION, validateMayaProReport } from '../../app/src/lib/mayaPro';
import { estimateProCost, mockMayaProReport } from './mayaProPrompt';
import { mayaProPaymentEnabled } from './mayaPayments';
import { premiumLiveEnabled, PremiumError, routePremiumReports } from './mayaPremiumLive';

interface ProRow {
  id: string; entitlement_id: string; order_id: string; profile_id: string; request_fingerprint: string;
  report_content: string | null; locale: MayaLocale; status: string; last_error_code: string | null;
}
class ProError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const errors: Record<string, [string, string]> = {
  PRO_LOCAL_ONLY: ['Pro 報告生成尚未開放；僅本地測試可生成 Mock，付款權限不會交付 Mock 報告。', 'Pro report generation is unavailable. Only local tests generate Mock content; paid access never delivers a Mock report.'],
  LOGIN_REQUIRED: ['請先登入。', 'Please sign in first.'],
  INVALID_INPUT: ['Pro 請求格式或資料不符。', 'Invalid Pro request or data.'],
  PAYMENT_REQUIRED: ['需要本人有效的 Pro 專屬權限。', 'An active, owned Pro-specific entitlement is required.'],
  NOT_FOUND: ['找不到 Pro 報告。', 'Pro report not found.'],
  CONFLICT: ['此訂單已綁定不同出生資料或報告版本。', 'This order is bound to different birth data or report inputs.'],
  PRO_COST_LIMIT: ['Pro 預估成本超過上限；未生成報告。', 'The Pro estimate exceeds its cap. No report was generated.'],
  BAD_ORIGIN: ['請求來源不受允許。', 'Request origin is not allowed.'],
  INTERNAL_ERROR: ['Pro 服務暫時無法使用，請稍後重試。', 'Pro service temporarily unavailable. Please retry.'],
};
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new ProError(400, 'INVALID_INPUT');
  return value;
}
function localEnabled(env: Env) { return env.MAYA_PRO_LOCAL_ENABLED === 'true' && env.ENV === 'dev' && env.MAYA_AI_MODE === 'mock' && env.MAYA_MEMBER_ENABLED === 'true' && env.MAYA_PUBLIC_ENABLED === 'true'; }
function memberEnabled(env: Env) { return localEnabled(env) || mayaProPaymentEnabled(env); }

export async function routeMayaPro(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  let locale: MayaLocale = url.searchParams.get('locale') === 'en' ? 'en' : 'zh-TW';
  const respond = (body: unknown, status = 200) => json(req, env, body, {
    status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
  try {
    if (url.pathname === '/api/maya/pro/config' && req.method === 'GET') return respond({
      product: MAYA_PRO_PRODUCT, enabled: memberEnabled(env), mode: localEnabled(env) ? 'local_mock_only' : 'production_entitlement',
      payment: mayaProPaymentEnabled(env), liveAi: premiumLiveEnabled(env) && mayaProPaymentEnabled(env),
    });
    if (req.method !== 'GET' && !isAllowedOrigin(req, env)) throw new ProError(403, 'BAD_ORIGIN');
    const user = await readSession(req, env, true);
    if (!user) throw new ProError(401, 'LOGIN_REQUIRED');
    if (!memberEnabled(env) || !(await mayaSessionFeatures(req, env, user)).member) throw new ProError(503, 'PRO_LOCAL_ONLY');
    if (Object.keys(Object.fromEntries(url.searchParams)).some(key => key !== 'locale')) throw new ProError(400, 'INVALID_INPUT');
    if (url.searchParams.has('locale') && !isMayaLocale(url.searchParams.get('locale'))) throw new ProError(400, 'INVALID_INPUT');
    const grants = async (entitlementId: string | null) => {
      return env.DB.prepare(`SELECT e.id,e.order_id,e.source FROM maya_pro_entitlements e JOIN orders o ON o.id=e.order_id
        WHERE (? IS NULL OR e.id=?) AND e.user_id=? AND o.user_id=e.user_id AND e.product_code=? AND o.item_id=e.product_code
          AND e.status='active'
          AND ((e.source='local_mock' AND ?=1 AND o.item_type='maya_mock')
            OR (e.source='verified_payment' AND o.item_type='maya' AND o.ecpay_trade_no IS NOT NULL
              AND EXISTS(SELECT 1 FROM maya_pro_payment_orders p WHERE p.order_id=o.id AND p.user_id=o.user_id
                AND p.product_code=o.item_id AND p.trade_no=o.ecpay_trade_no AND p.payment_state='paid')))
          AND o.status='paid' AND o.amount=699 AND o.paid_at IS NOT NULL
          AND julianday(e.starts_at)<=julianday('now') AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday('now'))
        ORDER BY e.created_at DESC LIMIT 100`)
        .bind(entitlementId, entitlementId, user.id, MAYA_PRO_PRODUCT.code, localEnabled(env) ? 1 : 0).all<{ id: string; order_id: string; source: string }>();
    };
    const access = async (entitlementId: string) => {
      const current = await readSession(req, env, true);
      if (!current || current.id !== user.id) throw new ProError(401, 'LOGIN_REQUIRED');
      const row = (await grants(entitlementId)).results[0];
      if (!row) throw new ProError(403, 'PAYMENT_REQUIRED');
      return row;
    };
    if (!localEnabled(env) && premiumLiveEnabled(env) && url.pathname.startsWith('/api/maya/pro/reports')) {
      return await routePremiumReports(req, env, user.id, MAYA_PRO_PRODUCT.code, locale, access);
    }
    if (url.pathname === '/api/maya/pro/entitlements' && req.method === 'GET') {
      return respond({ entitlements: (await grants(null)).results.map(row => ({ id: row.id, product_code: MAYA_PRO_PRODUCT.code })) });
    }
    if (url.pathname === '/api/maya/pro/reports' && req.method === 'GET') {
      const rows = await env.DB.prepare('SELECT id,locale,status,created_at FROM maya_pro_reports WHERE user_id=? AND locale=? ORDER BY created_at DESC LIMIT 100').bind(user.id, locale).all();
      return respond({ reports: rows.results });
    }
    const match = url.pathname.match(/^\/api\/maya\/pro\/reports\/([a-zA-Z0-9_-]{1,80})$/);
    if (match && req.method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM maya_pro_reports WHERE id=? AND user_id=? AND locale=?').bind(match[1], user.id, locale).first<ProRow>();
      if (!row) throw new ProError(404, 'NOT_FOUND');
      await access(row.entitlement_id);
      if (!localEnabled(env)) throw new ProError(503, 'PRO_LOCAL_ONLY');
      if (row.status !== 'completed' || !row.report_content) return respond({ id: row.id, status: row.status, report: null, reason: row.last_error_code });
      const value: unknown = JSON.parse(row.report_content);
      const kin = value && typeof value === 'object' && 'kinNumber' in value && typeof value.kinNumber === 'number' ? value.kinNumber : 0;
      if (!validateMayaProReport(value, kin, locale)) throw new Error('Stored Pro report failed schema');
      return respond({ id: row.id, status: row.status, report: value });
    }
    if (url.pathname === '/api/maya/pro/reports' && req.method === 'POST') {
      if (!localEnabled(env)) throw new ProError(503, 'PRO_LOCAL_ONLY');
      const body = await readBody(req, 4096);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ProError(400, 'INVALID_INPUT');
      const fields = body as Record<string, unknown>;
      if (Object.keys(fields).some(key => !['locale', 'profile_id', 'entitlement_id', 'product_code'].includes(key))
        || fields.product_code !== MAYA_PRO_PRODUCT.code || !isMayaLocale(fields.locale)) throw new ProError(400, 'INVALID_INPUT');
      locale = fields.locale;
      const grant = await access(id(fields.entitlement_id));
      if (grant.source !== 'local_mock') throw new ProError(503, 'PRO_LOCAL_ONLY');
      const profile = await env.DB.prepare("SELECT birth_date,kin_number,calculation_version FROM maya_kin_profiles WHERE id=? AND user_id=? AND role='personal'").bind(id(fields.profile_id), user.id)
        .first<{ birth_date: string; kin_number: number; calculation_version: string }>();
      if (!profile) throw new ProError(404, 'NOT_FOUND');
      if (!isMayaDate(profile.birth_date) || profile.birth_date.slice(5) === '02-29' || profile.calculation_version !== MAYA_CALCULATION_VERSION
        || mayaForDate(profile.birth_date, locale).kin_number !== profile.kin_number) throw new ProError(409, 'CONFLICT');
      const fingerprint = JSON.stringify([user.id, fields.profile_id, profile.birth_date, locale, MAYA_PRO_VERSION]);
      const existing = await env.DB.prepare('SELECT * FROM maya_pro_reports WHERE user_id=? AND order_id=? AND locale=? AND report_version=?')
        .bind(user.id, grant.order_id, locale, MAYA_PRO_VERSION).first<ProRow>();
      if (existing) {
        if (existing.request_fingerprint !== fingerprint) throw new ProError(409, 'CONFLICT');
        if (existing.status === 'blocked') throw new ProError(409, 'PRO_COST_LIMIT');
        const value: unknown = JSON.parse(existing.report_content ?? 'null');
        if (!validateMayaProReport(value, profile.kin_number, locale)) throw new Error('Invalid cached Pro report');
        return respond({ id: existing.id, status: existing.status, report: value });
      }
      const estimate = estimateProCost();
      const configuredCap = env.MAYA_PRO_REPORT_CAP_TWD === undefined ? estimate.capTwd : Number(env.MAYA_PRO_REPORT_CAP_TWD);
      if (!Number.isFinite(configuredCap) || configuredCap < 0 || configuredCap > estimate.capTwd) throw new Error('Invalid Pro cap');
      const allowed = estimate.estimatedTwd <= configuredCap;
      // A pure local fixture has no provider calls; atomic INSERT and unique grant/locale make retries cache-safe.
      const content = allowed ? JSON.stringify(mockMayaProReport(profile.birth_date, locale)) : null;
      await env.DB.prepare(`INSERT OR IGNORE INTO maya_pro_reports(id,user_id,entitlement_id,order_id,profile_id,locale,product_code,report_version,
        request_fingerprint,report_content,status,estimated_input_tokens,estimated_output_tokens,estimated_cost_twd,last_error_code)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), user.id, grant.id, grant.order_id, fields.profile_id, locale,
          MAYA_PRO_PRODUCT.code, MAYA_PRO_VERSION, fingerprint, content, allowed ? 'completed' : 'blocked',
          estimate.inputTokens, estimate.outputTokens, estimate.estimatedTwd, allowed ? null : 'PRO_COST_LIMIT').run();
      const row = await env.DB.prepare('SELECT * FROM maya_pro_reports WHERE user_id=? AND order_id=? AND locale=? AND report_version=?')
        .bind(user.id, grant.order_id, locale, MAYA_PRO_VERSION).first<ProRow>();
      if (!row || row.request_fingerprint !== fingerprint) throw new ProError(409, 'CONFLICT');
      await access(row.entitlement_id);
      if (row.status === 'blocked') throw new ProError(409, 'PRO_COST_LIMIT');
      const value: unknown = JSON.parse(row.report_content ?? 'null');
      if (!validateMayaProReport(value, profile.kin_number, locale)) throw new Error('Invalid generated Pro report');
      return respond({ id: row.id, status: row.status, report: value });
    }
    throw new ProError(404, 'NOT_FOUND');
  } catch (error) {
    const code = error instanceof ProError || error instanceof PremiumError ? error.code : 'INTERNAL_ERROR';
    console.error(JSON.stringify({ event: 'maya_pro_rejected', code }));
    const message = errors[code] ?? errors.INTERNAL_ERROR;
    return respond({ error: message[locale === 'en' ? 1 : 0], code }, error instanceof ProError || error instanceof PremiumError ? error.status : 500);
  }
}
