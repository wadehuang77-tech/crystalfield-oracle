import { getMembershipSummary } from './subscriptions';
import { Env, forbidden, json, readSession, unauthorized } from './utils';

export type TarotEntitlementStatus =
  | 'login_required'
  | 'trial_available'
  | 'trialing'
  | 'active'
  | 'canceled_active'
  | 'expired'
  | 'payment_pending'
  | 'payment_failed';

interface TrialRow {
  user_id: string;
  google_sub: string | null;
  email: string;
  tarot_trial_started_at: string | null;
  tarot_trial_ends_at: string | null;
  tarot_trial_used_at: string | null;
}

interface MembershipLike {
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
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used_at: string | null;
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

export function deriveTarotEntitlement(
  trial: Pick<TrialRow, 'tarot_trial_started_at' | 'tarot_trial_ends_at' | 'tarot_trial_used_at'> | null,
  membership: MembershipLike | null,
  nowMs = Date.now(),
): TarotEntitlement {
  const trialStartedAt = iso(trial?.tarot_trial_started_at);
  const trialEndsAt = iso(trial?.tarot_trial_ends_at);
  const trialUsedAt = iso(trial?.tarot_trial_used_at);
  const periodEnd = iso(membership?.current_period_end ?? membership?.current_period_ends_at);
  const paidAccess = membership?.is_active === true && !!periodEnd && Date.parse(periodEnd) > nowMs;
  const cancelled = membership?.status === 'cancelling'
    || membership?.status === 'cancelled'
    || membership?.cancel_at_period_end === true;

  let status: TarotEntitlementStatus;
  let accessUntil: string | null = null;
  if (paidAccess) {
    status = cancelled ? 'canceled_active' : 'active';
    accessUntil = periodEnd;
  } else if (trialEndsAt && Date.parse(trialEndsAt) > nowMs) {
    status = 'trialing';
    accessUntil = trialEndsAt;
  } else if (!trialUsedAt && !trialStartedAt) {
    status = 'trial_available';
  } else if (membership?.status === 'pending') {
    status = 'payment_pending';
  } else if (membership?.status === 'payment_failed') {
    status = 'payment_failed';
  } else status = 'expired';

  return {
    status,
    has_access: status === 'trialing' || status === 'active' || status === 'canceled_active',
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    trial_used_at: trialUsedAt,
    subscription_started_at: iso(membership?.started_at),
    current_period_end: periodEnd,
    access_until: accessUntil,
    payment_status: membership?.latest_payment_status ?? membership?.status ?? null,
    last_payment_at: iso(membership?.last_payment_at),
  };
}

async function getTrialRow(env: Env, userId: string): Promise<TrialRow | null> {
  return env.DB.prepare(
    `SELECT m.user_id, m.google_sub, lower(trim(p.email)) AS email,
            m.tarot_trial_started_at, m.tarot_trial_ends_at, m.tarot_trial_used_at
       FROM profile_member_metadata m
       JOIN profiles p ON p.id = m.user_id
      WHERE m.user_id = ?
      LIMIT 1`,
  ).bind(userId).first<TrialRow>();
}

export async function getTarotEntitlement(env: Env, userId: string): Promise<TarotEntitlement> {
  const [trial, membership] = await Promise.all([
    getTrialRow(env, userId),
    getMembershipSummary(env, userId),
  ]);
  const entitlement = deriveTarotEntitlement(trial, membership);
  if (!trial?.google_sub && !entitlement.has_access) {
    return { ...entitlement, status: 'login_required', has_access: false };
  }
  return entitlement;
}

export async function hasTarotAccess(env: Env, userId: string): Promise<boolean> {
  return (await getTarotEntitlement(env, userId)).has_access;
}

export async function getMyTarotEntitlement(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return json(req, env, {
    entitlement: {
      status: 'login_required', has_access: false,
      trial_started_at: null, trial_ends_at: null, trial_used_at: null,
      subscription_started_at: null, current_period_end: null, access_until: null,
      payment_status: null, last_payment_at: null,
    },
  });
  return json(req, env, { entitlement: await getTarotEntitlement(env, user.id) });
}

export async function startMyTarotTrial(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env, '請先使用 Google 帳號登入');

  const before = await getTrialRow(env, user.id);
  if (!before?.google_sub) return forbidden(req, env, '免費試用需要使用 Google 帳號登入');

  const identityHistory = await env.DB.prepare(
    `SELECT m.user_id
       FROM profile_member_metadata m
       JOIN profiles p ON p.id = m.user_id
      WHERE m.user_id <> ?
        AND (m.google_sub = ? OR lower(trim(p.email)) = ?)
        AND (m.tarot_trial_used_at IS NOT NULL OR m.tarot_trial_started_at IS NOT NULL)
      LIMIT 1`,
  ).bind(user.id, before.google_sub, before.email).first<{ user_id: string }>();
  if (identityHistory) return forbidden(req, env, '此 Google 帳號或 Email 已使用過塔羅免費試用');

  const existingEntitlement = await getTarotEntitlement(env, user.id);
  if (existingEntitlement.status === 'active' || existingEntitlement.status === 'canceled_active') {
    return json(req, env, { entitlement: existingEntitlement, trial_created: false });
  }

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const result = await env.DB.prepare(
    `UPDATE profile_member_metadata
        SET tarot_trial_started_at = ?, tarot_trial_ends_at = ?, tarot_trial_used_at = ?, updated_at = ?
      WHERE user_id = ?
        AND google_sub IS NOT NULL
        AND tarot_trial_started_at IS NULL
        AND tarot_trial_used_at IS NULL`,
  ).bind(
    startedAt.toISOString(), endsAt.toISOString(), startedAt.toISOString(), startedAt.toISOString(), user.id,
  ).run();

  const entitlement = await getTarotEntitlement(env, user.id);
  return json(req, env, {
    entitlement,
    trial_created: (result.meta.changes ?? 0) === 1,
  });
}

export function tarotAccessDenied(req: Request, env: Env, entitlement: TarotEntitlement): Response {
  const code = entitlement.status === 'trial_available'
    ? 'TAROT_TRIAL_AVAILABLE'
    : entitlement.status === 'payment_pending'
      ? 'TAROT_PAYMENT_PENDING'
      : entitlement.status === 'payment_failed'
        ? 'TAROT_PAYMENT_FAILED'
        : 'TAROT_SUBSCRIPTION_REQUIRED';
  return json(req, env, { error: '目前沒有可用的塔羅全館權限', code, entitlement }, { status: 403 });
}
