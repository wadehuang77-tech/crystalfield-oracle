import {
  creditPeriodAction,
  queryCreditPeriodInfo,
  type CreditPeriodQueryResult,
} from './ecpay';
import {
  badRequest,
  Env,
  json,
  readSession,
  unauthorized,
} from './utils';

const MEMBERSHIP_ITEM_ID = 'membership_monthly';
const MEMBERSHIP_PERIOD_TYPE = 'M';
const MEMBERSHIP_FREQUENCY = 1;
const MEMBERSHIP_EXEC_TIMES = 99;

interface SubscriptionRow {
  id: string;
  user_id: string;
  order_id: string;
  merchant_trade_no: string;
  item_id: string;
  amount: number;
  period_type: string;
  frequency: number;
  exec_times: number;
  status: string;
  ecpay_exec_status: string | null;
  total_success_times: number;
  total_success_amount: number;
  first_trade_no: string | null;
  first_gwsr: string | null;
  first_auth_code: string | null;
  card6no: string | null;
  card4no: string | null;
  first_paid_at: string | null;
  last_paid_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  cancel_requested_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  last_charge_status: string | null;
  last_error_message: string | null;
  last_synced_at: string | null;
  raw_last_query: string | null;
  created_at: string;
  updated_at: string;
}

function parseEcpayDateString(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi, +se);
  return new Date(utcMs).toISOString();
}

function addPeriod(startIso: string, periodType: string, frequency: number): string {
  const start = new Date(startIso);
  const next = new Date(start.getTime());
  switch (periodType) {
    case 'D':
      next.setUTCDate(next.getUTCDate() + frequency);
      break;
    case 'Y':
      next.setUTCFullYear(next.getUTCFullYear() + frequency);
      break;
    case 'M':
    default:
      next.setUTCMonth(next.getUTCMonth() + frequency);
      break;
  }
  return next.toISOString();
}

function toInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deriveStatus(row: SubscriptionRow): {
  status: 'pending' | 'active' | 'cancelling' | 'cancelled' | 'completed' | 'past_due' | 'expired';
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
} {
  const now = Date.now();
  const periodEndMs = row.current_period_ends_at ? Date.parse(row.current_period_ends_at) : NaN;
  const hasActiveWindow = Number.isFinite(periodEndMs) && periodEndMs > now;
  const cancelRequested = !!row.cancel_requested_at || row.ecpay_exec_status === '0';

  if (row.status === 'pending') {
    return { status: 'pending', isActive: false, cancelAtPeriodEnd: false };
  }
  if (row.status === 'completed') {
    return { status: 'completed', isActive: false, cancelAtPeriodEnd: false };
  }
  if (cancelRequested && hasActiveWindow) {
    return { status: 'cancelling', isActive: true, cancelAtPeriodEnd: true };
  }
  if (cancelRequested && !hasActiveWindow) {
    return { status: 'cancelled', isActive: false, cancelAtPeriodEnd: true };
  }
  if (hasActiveWindow) {
    return { status: 'active', isActive: true, cancelAtPeriodEnd: false };
  }
  if (row.last_charge_status && row.last_charge_status !== '1') {
    return { status: 'past_due', isActive: false, cancelAtPeriodEnd: false };
  }
  if (row.status === 'cancelled') {
    return { status: 'cancelled', isActive: false, cancelAtPeriodEnd: false };
  }
  return { status: 'expired', isActive: false, cancelAtPeriodEnd: false };
}

function buildSummary(row: SubscriptionRow | null) {
  if (!row) return null;
  const derived = deriveStatus(row);
  return {
    id: row.id,
    item_id: row.item_id,
    amount: row.amount,
    period_type: row.period_type,
    frequency: row.frequency,
    exec_times: row.exec_times,
    status: derived.status,
    is_active: derived.isActive,
    cancel_at_period_end: derived.cancelAtPeriodEnd,
    total_success_times: row.total_success_times,
    total_success_amount: row.total_success_amount,
    current_period_started_at: row.current_period_started_at,
    current_period_ends_at: row.current_period_ends_at,
    first_paid_at: row.first_paid_at,
    last_paid_at: row.last_paid_at,
    cancel_requested_at: row.cancel_requested_at,
    cancelled_at: row.cancelled_at,
    completed_at: row.completed_at,
    last_charge_status: row.last_charge_status,
    last_error_message: row.last_error_message,
    card_last4: row.card4no,
    card_first6: row.card6no,
    merchant_trade_no: row.merchant_trade_no,
    last_synced_at: row.last_synced_at,
  };
}

