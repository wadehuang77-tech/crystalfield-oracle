import {
  computeEcpayCheckMac,
  creditPeriodAction,
  queryCreditPeriodInfo,
} from './ecpay';
import {
  badRequest,
  Env,
  json,
  readSession,
  unauthorized,
} from './utils';
import { TAROT_SUBSCRIPTION } from './tarotCatalog';

export const TAROT_SUBSCRIPTION_ITEM_ID = TAROT_SUBSCRIPTION.id;
export const MEMBERSHIP_PERIOD_TYPE = 'M';
export const MEMBERSHIP_FREQUENCY = 1;
// AIO accepts a finite execution count. 99 is the documented monthly limit in
// ECPay's merchant management guidance and represents 8 years + 3 months.
export const MEMBERSHIP_EXEC_TIMES = 99;

interface SubscriptionRow {
  id: string;
  user_id: string;
  email: string | null;
  order_id: string;
  merchant_trade_no: string;
  item_id: string;
  plan_code: string | null;
  amount: number;
  currency: string;
  billing_type: string;
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
  started_at: string | null;
  last_payment_at: string | null;
  next_billing_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_anchor_day: number | null;
  cancel_requested: number;
  cancel_requested_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  ended_at: string | null;
  ecpay_trade_no: string | null;
  last_charge_status: string | null;
  last_error_message: string | null;
  last_synced_at: string | null;
  raw_last_query: string | null;
  created_at: string;
  updated_at: string;
  latest_payment_status?: string | null;
}

function parseEcpayDateString(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi, +se);
  return new Date(utcMs).toISOString();
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function taipeiDateParts(iso: string): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number; milliseconds: number } {
  const shifted = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    milliseconds: shifted.getUTCMilliseconds(),
  };
}

export function addEcpayBillingPeriod(startIso: string, periodType: string, frequency: number, anchorDay?: number | null): string {
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
    default: {
      const taipei = taipeiDateParts(startIso);
      const targetMonthIndex = taipei.month + frequency;
      const targetYear = taipei.year + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
      const targetDay = Math.min(anchorDay ?? taipei.day, daysInUtcMonth(targetYear, normalizedMonth));
      return new Date(Date.UTC(
        targetYear,
        normalizedMonth,
        targetDay,
        taipei.hours - 8,
        taipei.minutes,
        taipei.seconds,
        taipei.milliseconds,
      )).toISOString();
    }
  }
  return next.toISOString();
}

export function buildRecurringIdempotencyKey(params: Record<string, string>, cycle: number): string {
  const reference = params.TradeNo || params.Gwsr || params.gwsr || params.ProcessDate || params.process_date || 'no-reference';
  return `${params.MerchantTradeNo ?? ''}:${cycle}:${reference}:${params.RtnCode ?? ''}`;
}

export function recurringBillingCycle(params: Record<string, string>, previousSuccessTimes = 0): number {
  const successTimes = Math.max(0, toInt(params.TotalSuccessTimes, previousSuccessTimes));
  return String(params.RtnCode) === '1' ? Math.max(1, successTimes) : Math.max(1, successTimes + 1);
}

export function validateTarotRecurringParameters(params: Record<string, string>, phase: 'first' | 'recurring'): string | null {
  const amount = toInt(phase === 'first' ? params.TradeAmt : params.Amount);
  if (amount !== TAROT_SUBSCRIPTION.amount) return 'Amount mismatch';
  if (params.PeriodAmount && toInt(params.PeriodAmount) !== TAROT_SUBSCRIPTION.amount) return 'PeriodAmount mismatch';
  if (params.PeriodType && params.PeriodType !== MEMBERSHIP_PERIOD_TYPE) return 'PeriodType mismatch';
  if (params.Frequency && toInt(params.Frequency) !== MEMBERSHIP_FREQUENCY) return 'Frequency mismatch';
  if (params.ExecTimes && toInt(params.ExecTimes) !== MEMBERSHIP_EXEC_TIMES) return 'ExecTimes mismatch';
  return null;
}

