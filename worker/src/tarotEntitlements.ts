import { getMembershipSummary } from './subscriptions';
import { isTarotSubscriptionPlan, tarotSubscriptionPlan, tarotTierForSpread } from './tarotCatalog';
import { Env, forbidden, json, readSession, unauthorized } from './utils';

export const TAROT_FREE_READING_LIMIT = 3;

export type TarotEntitlementStatus =
  | 'login_required'
  | 'free_available'
  | 'active'
  | 'canceled_active'
  | 'expired'
  | 'payment_pending'
  | 'payment_failed';

interface MembershipLike {
  item_id?: string;
  plan_code?: string | null;
  status?: string | null;
  is_active?: boolean;
  cancel_at_period_end?: boolean;
  started_at?: string | null;
  current_period_end?: string | null;
  current_period_ends_at?: string | null;
  last_payment_at?: string | null;
  latest_payment_status?: string | null;
}

export interface TarotEntitlement {
  status: TarotEntitlementStatus;
  has_access: boolean;
  plan_id: string | null;
  plan_tier: number;
  free_readings_used: number;
  free_readings_remaining: number;
  trial_started_at: null;
  trial_ends_at: null;
  trial_used_at: null;
  subscription_started_at: string | null;
  current_period_end: string | null;
  access_until: string | null;
  payment_status: string | null;
  last_payment_at: string | null;
}

function iso(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function tarotPlanTier(planId: string | null | undefined): number {
  if (!planId || !isTarotSubscriptionPlan(planId)) return 0;
  return tarotSubscriptionPlan(planId)?.tier ?? 0;
}

export function deriveTarotEntitlement(
  membership: MembershipLike | null,
  freeReadingsUsed = 0,
  nowMs = Date.now(),
): TarotEntitlement {
  const used = Math.max(0, Math.min(TAROT_FREE_READING_LIMIT, Math.floor(freeReadingsUsed)));
  const planId = membership?.plan_code ?? membership?.item_id ?? null;
  const planTier = tarotPlanTier(planId);
  const periodEnd = iso(membership?.current_period_end ?? membership?.current_period_ends_at);
  const paidAccess = membership?.is_active === true && !!periodEnd && Date.parse(periodEnd) > nowMs && planTier > 0;
  const cancelled = membership?.status === 'cancelling'
    || membership?.status === 'cancelled'
    || membership?.cancel_at_period_end === true;
  const status: TarotEntitlementStatus = paidAccess
    ? cancelled ? 'canceled_active' : 'active'
    : membership?.status === 'pending' ? 'payment_pending'
      : membership?.status === 'payment_failed' ? 'payment_failed'
        : used < TAROT_FREE_READING_LIMIT ? 'free_available' : 'expired';

  return {
    status,
    has_access: paidAccess || used < TAROT_FREE_READING_LIMIT,
    plan_id: paidAccess ? planId : null,
    plan_tier: paidAccess ? planTier : 0,
    free_readings_used: used,
    free_readings_remaining: Math.max(0, TAROT_FREE_READING_LIMIT - used),
    trial_started_at: null,
    trial_ends_at: null,
    trial_used_at: null,
    subscription_started_at: iso(membership?.started_at),
    current_period_end: periodEnd,
    access_until: paidAccess ? periodEnd : null,
    payment_status: membership?.latest_payment_status ?? membership?.status ?? null,
    last_payment_at: iso(membership?.last_payment_at),
  };
}

async function getFreeReadingsUsed(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM tarot_free_readings WHERE user_id = ?')
    .bind(userId).first<{ count: number }>();
  return Math.max(0, Math.min(TAROT_FREE_READING_LIMIT, Number(row?.count ?? 0)));
}

export async function getTarotEntitlement(env: Env, userId: string): Promise<TarotEntitlement> {
  const [membership, used] = await Promise.all([
    getMembershipSummary(env, userId),
    getFreeReadingsUsed(env, userId),
  ]);
  return deriveTarotEntitlement(membership, used);
}

export async function authorizeTarotSpread(
  env: Env,
  userId: string,
  spreadId: string,
  readingId: string,
): Promise<{ allowed: boolean; source: 'free' | 'subscription'; entitlement: TarotEntitlement }> {
  const entitlement = await getTarotEntitlement(env, userId);
  if (entitlement.plan_tier >= tarotTierForSpread(spreadId)) {
    return { allowed: true, source: 'subscription', entitlement };
  }

  const existing = await env.DB.prepare(
    'SELECT spread_id FROM tarot_free_readings WHERE user_id = ? AND reading_id = ?',
  ).bind(userId, readingId).first<{ spread_id: string }>();
  if (existing) {
    return {
      allowed: existing.spread_id === spreadId,
      source: 'free',
      entitlement,
    };
  }
  if (entitlement.free_readings_remaining <= 0) {
    return { allowed: false, source: 'free', entitlement };
  }

  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(
    `INSERT INTO tarot_free_readings (user_id, reading_id, spread_id, created_at)
     SELECT ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM tarot_free_readings WHERE user_id = ?) < ?
     ON CONFLICT(user_id, reading_id) DO NOTHING`,
  ).bind(userId, readingId, spreadId, now, userId, TAROT_FREE_READING_LIMIT).run();
  if ((inserted.meta.changes ?? 0) === 0) {
    const duplicate = await env.DB.prepare(
      'SELECT spread_id FROM tarot_free_readings WHERE user_id = ? AND reading_id = ?',
    ).bind(userId, readingId).first<{ spread_id: string }>();
    if (duplicate) return { allowed: duplicate.spread_id === spreadId, source: 'free', entitlement };
    return { allowed: false, source: 'free', entitlement };
  }

  await env.DB.prepare(
    `INSERT INTO profile_member_metadata (user_id, tarot_usage_count, created_at, updated_at)
     VALUES (?, (SELECT COUNT(*) FROM tarot_free_readings WHERE user_id = ?), ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       tarot_usage_count = excluded.tarot_usage_count,
       updated_at = excluded.updated_at`,
  ).bind(userId, userId, now, now).run();
  const updated = await getTarotEntitlement(env, userId);
  return { allowed: true, source: 'free', entitlement: updated };
}

export async function getMyTarotEntitlement(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return json(req, env, {
    entitlement: { ...deriveTarotEntitlement(null, 0), status: 'login_required' as const, has_access: false },
  });
  return json(req, env, { entitlement: await getTarotEntitlement(env, user.id) });
}

export async function startMyTarotTrial(req: Request, env: Env): Promise<Response> {
  void env;
  if (!await readSession(req, env)) return unauthorized(req, env, '請先登入');
  return forbidden(req, env, '塔羅已改為 3 次免費占卜，無須啟用試用');
}

export function tarotAccessDenied(req: Request, env: Env, entitlement: TarotEntitlement): Response {
  void env;
  const code = entitlement.status === 'payment_pending'
    ? 'TAROT_PAYMENT_PENDING'
    : entitlement.status === 'payment_failed'
      ? 'TAROT_PAYMENT_FAILED'
      : entitlement.free_readings_remaining > 0 || entitlement.plan_tier > 0
        ? 'TAROT_PLAN_UPGRADE_REQUIRED'
        : 'TAROT_FREE_QUOTA_EXHAUSTED';
  return json(req, env, { error: '免費占卜次數已用完或目前方案不包含此牌陣', code, entitlement }, { status: 403 });
}