export async function getLatestMembershipRow(env: Env, userId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT * FROM subscriptions
      WHERE user_id = ? AND item_id = ?
      ORDER BY created_at DESC
      LIMIT 1`
  ).bind(userId, MEMBERSHIP_ITEM_ID).first<SubscriptionRow>();
}

export async function getMembershipSummary(env: Env, userId: string) {
  const row = await getLatestMembershipRow(env, userId);
  return buildSummary(row);
}

export async function hasActiveMembership(env: Env, userId: string): Promise<boolean> {
  const row = await getLatestMembershipRow(env, userId);
  return !!row && buildSummary(row)?.is_active === true;
}

export async function createPendingMembershipSubscription(env: Env, input: {
  userId: string;
  orderId: string;
  merchantTradeNo: string;
  amount: number;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO subscriptions
      (id, user_id, order_id, merchant_trade_no, item_id, amount, period_type, frequency, exec_times, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    input.userId,
    input.orderId,
    input.merchantTradeNo,
    MEMBERSHIP_ITEM_ID,
    input.amount,
    MEMBERSHIP_PERIOD_TYPE,
    MEMBERSHIP_FREQUENCY,
    MEMBERSHIP_EXEC_TIMES,
  ).run();
}

async function upsertSubscriptionCharge(env: Env, subscriptionId: string, cycleIndex: number, params: Record<string, string>): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO subscription_charges
      (id, subscription_id, cycle_index, amount, rtn_code, rtn_msg, trade_no, gwsr, auth_code, process_date, raw_callback, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(subscription_id, cycle_index) DO UPDATE SET
       amount = excluded.amount,
       rtn_code = excluded.rtn_code,
       rtn_msg = excluded.rtn_msg,
       trade_no = excluded.trade_no,
       gwsr = excluded.gwsr,
       auth_code = excluded.auth_code,
       process_date = excluded.process_date,
       raw_callback = excluded.raw_callback`
  ).bind(
    crypto.randomUUID(),
    subscriptionId,
    cycleIndex,
    toInt(params.Amount ?? params.TradeAmt ?? params.amount),
    String(params.RtnCode ?? ''),
    params.RtnMsg ?? null,
    params.TradeNo ?? null,
    params.gwsr ?? null,
    params.AuthCode ?? params.auth_code ?? null,
    parseEcpayDateString(params.ProcessDate ?? params.process_date),
    JSON.stringify(params),
  ).run();
}

