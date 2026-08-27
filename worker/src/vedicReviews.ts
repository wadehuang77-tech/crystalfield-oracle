import { verifyJwt } from './auth';
import {
  badRequest, Env, forbidden, json, readBody, readSession, requireAdmin, unauthorized,
} from './utils';

const ACCURACY = ['very_inaccurate', 'partly_accurate', 'mostly_accurate', 'very_accurate', 'exactly_me'] as const;
const SECTIONS = ['past_karma', 'life_lesson', 'soul_mission', 'talents', 'relationship', 'career', 'wealth', 'spiritual_growth', 'future_timeline'] as const;
const STATUSES = ['pending', 'approved', 'rejected'] as const;

export async function ensureVedicReviewSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vedic_astrology_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      report_id TEXT NOT NULL UNIQUE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      accuracy_rating TEXT NOT NULL,
      most_resonant_sections TEXT NOT NULL DEFAULT '[]',
      review_content TEXT NOT NULL,
      allow_public INTEGER NOT NULL DEFAULT 0,
      display_name TEXT NOT NULL DEFAULT '匿名使用者',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_vedic_reviews_public ON vedic_astrology_reviews(allow_public, status, created_at DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_vedic_reviews_user ON vedic_astrology_reviews(user_id, created_at DESC)'),
  ]);
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
}

function anonymousName(value: string | null | undefined): string {
  const name = clean(value, 100);
  if (!name) return '匿名使用者';
  const chars = Array.from(name);
  return chars.length >= 2 ? `${chars[0]}○○` : '匿名使用者';
}

async function authorizedReport(req: Request, env: Env, orderId: string, orderToken: string) {
  const payload = await verifyJwt(orderToken, env.JWT_SECRET);
  if (payload?.sub !== orderId) return null;
  return env.DB.prepare(
    `SELECT vr.id AS report_id, o.user_id
       FROM vedic_reports vr JOIN orders o ON o.id = vr.order_id
      WHERE o.id = ? AND o.status = 'paid' AND o.item_id LIKE 'vedic_%'
      LIMIT 1`
  ).bind(orderId).first<{ report_id: string; user_id: string | null }>();
}

