import { readSession, requireAdmin, Env, json, unauthorized, forbidden, badRequest, readBody } from './utils';

export const REVIEW_SOURCES = ['tarot', 'numerology', 'human-design', 'maya'] as const;
type ReviewSource = typeof REVIEW_SOURCES[number];

export async function ensureReviewSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS public_reviews (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      user_id TEXT,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_content TEXT NOT NULL,
      allow_public INTEGER NOT NULL DEFAULT 0,
      display_name TEXT NOT NULL DEFAULT '匿名使用者',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source, reference_id, user_id)
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_public_reviews_source ON public_reviews(source, allow_public, status, created_at DESC)'),
  ]);
}

function source(value: unknown): ReviewSource | null {
  return typeof value === 'string' && (REVIEW_SOURCES as readonly string[]).includes(value) ? value as ReviewSource : null;
}
function clean(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : ''; }
function mapReview(row: Record<string, unknown>) {
  return { id: row.id, source: row.source, referenceId: row.reference_id, rating: Number(row.rating), reviewContent: row.review_content, allowPublic: Number(row.allow_public) === 1, displayName: row.display_name || '匿名使用者', status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listPublicReviews(req: Request, env: Env, sourceParam: string): Promise<Response> {
  await ensureReviewSchema(env);
  const selected = source(sourceParam); if (!selected) return badRequest(req, env, '評價來源無效');
  const rows = await env.DB.prepare(`SELECT id, source, reference_id, rating, review_content, allow_public, display_name, status, created_at, updated_at FROM public_reviews WHERE source=? AND allow_public=1 AND status='approved' ORDER BY created_at DESC LIMIT 12`).bind(selected).all<Record<string, unknown>>();
  return json(req, env, { reviews: (rows.results || []).map(mapReview) }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}

export async function submitReview(req: Request, env: Env): Promise<Response> {
  await ensureReviewSchema(env); const user = await readSession(req, env); if (!user) return unauthorized(req, env, '請先登入');
  const body = await readBody<Record<string, unknown>>(req, 8 * 1024); const selected = source(body.source); const referenceId = clean(body.reference_id, 160); const content = clean(body.review_content, 1000); const rating = Number(body.rating);
  if (!selected || !referenceId) return badRequest(req, env, '缺少評價來源或報告識別');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest(req, env, '請選擇 1～5 顆星');
  if (selected !== 'tarot' && content.length < 10) return badRequest(req, env, '心得至少需要 10 字');
  const profile = await env.DB.prepare('SELECT name FROM profiles WHERE id=?').bind(user.id).first<{ name: string | null }>();
  const displayName = clean(profile?.name, 100); const now = new Date().toISOString(); const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO public_reviews (id,source,reference_id,user_id,rating,review_content,allow_public,display_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source,reference_id,user_id) DO UPDATE SET rating=excluded.rating,review_content=excluded.review_content,allow_public=excluded.allow_public,display_name=excluded.display_name,status='pending',updated_at=excluded.updated_at`).bind(id, selected, referenceId, user.id, rating, content, body.allow_public === true ? 1 : 0, displayName || '匿名使用者', 'pending', now, now).run();
  const row = await env.DB.prepare('SELECT * FROM public_reviews WHERE source=? AND reference_id=? AND user_id=?').bind(selected, referenceId, user.id).first<Record<string, unknown>>();
  return json(req, env, { review: row ? mapReview(row) : null });
}

async function adminGuard(req: Request, env: Env): Promise<Response | null> { const user = await readSession(req, env); if (!user) return unauthorized(req, env, '請先登入'); return await requireAdmin(req, env, user) ? null : forbidden(req, env); }
export async function adminListReviews(req: Request, env: Env): Promise<Response> { const denied = await adminGuard(req, env); if (denied) return denied; await ensureReviewSchema(env); const rows = await env.DB.prepare('SELECT * FROM public_reviews ORDER BY created_at DESC LIMIT 200').all<Record<string, unknown>>(); return json(req, env, { reviews: (rows.results || []).map(mapReview) }); }
export async function adminUpdateReview(req: Request, env: Env, id: string): Promise<Response> { const denied = await adminGuard(req, env); if (denied) return denied; await ensureReviewSchema(env); const body = await readBody<{ status?: string }>(req); if (!['pending','approved','rejected'].includes(body.status || '')) return badRequest(req, env, '狀態無效'); await env.DB.prepare('UPDATE public_reviews SET status=?,updated_at=? WHERE id=?').bind(body.status, new Date().toISOString(), id).run(); return json(req, env, { ok: true }); }