export async function markMembershipFirstPaymentPaid(env: Env, order: {
  id: string;
  user_id: string | null;
  merchant_trade_no: string;
  amount: number;
}, params: Record<string, string>): Promise<void> {
  if (!order.user_id) return;
  const row = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE merchant_trade_no = ? LIMIT 1`
  ).bind(order.merchant_trade_no).first<SubscriptionRow>();
  if (!row) return;

  const paidAt = parseEcpayDateString(params.PaymentDate ?? params.ProcessDate ?? params.process_date) ?? new Date().toISOString();
  const currentPeriodEndsAt = addPeriod(paidAt, row.period_type, row.frequency);
  const totalSuccessTimes = Math.max(1, row.total_success_times);
  const totalSuccessAmount = Math.max(order.amount, row.total_success_amount);

  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'active',
            ecpay_exec_status = '1',
            total_success_times = ?,
            total_success_amount = ?,
            first_trade_no = COALESCE(first_trade_no, ?),
            first_gwsr = COALESCE(first_gwsr, ?),
            first_auth_code = COALESCE(first_auth_code, ?),
            card6no = COALESCE(card6no, ?),
            card4no = COALESCE(card4no, ?),
            first_paid_at = COALESCE(first_paid_at, ?),
            last_paid_at = ?,
            current_period_started_at = ?,
            current_period_ends_at = ?,
            last_charge_status = '1',
            last_error_message = NULL,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(
    totalSuccessTimes,
    totalSuccessAmount,
    params.TradeNo ?? null,
    params.gwsr ?? null,
    params.AuthCode ?? null,
    params.card6no ?? null,
    params.card4no ?? null,
    paidAt,
    paidAt,
    paidAt,
    currentPeriodEndsAt,
    row.id,
  ).run();

  await upsertSubscriptionCharge(env, row.id, 1, {
    ...params,
    Amount: String(order.amount),
    ProcessDate: params.PaymentDate ?? params.ProcessDate ?? '',
  });
}

export async function handleMembershipRecurringCallback(env: Env, params: Record<string, string>): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE merchant_trade_no = ? LIMIT 1`
  ).bind(params.MerchantTradeNo ?? '').first<SubscriptionRow>();
  if (!row) return;

  const cycleIndex = Math.max(1, toInt(params.TotalSuccessTimes, row.total_success_times));
  const paidAt = parseEcpayDateString(params.ProcessDate ?? params.process_date) ?? new Date().toISOString();
  const currentPeriodEndsAt = addPeriod(paidAt, row.period_type, row.frequency);
  const execStatus = params.ExecStatus ?? row.ecpay_exec_status ?? '1';
  const rtnCode = String(params.RtnCode ?? '');
  const status =
    execStatus === '2' ? 'completed' :
    execStatus === '0' ? 'cancelled' :
    rtnCode === '1' ? 'active' : row.status;

  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = ?,
            ecpay_exec_status = ?,
            total_success_times = ?,
            total_success_amount = ?,
            last_paid_at = CASE WHEN ? = '1' THEN ? ELSE last_paid_at END,
            current_period_started_at = CASE WHEN ? = '1' THEN ? ELSE current_period_started_at END,
            current_period_ends_at = CASE WHEN ? = '1' THEN ? ELSE current_period_ends_at END,
            completed_at = CASE WHEN ? = '2' THEN COALESCE(completed_at, ?) ELSE completed_at END,
            cancelled_at = CASE WHEN ? = '0' THEN COALESCE(cancelled_at, datetime('now')) ELSE cancelled_at END,
            last_charge_status = ?,
            last_error_message = CASE WHEN ? = '1' THEN NULL ELSE ? END,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(
    status,
    execStatus,
    cycleIndex,
    toInt(params.TotalSuccessAmount, row.total_success_amount),
    rtnCode, paidAt,
    rtnCode, paidAt,
    rtnCode, currentPeriodEndsAt,
    execStatus, new Date().toISOString(),
    execStatus,
    rtnCode,
    rtnCode,
    params.RtnMsg ?? null,
    row.id,
  ).run();

  await upsertSubscriptionCharge(env, row.id, cycleIndex, params);
}