function publicReview(row: Record<string, unknown>) {
  let sections: string[] = [];
  try { sections = JSON.parse(String(row.most_resonant_sections || '[]')); } catch {}
  return {
    id: row.id, rating: Number(row.rating), accuracyRating: row.accuracy_rating,
    mostResonantSections: sections, reviewContent: row.review_content,
    allowPublic: Number(row.allow_public) === 1, displayName: row.display_name || '匿名使用者',
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function getMyVedicReview(req: Request, env: Env): Promise<Response> {
  await ensureVedicReviewSchema(env);
  const body = await readBody<{ order_id?: string; order_token?: string }>(req);
  const orderId = clean(body.order_id, 80); const orderToken = clean(body.order_token, 2400);
  const report = await authorizedReport(req, env, orderId, orderToken);
  if (!report) return unauthorized(req, env, '報告授權失效');
  const row = await env.DB.prepare('SELECT * FROM vedic_astrology_reviews WHERE report_id = ?').bind(report.report_id).first<Record<string, unknown>>();
  return json(req, env, { review: row ? publicReview(row) : null });
}

export async function upsertVedicReview(req: Request, env: Env): Promise<Response> {
  await ensureVedicReviewSchema(env);
  const body = await readBody<Record<string, unknown>>(req, 16 * 1024);
  const orderId = clean(body.order_id, 80); const orderToken = clean(body.order_token, 2400);
  const report = await authorizedReport(req, env, orderId, orderToken);
  if (!report) return unauthorized(req, env, '報告授權失效');
  const rating = Number(body.rating);
  const accuracy = clean(body.accuracy_rating, 40);
  const content = clean(body.review_content, 1000);
  const resonant = Array.isArray(body.most_resonant_sections)
    ? [...new Set(body.most_resonant_sections.map((v) => clean(v, 40)).filter((v) => (SECTIONS as readonly string[]).includes(v)))] : [];
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest(req, env, '請選擇 1～5 顆星');
  if (!(ACCURACY as readonly string[]).includes(accuracy)) return badRequest(req, env, '請選擇精準度');
  if (content.length < 10 || content.length > 1000) return badRequest(req, env, '心得需為 10～1000 字');
  const session = await readSession(req, env);
  const userId = report.user_id || session?.id || null;
  let name: string | null = null;
  if (userId) name = (await env.DB.prepare('SELECT name FROM profiles WHERE id = ?').bind(userId).first<{ name: string | null }>())?.name || null;
  const now = new Date().toISOString(); const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO vedic_astrology_reviews
    (id,user_id,report_id,rating,accuracy_rating,most_resonant_sections,review_content,allow_public,display_name,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)
    ON CONFLICT(report_id) DO UPDATE SET rating=excluded.rating, accuracy_rating=excluded.accuracy_rating,
      most_resonant_sections=excluded.most_resonant_sections, review_content=excluded.review_content,
      allow_public=excluded.allow_public, display_name=excluded.display_name, status='pending', updated_at=excluded.updated_at`
  ).bind(id, userId, report.report_id, rating, accuracy, JSON.stringify(resonant), content, body.allow_public === true ? 1 : 0, anonymousName(name), now, now).run();
  const row = await env.DB.prepare('SELECT * FROM vedic_astrology_reviews WHERE report_id = ?').bind(report.report_id).first<Record<string, unknown>>();
  return json(req, env, { review: publicReview(row || {}) });
}

export async function listPublicVedicReviews(req: Request, env: Env): Promise<Response> {
  await ensureVedicReviewSchema(env);
  const rows = await env.DB.prepare(`SELECT * FROM vedic_astrology_reviews WHERE allow_public=1 AND status='approved' ORDER BY created_at DESC LIMIT 12`).all<Record<string, unknown>>();
  return json(req, env, { reviews: (rows.results || []).map(publicReview) }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}

async function adminGuard(req: Request, env: Env): Promise<Response | null> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env);
  return await requireAdmin(req, env, user) ? null : forbidden(req, env);
}

export async function adminListVedicReviews(req: Request, env: Env, url: URL): Promise<Response> {
  const denied = await adminGuard(req, env); if (denied) return denied;
  await ensureVedicReviewSchema(env);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1); const limit = 20; const offset = (page - 1) * limit;
  const status = clean(url.searchParams.get('status'), 20);
  const where = (STATUSES as readonly string[]).includes(status) ? 'WHERE r.status = ?' : '';
  const binds = where ? [status] : [];
  const [rows, count] = await Promise.all([
    env.DB.prepare(`SELECT r.*, p.email, p.name FROM vedic_astrology_reviews r LEFT JOIN profiles p ON p.id=r.user_id ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all<Record<string, unknown>>(),
    env.DB.prepare(`SELECT COUNT(*) total FROM vedic_astrology_reviews r ${where}`).bind(...binds).first<{ total: number }>(),
  ]);
  return json(req, env, { reviews: (rows.results || []).map((r) => ({ ...publicReview(r), user: r.name || r.email || '匿名使用者' })), pagination: { page, limit, total: Number(count?.total || 0), totalPages: Math.max(1, Math.ceil(Number(count?.total || 0) / limit)) } });
}

export async function adminVedicReviewStats(req: Request, env: Env): Promise<Response> {
  const denied = await adminGuard(req, env); if (denied) return denied;
  await ensureVedicReviewSchema(env);
  const summary = await env.DB.prepare(`SELECT COUNT(*) total, COALESCE(AVG(rating),0) average, SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END) five, SUM(CASE WHEN accuracy_rating IN ('very_accurate','exactly_me') THEN 1 ELSE 0 END) accurate FROM vedic_astrology_reviews`).first<Record<string, number>>();
  const resonance = await env.DB.prepare(`SELECT j.value section, COUNT(*) count FROM vedic_astrology_reviews r, json_each(r.most_resonant_sections) j GROUP BY j.value ORDER BY count DESC`).all<{ section: string; count: number }>();
  const total = Number(summary?.total || 0);
  return json(req, env, { total, averageRating: Number(summary?.average || 0), fiveStarPercent: total ? Number(summary?.five || 0) * 100 / total : 0, highAccuracyPercent: total ? Number(summary?.accurate || 0) * 100 / total : 0, resonance: resonance.results || [] });
}

export async function adminUpdateVedicReview(req: Request, env: Env, id: string): Promise<Response> {
  const denied = await adminGuard(req, env); if (denied) return denied;
  await ensureVedicReviewSchema(env);
  const body = await readBody<{ status?: string }>(req); const status = clean(body.status, 20);
  if (!(STATUSES as readonly string[]).includes(status)) return badRequest(req, env, '狀態無效');
  await env.DB.prepare('UPDATE vedic_astrology_reviews SET status=?, updated_at=? WHERE id=?').bind(status, new Date().toISOString(), id).run();
  return json(req, env, { ok: true });
}

export async function adminDeleteVedicReview(req: Request, env: Env, id: string): Promise<Response> {
  const denied = await adminGuard(req, env); if (denied) return denied;
  await ensureVedicReviewSchema(env);
  await env.DB.prepare('DELETE FROM vedic_astrology_reviews WHERE id=?').bind(id).run();
  return json(req, env, { ok: true });
}
