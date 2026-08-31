import { Env, json, readSession, requireAdmin, unauthorized } from './utils';
import { TAROT_SUBSCRIPTION_ITEM_ID } from './subscriptions';

interface AdminSubscriptionJoinRow {
  subscription_id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  plan_code: string;
  subscription_status: string;
  amount: number;
  started_at: string | null;
  last_payment_at: string | null;
  next_billing_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  merchant_trade_no: string;
  ecpay_trade_no: string | null;
  charge_id: string | null;
  billing_cycle: number | null;
  charge_amount: number | null;
  charge_status: string | null;
  paid_at: string | null;
  charge_merchant_trade_no: string | null;
  charge_ecpay_trade_no: string | null;
}

export async function adminListTarotSubscriptions(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user || !await requireAdmin(req, env, user)) return unauthorized(req, env);

  const result = await env.DB.prepare(
    `SELECT
       s.id AS subscription_id,
       s.user_id,
       p.name,
       COALESCE(s.email, p.email) AS email,
       COALESCE(s.plan_code, s.item_id) AS plan_code,
       s.status AS subscription_status,
       s.amount,
       COALESCE(s.started_at, s.first_paid_at) AS started_at,
       COALESCE(s.last_payment_at, s.last_paid_at) AS last_payment_at,
       COALESCE(s.next_billing_at, s.current_period_ends_at) AS next_billing_at,
       COALESCE(s.current_period_end, s.current_period_ends_at) AS current_period_end,
       s.cancelled_at,
       s.merchant_trade_no,
       COALESCE(s.ecpay_trade_no, s.first_trade_no) AS ecpay_trade_no,
       c.id AS charge_id,
       c.billing_cycle,
       c.amount AS charge_amount,
       c.status AS charge_status,
       c.paid_at,
       c.merchant_trade_no AS charge_merchant_trade_no,
       c.ecpay_trade_no AS charge_ecpay_trade_no
     FROM subscriptions s
     LEFT JOIN profiles p ON p.id = s.user_id
     LEFT JOIN subscription_charges c ON c.subscription_id = s.id
     WHERE COALESCE(s.plan_code, s.item_id) = ?
     ORDER BY s.created_at DESC, c.billing_cycle DESC, c.created_at DESC, c.rowid DESC
     LIMIT 2000`
  ).bind(TAROT_SUBSCRIPTION_ITEM_ID).all<AdminSubscriptionJoinRow>();

  const subscriptions = new Map<string, {
    id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    plan_code: string;
    status: string;
    amount: number;
    started_at: string | null;
    last_payment_at: string | null;
    next_billing_at: string | null;
    current_period_end: string | null;
    cancelled_at: string | null;
    merchant_trade_no: string;
    ecpay_trade_no: string | null;
    payments: Array<{
      id: string;
      billing_cycle: number;
      amount: number;
      status: string;
      paid_at: string | null;
      merchant_trade_no: string | null;
      ecpay_trade_no: string | null;
    }>;
  }>();

  for (const row of result.results ?? []) {
    let subscription = subscriptions.get(row.subscription_id);
    if (!subscription) {
      subscription = {
        id: row.subscription_id,
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        plan_code: row.plan_code,
        status: row.subscription_status,
        amount: row.amount,
        started_at: row.started_at,
        last_payment_at: row.last_payment_at,
        next_billing_at: row.next_billing_at,
        current_period_end: row.current_period_end,
        cancelled_at: row.cancelled_at,
        merchant_trade_no: row.merchant_trade_no,
        ecpay_trade_no: row.ecpay_trade_no,
        payments: [],
      };
      subscriptions.set(row.subscription_id, subscription);
    }
    if (row.charge_id) {
      subscription.payments.push({
        id: row.charge_id,
        billing_cycle: row.billing_cycle ?? 0,
        amount: row.charge_amount ?? 0,
        status: row.charge_status ?? 'unknown',
        paid_at: row.paid_at,
        merchant_trade_no: row.charge_merchant_trade_no,
        ecpay_trade_no: row.charge_ecpay_trade_no,
      });
    }
  }

  const list = [...subscriptions.values()];
  const revenue = list.flatMap((subscription) => subscription.payments)
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  return json(req, env, {
    subscriptions: list,
    summary: {
      subscriptions: list.length,
      active: list.filter((subscription) => subscription.status === 'active').length,
      paid_transactions: list.flatMap((subscription) => subscription.payments).filter((payment) => payment.status === 'paid').length,
      revenue,
    },
  });
}
