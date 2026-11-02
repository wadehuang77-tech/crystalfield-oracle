import { getMembershipSummary } from './subscriptions';
import { isTarotSubscriptionPlan, tarotSubscriptionPlan, tarotTierForSpread, TAROT_SPREADS } from './tarotCatalog';
import { clientIp, Env, forbidden, json, readSession, unauthorized } from './utils';

export const TAROT_FREE_READING_LIMIT = 7;

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
    plan_id: paidAccess || status === 'payment_pending' ? planId : null,
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
  // Authenticated single-card readings are unlimited and never consume quota.
  if (TAROT_SPREADS[spreadId]?.card_count === 1) {
    return { allowed: true, source: 'free', entitlement };
  }
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
  if (!user) return json(req, env, { entitlement: await getGuestTarotEntitlement(req, env) });
  await claimGuestTarotReadings(req, env, user.id);
  return json(req, env, { entitlement: await getTarotEntitlement(env, user.id) });
}

// Visitors without an account share TAROT_FREE_READING_LIMIT multi-card readings per IP address. Their readings
// are kept in the anonymous unlock table (id `tarot-guest:<ip key>:<reading>`) and move to the member's own quota
// the first time a member signs in from that address. The reading id is kept, so reopening that same reading after
// sign-in (to see the full interpretation) does not use another free reading.
const GUEST_ID_PREFIX = 'tarot-guest:';
// All ids of one visitor share the prefix `tarot-guest:<key>:`; ':' + 1 is ';', so this range selects exactly them.
const guestRange = (key: string) => [`${GUEST_ID_PREFIX}${key}:`, `${GUEST_ID_PREFIX}${key};`] as const;

async function guestKey(req: Request, env: Env): Promise<string | null> {
  const ip = clientIp(req).split(',')[0]?.trim();
  if (!ip || ip === 'unknown') return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`tarot-guest:${ip}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function guestReadingsUsed(env: Env, key: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM multi_spread_free_unlocks WHERE id >= ? AND id < ?')
    .bind(...guestRange(key)).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

function guestEntitlement(used: number): TarotEntitlement {
  const entitlement = deriveTarotEntitlement(null, used);
  return entitlement.free_readings_remaining > 0
    ? entitlement
    : { ...entitlement, status: 'login_required', has_access: false };
}

async function getGuestTarotEntitlement(req: Request, env: Env): Promise<TarotEntitlement> {
  const key = await guestKey(req, env);
  return guestEntitlement(key ? await guestReadingsUsed(env, key) : TAROT_FREE_READING_LIMIT);
}

async function authorizeTarotGuestSpread(
  req: Request,
  env: Env,
  spreadId: string,
  readingId: string,
): Promise<{ allowed: boolean; source: 'free'; entitlement: TarotEntitlement }> {
  const key = await guestKey(req, env);
  if (!key || readingId.includes(':')) return { allowed: false, source: 'free', entitlement: guestEntitlement(TAROT_FREE_READING_LIMIT) };
  // Single-card readings stay unlimited, as they are for members.
  if (TAROT_SPREADS[spreadId]?.card_count === 1) {
    return { allowed: true, source: 'free', entitlement: guestEntitlement(await guestReadingsUsed(env, key)) };
  }
  const id = `${GUEST_ID_PREFIX}${key}:${readingId}`;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO multi_spread_free_unlocks (id, email_hash, spread_id, created_at)
     SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM multi_spread_free_unlocks WHERE id >= ? AND id < ?) < ?`,
  ).bind(id, id, spreadId, new Date().toISOString(), ...guestRange(key), TAROT_FREE_READING_LIMIT).run();
  const row = await env.DB.prepare('SELECT spread_id FROM multi_spread_free_unlocks WHERE id = ?')
    .bind(id).first<{ spread_id: string }>();
  return { allowed: row?.spread_id === spreadId, source: 'free', entitlement: guestEntitlement(await guestReadingsUsed(env, key)) };
}

async function claimGuestTarotReadings(req: Request, env: Env, userId: string): Promise<void> {
  const key = await guestKey(req, env);
  if (!key) return;
  // Unclaimed rows keep email_hash = id; claiming rewrites it, so each guest reading moves to one member only.
  const claimed = await env.DB.prepare(
    `UPDATE multi_spread_free_unlocks SET email_hash = 'claimed:' || ? || ':' || id
      WHERE id >= ? AND id < ? AND email_hash = id
      RETURNING id, spread_id, created_at`,
  ).bind(userId, ...guestRange(key)).all<{ id: string; spread_id: string; created_at: string }>();
  if (!claimed.results.length) return;
  const now = new Date().toISOString();
  await env.DB.batch([
    ...claimed.results.map((row) => env.DB.prepare(
      'INSERT OR IGNORE INTO tarot_free_readings (user_id, reading_id, spread_id, created_at) VALUES (?, ?, ?, ?)',
    ).bind(userId, row.id.slice(guestRange(key)[0].length), row.spread_id, row.created_at)),
    env.DB.prepare(
      `INSERT INTO profile_member_metadata (user_id, tarot_usage_count, created_at, updated_at)
       VALUES (?, (SELECT COUNT(*) FROM tarot_free_readings WHERE user_id = ?), ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         tarot_usage_count = excluded.tarot_usage_count,
         updated_at = excluded.updated_at`,
    ).bind(userId, userId, now, now),
  ]);
}

/** Authorizes a free tarot reading for a member, or for a visitor against the per-IP guest quota. */
export async function authorizeTarotReading(req: Request, env: Env, spreadId: string, readingId: string) {
  const session = await readSession(req, env);
  if (!session) return { ...await authorizeTarotGuestSpread(req, env, spreadId, readingId), guest: true };
  await claimGuestTarotReadings(req, env, session.id);
  return { ...await authorizeTarotSpread(env, session.id, spreadId, readingId), guest: false };
}

export function tarotReadingDenied(req: Request, env: Env, access: { guest: boolean; entitlement: TarotEntitlement }): Response {
  if (!access.guest) return tarotAccessDenied(req, env, access.entitlement);
  return json(req, env, {
    error: '免費占卜次數已用完，登入或選擇方案即可繼續', code: 'TAROT_LOGIN_REQUIRED', entitlement: access.entitlement,
  }, { status: 401 });
}

export async function startMyTarotTrial(req: Request, env: Env): Promise<Response> {
  void env;
  if (!await readSession(req, env)) return unauthorized(req, env, '請先登入');
  return forbidden(req, env, '塔羅已改為 7 次免費占卜，無須啟用試用');
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