export function decideTarotEntitlement(input: {
  planCode: string;
  status: string;
  currentPeriodEnd: string | null;
  latestPaymentStatus: string | null;
}, nowMs = Date.now()): boolean {
  const periodEndMs = input.currentPeriodEnd ? Date.parse(input.currentPeriodEnd) : NaN;
  const paidWindow = Number.isFinite(periodEndMs) && periodEndMs > nowMs;
  const statusAllowsPaidPeriod = input.status === 'active' || input.status === 'cancelled';
  return input.planCode === TAROT_SUBSCRIPTION_ITEM_ID
    && statusAllowsPaidPeriod
    && paidWindow
    && input.latestPaymentStatus === 'paid';
}

function toInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deriveStatus(row: SubscriptionRow): {
  status: 'pending' | 'active' | 'cancelling' | 'cancelled' | 'ended' | 'payment_failed';
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
} {
  const now = Date.now();
  const currentPeriodEnd = row.current_period_end ?? row.current_period_ends_at;
  const periodEndMs = currentPeriodEnd ? Date.parse(currentPeriodEnd) : NaN;
  const hasActiveWindow = Number.isFinite(periodEndMs) && periodEndMs > now;
  const cancelRequested = row.cancel_requested === 1 || !!row.cancel_requested_at || row.ecpay_exec_status === '0';

  if (row.status === 'pending') {
    return { status: 'pending', isActive: false, cancelAtPeriodEnd: false };
  }
  if (row.status === 'payment_failed' || (row.last_charge_status && row.last_charge_status !== '1')) {
    return { status: 'payment_failed', isActive: false, cancelAtPeriodEnd: false };
  }
  if (cancelRequested && hasActiveWindow) {
    return { status: 'cancelling', isActive: row.latest_payment_status === 'paid', cancelAtPeriodEnd: true };
  }
  if (cancelRequested && !hasActiveWindow) {
    return { status: 'cancelled', isActive: false, cancelAtPeriodEnd: true };
  }
  if (hasActiveWindow) {
    return { status: 'active', isActive: row.latest_payment_status === 'paid', cancelAtPeriodEnd: false };
  }
  if (row.status === 'ended' || row.status === 'completed') {
    return { status: 'ended', isActive: false, cancelAtPeriodEnd: false };
  }
  if (row.status === 'cancelled') {
    return { status: 'cancelled', isActive: false, cancelAtPeriodEnd: false };
  }
  return { status: 'ended', isActive: false, cancelAtPeriodEnd: false };
}

function buildSummary(row: SubscriptionRow | null) {
  if (!row) return null;
  const derived = deriveStatus(row);
  return {
    id: row.id,
    item_id: row.item_id,
    plan_code: row.plan_code ?? row.item_id,
    amount: row.amount,
    currency: row.currency,
    billing_type: row.billing_type,
    period_type: row.period_type,
    frequency: row.frequency,
    exec_times: row.exec_times,
    status: derived.status,
    is_active: derived.isActive,
    cancel_at_period_end: derived.cancelAtPeriodEnd,
    total_success_times: row.total_success_times,
    total_success_amount: row.total_success_amount,
    current_period_started_at: row.current_period_start ?? row.current_period_started_at,
    current_period_ends_at: row.current_period_end ?? row.current_period_ends_at,
    current_period_start: row.current_period_start ?? row.current_period_started_at,
    current_period_end: row.current_period_end ?? row.current_period_ends_at,
    started_at: row.started_at ?? row.first_paid_at,
    last_payment_at: row.last_payment_at ?? row.last_paid_at,
    next_billing_at: row.next_billing_at ?? row.current_period_end ?? row.current_period_ends_at,
    first_paid_at: row.started_at ?? row.first_paid_at,
    last_paid_at: row.last_payment_at ?? row.last_paid_at,
    cancel_requested_at: row.cancel_requested_at,
    cancelled_at: row.cancelled_at,
    completed_at: row.completed_at,
    ended_at: row.ended_at ?? row.completed_at,
    last_charge_status: row.last_charge_status,
    last_error_message: row.last_error_message,
    card_last4: row.card4no,
    card_first6: row.card6no,
    merchant_trade_no: row.merchant_trade_no,
    ecpay_trade_no: row.ecpay_trade_no ?? row.first_trade_no,
    latest_payment_status: row.latest_payment_status ?? null,
    last_synced_at: row.last_synced_at,
  };
}