export async function syncMembershipSubscription(env: Env, merchantTradeNo: string): Promise<SubscriptionRow | null> {
  const merchantId = env.ECPAY_MERCHANT_ID;
  const hashKey = env.ECPAY_HASH_KEY;
  const hashIV = env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIV) {
    throw new Error('ECPay 未設定');
  }

  const result = await queryCreditPeriodInfo({
    merchantId,
    hashKey,
    hashIV,
    merchantTradeNo,
    envName: env.ECPAY_ENV,
  });

  const row = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE merchant_trade_no = ? LIMIT 1`
  ).bind(merchantTradeNo).first<SubscriptionRow>();
  if (!row) return null;

  const latestLog = Array.isArray(result.ExecLog) && result.ExecLog.length > 0
    ? result.ExecLog[result.ExecLog.length - 1]
    : null;
  const lastPaidAt = parseEcpayDateString(latestLog?.process_date ?? result.process_date) ?? row.last_paid_at;
  const currentPeriodEndsAt = lastPaidAt ? addPeriod(lastPaidAt, String(result.PeriodType ?? row.period_type), toInt(result.Frequency, row.frequency)) : row.current_period_ends_at;
  const execStatus = result.ExecStatus ?? row.ecpay_exec_status ?? '1';
  const status =
    execStatus === '2' ? 'completed' :
    execStatus === '0' ? 'cancelled' :
    Number(result.RtnCode) === 1 ? 'active' : row.status;

  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = ?,
            ecpay_exec_status = ?,
            total_success_times = ?,
            total_success_amount = ?,
            first_trade_no = COALESCE(first_trade_no, ?),
            first_gwsr = COALESCE(first_gwsr, ?),
            first_auth_code = COALESCE(first_auth_code, ?),
            card6no = COALESCE(card6no, ?),
            card4no = COALESCE(card4no, ?),
            first_paid_at = COALESCE(first_paid_at, ?),
            last_paid_at = COALESCE(?, last_paid_at),
            current_period_started_at = COALESCE(?, current_period_started_at),
            current_period_ends_at = COALESCE(?, current_period_ends_at),
            completed_at = CASE WHEN ? = '2' THEN COALESCE(completed_at, datetime('now')) ELSE completed_at END,
            cancelled_at = CASE WHEN ? = '0' THEN COALESCE(cancelled_at, datetime('now')) ELSE cancelled_at END,
            last_charge_status = ?,
            last_error_message = CASE WHEN ? = 1 THEN NULL ELSE COALESCE(last_error_message, 'ECPay query returned non-success') END,
            last_synced_at = datetime('now'),
            raw_last_query = ?,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(
    status,
    execStatus,
    toInt(result.TotalSuccessTimes, row.total_success_times),
    toInt(result.TotalSuccessAmount, row.total_success_amount),
    result.TradeNo ?? null,
    result.gwsr ? String(result.gwsr) : null,
    result.auth_code ?? null,
    result.card6no ?? null,
    result.card4no ?? null,
    parseEcpayDateString(result.process_date),
    lastPaidAt,
    lastPaidAt,
    currentPeriodEndsAt,
    execStatus,
    execStatus,
    latestLog?.RtnCode ? String(latestLog.RtnCode) : '1',
    Number(result.RtnCode),
    JSON.stringify(result),
    row.id,
  ).run();

  if (Array.isArray(result.ExecLog)) {
    for (let i = 0; i < result.ExecLog.length; i += 1) {
      const log = result.ExecLog[i] ?? {};
      await upsertSubscriptionCharge(env, row.id, i + 1, {
        MerchantTradeNo: row.merchant_trade_no,
        RtnCode: String(log.RtnCode ?? '1'),
        Amount: String(log.amount ?? row.amount),
        gwsr: log.gwsr ? String(log.gwsr) : '',
        AuthCode: log.auth_code ?? '',
        TradeNo: log.TradeNo ?? '',
        ProcessDate: log.process_date ?? '',
      });
    }
  }

  return env.DB.prepare(
    `SELECT * FROM subscriptions WHERE id = ? LIMIT 1`
  ).bind(row.id).first<SubscriptionRow>();
}

export async function getMyMembership(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env);
  const summary = await getMembershipSummary(env, user.id);
  return json(req, env, { membership: summary });
}

export async function refreshMyMembership(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env);
  const latest = await getLatestMembershipRow(env, user.id);
  if (!latest) return json(req, env, { membership: null });
  const fresh = await syncMembershipSubscription(env, latest.merchant_trade_no);
  return json(req, env, { membership: buildSummary(fresh) });
}

export async function cancelMyMembership(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env);
  const latest = await getLatestMembershipRow(env, user.id);
  if (!latest) return badRequest(req, env, '目前沒有可取消的會員方案');

  const summary = buildSummary(latest);
  if (!summary?.is_active && summary?.status !== 'cancelling') {
    return badRequest(req, env, '目前沒有進行中的月費會員');
  }

  const merchantId = env.ECPAY_MERCHANT_ID;
  const hashKey = env.ECPAY_HASH_KEY;
  const hashIV = env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIV) {
    return badRequest(req, env, 'ECPay 未設定');
  }

  const result = await creditPeriodAction({
    merchantId,
    hashKey,
    hashIV,
    merchantTradeNo: latest.merchant_trade_no,
    action: 'Cancel',
    envName: env.ECPAY_ENV,
  });

  if (String(result.RtnCode) !== '1') {
    return badRequest(req, env, result.RtnMsg || '取消訂閱失敗');
  }

  await env.DB.prepare(
    `UPDATE subscriptions
        SET cancel_requested_at = COALESCE(cancel_requested_at, datetime('now')),
            ecpay_exec_status = '0',
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(latest.id).run();

  const fresh = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE id = ? LIMIT 1`
  ).bind(latest.id).first<SubscriptionRow>();

  return json(req, env, { membership: buildSummary(fresh) });
}

export async function rejectDuplicateActiveMembership(env: Env, userId: string): Promise<string | null> {
  const latest = await getLatestMembershipRow(env, userId);
  if (!latest) return null;
  const summary = buildSummary(latest);
  if (summary?.is_active || summary?.status === 'pending' || summary?.status === 'cancelling') {
    return '你目前已有進行中的月費會員';
  }
  return null;
}

export async function clearStalePendingMemberships(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = COALESCE(cancelled_at, datetime('now')),
            updated_at = datetime('now')
      WHERE user_id = ?
        AND item_id = ?
        AND status = 'pending'
        AND created_at < datetime('now', '-30 minutes')`
  ).bind(userId, MEMBERSHIP_ITEM_ID).run();
}
