import { deriveTarotEntitlement } from './tarotEntitlements';
import { Env, json, readSession, requireAdmin, unauthorized } from './utils';
import { TAROT_SUBSCRIPTION_ITEM_ID } from './subscriptions';

interface Row {
  user_id: string; name: string | null; email: string; member_created_at: string;
  trial_started_at: string | null; trial_ends_at: string | null; trial_used_at: string | null;
  subscription_id: string | null; plan_code: string | null; subscription_status: string | null;
  amount: number | null; started_at: string | null; last_payment_at: string | null;
  next_billing_at: string | null; current_period_end: string | null; cancelled_at: string | null;
  cancel_requested: number | null; merchant_trade_no: string | null; ecpay_trade_no: string | null;
  charge_id: string | null; billing_cycle: number | null; charge_amount: number | null;
  charge_status: string | null; paid_at: string | null;
  charge_merchant_trade_no: string | null; charge_ecpay_trade_no: string | null;
}

export async function adminListTarotSubscriptions(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user || !await requireAdmin(req, env, user)) return unauthorized(req, env);

  const result = await env.DB.prepare(
    `WITH ranked AS (
       SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.created_at DESC, s.rowid DESC) AS rn
         FROM subscriptions s
        WHERE COALESCE(s.plan_code, s.item_id) = ?
     )
     SELECT p.id AS user_id, COALESCE(NULLIF(p.name, ''), m.display_name) AS name, p.email,
            m.created_at AS member_created_at,
            m.tarot_trial_started_at AS trial_started_at,
            m.tarot_trial_ends_at AS trial_ends_at,
            m.tarot_trial_used_at AS trial_used_at,
            s.id AS subscription_id, COALESCE(s.plan_code, s.item_id) AS plan_code,
            s.status AS subscription_status, s.amount,
            COALESCE(s.started_at, s.first_paid_at) AS started_at,
            COALESCE(s.last_payment_at, s.last_paid_at) AS last_payment_at,
            COALESCE(s.next_billing_at, s.current_period_ends_at) AS next_billing_at,
            COALESCE(s.current_period_end, s.current_period_ends_at) AS current_period_end,
            s.cancelled_at, s.cancel_requested, s.merchant_trade_no,
            COALESCE(s.ecpay_trade_no, s.first_trade_no) AS ecpay_trade_no,
            c.id AS charge_id, c.billing_cycle, c.amount AS charge_amount,
            c.status AS charge_status, c.paid_at,
            c.merchant_trade_no AS charge_merchant_trade_no,
            c.ecpay_trade_no AS charge_ecpay_trade_no
       FROM profile_member_metadata m
       JOIN profiles p ON p.id = m.user_id
       LEFT JOIN ranked s ON s.user_id = p.id AND s.rn = 1
       LEFT JOIN subscription_charges c ON c.subscription_id = s.id
      WHERE m.google_sub IS NOT NULL
      ORDER BY m.created_at DESC, c.billing_cycle DESC, c.created_at DESC
      LIMIT 4000`,
  ).bind(TAROT_SUBSCRIPTION_ITEM_ID).all<Row>();

  const members = new Map<string, Record<string, unknown> & { payments: Array<Record<string, unknown>> }>();
  for (const row of result.results ?? []) {
    let member = members.get(row.user_id);
    if (!member) {
      const entitlement = deriveTarotEntitlement({
        tarot_trial_started_at: row.trial_started_at,
        tarot_trial_ends_at: row.trial_ends_at,
        tarot_trial_used_at: row.trial_used_at,
      }, row.subscription_id ? {
        status: row.subscription_status,
        is_active: row.charge_status === 'paid' && !!row.current_period_end && Date.parse(row.current_period_end) > Date.now(),
        cancel_at_period_end: row.cancel_requested === 1,
        started_at: row.started_at,
        current_period_end: row.current_period_end,
        last_payment_at: row.last_payment_at,
        latest_payment_status: row.charge_status,
      } : null);
      member = {
        id: row.subscription_id ?? `trial:${row.user_id}`,
        user_id: row.user_id, name: row.name, email: row.email,
        plan_code: row.plan_code ?? TAROT_SUBSCRIPTION_ITEM_ID,
        status: entitlement.status, amount: row.amount ?? 600,
        trial_started_at: entitlement.trial_started_at,
        trial_ends_at: entitlement.trial_ends_at,
        trial_used_at: entitlement.trial_used_at,
        subscription_started_at: entitlement.subscription_started_at,
        access_until: entitlement.access_until,
        payment_status: entitlement.payment_status,
        started_at: row.started_at, last_payment_at: row.last_payment_at,
        next_billing_at: row.next_billing_at, current_period_end: row.current_period_end,
        cancelled_at: row.cancelled_at, merchant_trade_no: row.merchant_trade_no ?? '—',
        ecpay_trade_no: row.ecpay_trade_no, created_at: row.member_created_at, payments: [],
      };
      members.set(row.user_id, member);
    }
    if (row.charge_id) member.payments.push({
      id: row.charge_id, billing_cycle: row.billing_cycle ?? 0,
      amount: row.charge_amount ?? 0, status: row.charge_status ?? 'unknown',
      paid_at: row.paid_at, merchant_trade_no: row.charge_merchant_trade_no,
      ecpay_trade_no: row.charge_ecpay_trade_no,
    });
  }

  const list = [...members.values()];
  const payments = list.flatMap((member) => member.payments);
  return json(req, env, {
    subscriptions: list,
    summary: {
      subscriptions: list.length,
      active: list.filter((member) => ['trialing', 'active', 'canceled_active'].includes(String(member.status))).length,
      paid_transactions: payments.filter((payment) => payment.status === 'paid').length,
      revenue: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0),
    },
  });
}
