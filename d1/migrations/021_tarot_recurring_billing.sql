-- Expand the existing tarot subscription tables for real ECPay recurring billing.
-- This migration is intentionally not applied automatically; use the guarded
-- d1-migrations workflow after the application code has been reviewed.

ALTER TABLE subscriptions ADD COLUMN email TEXT;
ALTER TABLE subscriptions ADD COLUMN plan_code TEXT;
ALTER TABLE subscriptions ADD COLUMN currency TEXT NOT NULL DEFAULT 'TWD';
ALTER TABLE subscriptions ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'recurring';
ALTER TABLE subscriptions ADD COLUMN started_at TEXT;
ALTER TABLE subscriptions ADD COLUMN last_payment_at TEXT;
ALTER TABLE subscriptions ADD COLUMN next_billing_at TEXT;
ALTER TABLE subscriptions ADD COLUMN ended_at TEXT;
ALTER TABLE subscriptions ADD COLUMN ecpay_trade_no TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_start TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_end TEXT;
ALTER TABLE subscriptions ADD COLUMN billing_anchor_day INTEGER;
ALTER TABLE subscriptions ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0;

UPDATE subscriptions
SET email = (SELECT email FROM profiles WHERE profiles.id = subscriptions.user_id),
    plan_code = item_id,
    started_at = first_paid_at,
    last_payment_at = last_paid_at,
    next_billing_at = current_period_ends_at,
    ended_at = completed_at,
    ecpay_trade_no = first_trade_no,
    current_period_start = current_period_started_at,
    current_period_end = current_period_ends_at,
    billing_anchor_day = CASE
      WHEN first_paid_at IS NOT NULL THEN CAST(strftime('%d', first_paid_at) AS INTEGER)
      ELSE NULL
    END,
    cancel_requested = CASE WHEN cancel_requested_at IS NULL THEN 0 ELSE 1 END;

UPDATE subscriptions SET status = 'payment_failed' WHERE status IN ('failed', 'past_due');
UPDATE subscriptions SET status = 'ended' WHERE status IN ('completed', 'expired');

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status
  ON subscriptions(plan_code, status, updated_at DESC);

-- Rebuild the existing history table so retries and a later successful charge
-- in the same billing cycle can coexist, while exact callback replays remain
-- blocked by idempotency_key.
CREATE TABLE subscription_charges_recurring (
  id                 TEXT PRIMARY KEY,
  subscription_id    TEXT NOT NULL,
  user_id            TEXT,
  plan_code           TEXT NOT NULL DEFAULT 'tarot_monthly_600',
  merchant_trade_no  TEXT,
  ecpay_trade_no     TEXT,
  amount             INTEGER NOT NULL,
  payment_type       TEXT NOT NULL DEFAULT 'recurring_payment',
  billing_cycle      INTEGER NOT NULL,
  status             TEXT NOT NULL,
  paid_at            TEXT,
  raw_reference      TEXT NOT NULL,
  idempotency_key    TEXT NOT NULL UNIQUE,
  cycle_index        INTEGER NOT NULL,
  rtn_code           TEXT NOT NULL,
  rtn_msg             TEXT,
  trade_no            TEXT,
  gwsr                TEXT,
  auth_code           TEXT,
  process_date        TEXT,
  raw_callback        TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO subscription_charges_recurring (
  id, subscription_id, user_id, plan_code, merchant_trade_no,
  ecpay_trade_no, amount, payment_type, billing_cycle, status,
  paid_at, raw_reference, idempotency_key, cycle_index, rtn_code,
  rtn_msg, trade_no, gwsr, auth_code, process_date, raw_callback, created_at
)
SELECT
  c.id,
  c.subscription_id,
  s.user_id,
  COALESCE(s.plan_code, s.item_id, 'tarot_monthly_600'),
  s.merchant_trade_no,
  c.trade_no,
  c.amount,
  CASE WHEN c.cycle_index = 1 THEN 'first_payment' ELSE 'recurring_payment' END,
  c.cycle_index,
  CASE WHEN c.rtn_code = '1' THEN 'paid' ELSE 'failed' END,
  CASE WHEN c.rtn_code = '1' THEN c.process_date ELSE NULL END,
  c.raw_callback,
  'legacy:' || c.id,
  c.cycle_index,
  c.rtn_code,
  c.rtn_msg,
  c.trade_no,
  c.gwsr,
  c.auth_code,
  c.process_date,
  c.raw_callback,
  c.created_at
FROM subscription_charges c
LEFT JOIN subscriptions s ON s.id = c.subscription_id;

DROP TABLE subscription_charges;
ALTER TABLE subscription_charges_recurring RENAME TO subscription_charges;

CREATE INDEX idx_subscription_charges_subscription
  ON subscription_charges(subscription_id, billing_cycle DESC, created_at DESC);
CREATE INDEX idx_subscription_charges_revenue
  ON subscription_charges(plan_code, status, paid_at DESC);