export async function getLatestMembershipRow(env: Env, userId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT s.*,
            (SELECT c.status
              FROM subscription_charges c
              WHERE c.subscription_id = s.id
              ORDER BY c.billing_cycle DESC, c.created_at DESC, c.rowid DESC
              LIMIT 1) AS latest_payment_status
       FROM subscriptions s
      WHERE s.user_id = ? AND COALESCE(s.plan_code, s.item_id) = ?
      ORDER BY s.created_at DESC
      LIMIT 1`
  ).bind(userId, TAROT_SUBSCRIPTION_ITEM_ID).first<SubscriptionRow>();
}

export async function getMembershipSummary(env: Env, userId: string) {
  const row = await getLatestMembershipRow(env, userId);
  return buildSummary(row);
}

export async function hasActiveTarotSubscription(env: Env, userId: string): Promise<boolean> {
  const row = await getLatestMembershipRow(env, userId);
  if (!row) return false;
  return decideTarotEntitlement({
    planCode: row.plan_code ?? row.item_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end ?? row.current_period_ends_at,
    latestPaymentStatus: row.latest_payment_status ?? null,
  });
}

export async function createPendingMembershipSubscription(env: Env, input: {
  userId: string;
  email: string;
  orderId: string;
  merchantTradeNo: string;
  amount: number;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO subscriptions
      (id, user_id, email, order_id, merchant_trade_no, item_id, plan_code, amount,
       currency, billing_type, period_type, frequency, exec_times, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TWD', 'recurring', ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    input.userId,
    input.email,
    input.orderId,
    input.merchantTradeNo,
    TAROT_SUBSCRIPTION_ITEM_ID,
    TAROT_SUBSCRIPTION_ITEM_ID,
    input.amount,
    MEMBERSHIP_PERIOD_TYPE,
    MEMBERSHIP_FREQUENCY,
    MEMBERSHIP_EXEC_TIMES,
  ).run();
}

function subscriptionChargeStatement(
  env: Env,
  row: SubscriptionRow,
  cycle: number,
  params: Record<string, string>,
  paymentType: 'first_payment' | 'recurring_payment',
): D1PreparedStatement {
  const rtnCode = String(params.RtnCode ?? '');
  const raw = JSON.stringify(params);
  const processDate = parseEcpayDateString(params.PaymentDate ?? params.ProcessDate ?? params.process_date);
  const idempotencyKey = buildRecurringIdempotencyKey(params, cycle);
  const amount = toInt(params.Amount ?? params.TradeAmt ?? params.amount, row.amount);
  return env.DB.prepare(
    `INSERT INTO subscription_charges
      (id, subscription_id, user_id, plan_code, merchant_trade_no, ecpay_trade_no,
       amount, payment_type, billing_cycle, status, paid_at, raw_reference,
       idempotency_key, cycle_index, rtn_code, rtn_msg, trade_no, gwsr,
       auth_code, process_date, raw_callback, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(
    crypto.randomUUID(),
    row.id,
    row.user_id,
    row.plan_code ?? row.item_id,
    row.merchant_trade_no,
    params.TradeNo ?? null,
    amount,
    paymentType,
    cycle,
    rtnCode === '1' ? 'paid' : 'failed',
    rtnCode === '1' ? processDate : null,
    raw,
    idempotencyKey,
    cycle,
    rtnCode,
    params.RtnMsg ?? null,
    params.TradeNo ?? null,
    params.Gwsr ?? params.gwsr ?? null,
    params.AuthCode ?? params.auth_code ?? null,
    processDate,
    raw,
  );
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
  const billingAnchorDay = taipeiDateParts(paidAt).day;
  const currentPeriodEndsAt = addEcpayBillingPeriod(paidAt, row.period_type, row.frequency, billingAnchorDay);
  const totalSuccessTimes = Math.max(1, row.total_success_times);
  const totalSuccessAmount = Math.max(order.amount, row.total_success_amount);

  const update = env.DB.prepare(
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
            started_at = COALESCE(started_at, ?),
            last_payment_at = ?,
            next_billing_at = ?,
            current_period_started_at = ?,
            current_period_ends_at = ?,
            current_period_start = ?,
            current_period_end = ?,
            billing_anchor_day = COALESCE(billing_anchor_day, ?),
            ecpay_trade_no = COALESCE(ecpay_trade_no, ?),
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
    paidAt,
    currentPeriodEndsAt,
    paidAt,
    currentPeriodEndsAt,
    paidAt,
    currentPeriodEndsAt,
    billingAnchorDay,
    params.TradeNo ?? null,
    row.id,
  );

  const chargeParams = {
    ...params,
    MerchantTradeNo: row.merchant_trade_no,
    Amount: String(order.amount),
    ProcessDate: params.PaymentDate ?? params.ProcessDate ?? '',
  };
  const eventId = `tarot-subscription-start:${row.merchant_trade_no}`;
  const event = env.DB.prepare(
    `INSERT OR IGNORE INTO events (id, user_id, event_type, created_at, meta)
     VALUES (?, ?, 'tarot_subscription_start', datetime('now'), ?)`
  ).bind(eventId, row.user_id, JSON.stringify({
    plan_id: TAROT_SUBSCRIPTION_ITEM_ID,
    billing_type: 'recurring',
    amount: order.amount,
    currency: 'TWD',
    billing_cycle: 1,
    merchant_trade_no: row.merchant_trade_no,
    ecpay_trade_no: params.TradeNo ?? null,
  }));
  await env.DB.batch([
    subscriptionChargeStatement(env, row, 1, chargeParams, 'first_payment'),
    update,
    event,
  ]);
}

export async function markMembershipFirstPaymentFailed(env: Env, order: {
  user_id: string | null;
  merchant_trade_no: string;
  amount: number;
}, params: Record<string, string>): Promise<void> {
  if (!order.user_id) return;
  const row = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE merchant_trade_no = ? LIMIT 1`
  ).bind(order.merchant_trade_no).first<SubscriptionRow>();
  if (!row) return;
  const chargeParams = {
    ...params,
    MerchantTradeNo: row.merchant_trade_no,
    Amount: String(order.amount),
  };
  const idempotencyKey = buildRecurringIdempotencyKey(chargeParams, 1);
  await env.DB.batch([
    subscriptionChargeStatement(env, row, 1, chargeParams, 'first_payment'),
    env.DB.prepare(
      `UPDATE subscriptions
          SET status = 'payment_failed',
              last_charge_status = ?,
              last_error_message = ?,
              updated_at = datetime('now')
        WHERE id = ?`
    ).bind(String(params.RtnCode ?? ''), params.RtnMsg ?? null, row.id),
    env.DB.prepare(
      `INSERT OR IGNORE INTO events (id, user_id, event_type, created_at, meta)
       VALUES (?, ?, 'tarot_subscription_payment_failed', datetime('now'), ?)`
    ).bind(`tarot-first-failed:${idempotencyKey}`, row.user_id, JSON.stringify({
      plan_id: TAROT_SUBSCRIPTION_ITEM_ID,
      billing_type: 'recurring',
      amount: order.amount,
      currency: 'TWD',
      billing_cycle: 1,
      merchant_trade_no: row.merchant_trade_no,
      status: 'failed',
    })),
  ]);
}

export async function handleMembershipRecurringCallback(env: Env, params: Record<string, string>): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE merchant_trade_no = ? LIMIT 1`
  ).bind(params.MerchantTradeNo ?? '').first<SubscriptionRow>();
  if (!row || (row.plan_code ?? row.item_id) !== TAROT_SUBSCRIPTION_ITEM_ID) {
    throw new Error('Unknown tarot subscription');
  }
  const validationError = validateTarotRecurringParameters(params, 'recurring');
  if (validationError) throw new Error(validationError);

  const cycleIndex = recurringBillingCycle(params, row.total_success_times);
  const paidAt = parseEcpayDateString(params.ProcessDate ?? params.process_date) ?? new Date().toISOString();
  const billingAnchorDay = row.billing_anchor_day ?? taipeiDateParts(row.started_at ?? paidAt).day;
  const currentPeriodEndsAt = addEcpayBillingPeriod(paidAt, row.period_type, row.frequency, billingAnchorDay);
  const execStatus = params.ExecStatus ?? row.ecpay_exec_status ?? '1';
  const rtnCode = String(params.RtnCode ?? '');
  const status = execStatus === '0' ? 'cancelled' : rtnCode === '1' ? 'active' : 'payment_failed';
  const totalSuccessTimes = rtnCode === '1'
    ? Math.max(cycleIndex, row.total_success_times)
    : row.total_success_times;
  const totalSuccessAmount = rtnCode === '1'
    ? Math.max(toInt(params.TotalSuccessAmount), totalSuccessTimes * row.amount)
    : row.total_success_amount;

  const update = env.DB.prepare(
    `UPDATE subscriptions
        SET status = ?,
            ecpay_exec_status = ?,
            total_success_times = ?,
            total_success_amount = ?,
            last_paid_at = CASE WHEN ? = '1' THEN ? ELSE last_paid_at END,
            last_payment_at = CASE WHEN ? = '1' THEN ? ELSE last_payment_at END,
            next_billing_at = CASE WHEN ? = '1' THEN ? ELSE next_billing_at END,
            current_period_started_at = CASE WHEN ? = '1' THEN ? ELSE current_period_started_at END,
            current_period_ends_at = CASE WHEN ? = '1' THEN ? ELSE current_period_ends_at END,
            current_period_start = CASE WHEN ? = '1' THEN ? ELSE current_period_start END,
            current_period_end = CASE WHEN ? = '1' THEN ? ELSE current_period_end END,
            completed_at = CASE WHEN ? = '2' THEN COALESCE(completed_at, ?) ELSE completed_at END,
            ended_at = CASE WHEN ? = '2' THEN COALESCE(ended_at, ?) ELSE ended_at END,
            cancelled_at = CASE WHEN ? = '0' THEN COALESCE(cancelled_at, datetime('now')) ELSE cancelled_at END,
            ecpay_trade_no = COALESCE(?, ecpay_trade_no),
            last_charge_status = ?,
            last_error_message = CASE WHEN ? = '1' THEN NULL ELSE ? END,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(
    status,
    execStatus,
    totalSuccessTimes,
    totalSuccessAmount,
    rtnCode, paidAt,
    rtnCode, paidAt,
    rtnCode, currentPeriodEndsAt,
    rtnCode, paidAt,
    rtnCode, currentPeriodEndsAt,
    rtnCode, paidAt,
    rtnCode, currentPeriodEndsAt,
    execStatus, new Date().toISOString(),
    execStatus, currentPeriodEndsAt,
    execStatus,
    params.TradeNo ?? null,
    rtnCode,
    rtnCode,
    params.RtnMsg ?? null,
    row.id,
  );

  const idempotencyKey = buildRecurringIdempotencyKey(params, cycleIndex);
  const eventType = rtnCode === '1' ? 'tarot_subscription_renewal' : 'tarot_subscription_payment_failed';
  const event = env.DB.prepare(
    `INSERT OR IGNORE INTO events (id, user_id, event_type, created_at, meta)
     VALUES (?, ?, ?, datetime('now'), ?)`
  ).bind(`tarot-recurring:${idempotencyKey}`, row.user_id, eventType, JSON.stringify({
    plan_id: TAROT_SUBSCRIPTION_ITEM_ID,
    billing_type: 'recurring',
    amount: row.amount,
    currency: 'TWD',
    billing_cycle: cycleIndex,
    merchant_trade_no: row.merchant_trade_no,
    ecpay_trade_no: params.TradeNo ?? null,
    status: rtnCode === '1' ? 'paid' : 'failed',
  }));
  await env.DB.batch([
    subscriptionChargeStatement(env, row, cycleIndex, params, 'recurring_payment'),
    update,
    event,
  ]);
}

export async function tarotPeriodReturn(req: Request, env: Env): Promise<Response> {
  const plain = (body: string, status = 200) => new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return plain('0|Unsupported content-type', 400);
  }
  const params: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [key, value] of form.entries()) params[key] = String(value);
  } catch {
    return plain('0|Bad body', 400);
  }
  if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
    return plain('0|Webhook not configured', 503);
  }
  if (params.MerchantID !== env.ECPAY_MERCHANT_ID) return plain('0|Merchant mismatch', 400);
  if (!params.CheckMacValue) return plain('0|Missing CheckMacValue', 400);
  const expected = await computeEcpayCheckMac(params, env.ECPAY_HASH_KEY, env.ECPAY_HASH_IV);
  if (expected !== params.CheckMacValue) return plain('0|Invalid signature', 400);
  if (params.SimulatePaid === '1') return plain('1|OK');
  const merchantTradeNo = params.MerchantTradeNo ?? '';
  if (!/^[0-9]{14}[A-Z0-9]{6}$/.test(merchantTradeNo)) return plain('0|Invalid MerchantTradeNo', 400);
  try {
    await handleMembershipRecurringCallback(env, params);
    return plain('1|OK');
  } catch (error) {
    console.error('Tarot recurring callback failed', error);
    return plain('0|Callback processing failed', 500);
  }
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
  const anchorDay = row.billing_anchor_day ?? (row.started_at ? taipeiDateParts(row.started_at).day : null);
  const currentPeriodEndsAt = lastPaidAt
    ? addEcpayBillingPeriod(lastPaidAt, String(result.PeriodType ?? row.period_type), toInt(result.Frequency, row.frequency), anchorDay)
    : (row.current_period_end ?? row.current_period_ends_at);
  const execStatus = result.ExecStatus ?? row.ecpay_exec_status ?? '1';
  const status =
    execStatus === '0' ? 'cancelled' :
    Number(result.RtnCode) === 1 ? 'active' : 'payment_failed';

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
            started_at = COALESCE(started_at, ?),
            last_payment_at = COALESCE(?, last_payment_at),
            next_billing_at = COALESCE(?, next_billing_at),
            current_period_started_at = COALESCE(?, current_period_started_at),
            current_period_ends_at = COALESCE(?, current_period_ends_at),
            current_period_start = COALESCE(?, current_period_start),
            current_period_end = COALESCE(?, current_period_end),
            completed_at = CASE WHEN ? = '2' THEN COALESCE(completed_at, datetime('now')) ELSE completed_at END,
            ended_at = CASE WHEN ? = '2' THEN COALESCE(ended_at, ?) ELSE ended_at END,
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
    parseEcpayDateString(result.process_date),
    lastPaidAt,
    currentPeriodEndsAt,
    lastPaidAt,
    currentPeriodEndsAt,
    lastPaidAt,
    currentPeriodEndsAt,
    execStatus,
    execStatus,
    currentPeriodEndsAt,
    execStatus,
    latestLog?.RtnCode ? String(latestLog.RtnCode) : '1',
    Number(result.RtnCode),
    JSON.stringify(result),
    row.id,
  ).run();

  if (Array.isArray(result.ExecLog)) {
    for (let i = 0; i < result.ExecLog.length; i += 1) {
      const log = result.ExecLog[i] ?? {};
      const chargeParams = {
        MerchantTradeNo: row.merchant_trade_no,
        RtnCode: String(log.RtnCode ?? '1'),
        Amount: String(log.amount ?? row.amount),
        gwsr: log.gwsr ? String(log.gwsr) : '',
        AuthCode: log.auth_code ?? '',
        TradeNo: log.TradeNo ?? '',
        ProcessDate: log.process_date ?? '',
        TotalSuccessTimes: String(i + 1),
      };
      await subscriptionChargeStatement(
        env,
        row,
        i + 1,
        chargeParams,
        i === 0 ? 'first_payment' : 'recurring_payment',
      ).run();
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
        SET status = 'cancelled',
            cancel_requested = 1,
            cancel_requested_at = COALESCE(cancel_requested_at, datetime('now')),
            cancelled_at = COALESCE(cancelled_at, datetime('now')),
            ecpay_exec_status = '0',
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(latest.id).run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO events (id, user_id, event_type, created_at, meta)
     VALUES (?, ?, 'tarot_subscription_cancelled', datetime('now'), ?)`
  ).bind(
    `tarot-subscription-cancelled:${latest.id}`,
    latest.user_id,
    JSON.stringify({
      plan_id: TAROT_SUBSCRIPTION_ITEM_ID,
      billing_type: 'recurring',
      merchant_trade_no: latest.merchant_trade_no,
      current_period_end: latest.current_period_end ?? latest.current_period_ends_at,
    }),
  ).run();

  const fresh = await getLatestMembershipRow(env, user.id);

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
            cancel_requested = 1,
            cancelled_at = COALESCE(cancelled_at, datetime('now')),
            updated_at = datetime('now')
      WHERE user_id = ?
        AND item_id = ?
        AND status = 'pending'
        AND created_at < datetime('now', '-30 minutes')`
  ).bind(userId, TAROT_SUBSCRIPTION_ITEM_ID).run();
}
