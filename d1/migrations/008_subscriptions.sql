CREATE TABLE IF NOT EXISTS subscriptions (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL,
  order_id                 TEXT NOT NULL,
  merchant_trade_no        TEXT NOT NULL UNIQUE,
  item_id                  TEXT NOT NULL,
  amount                   INTEGER NOT NULL,
  period_type              TEXT NOT NULL DEFAULT 'M',
  frequency                INTEGER NOT NULL DEFAULT 1,
  exec_times               INTEGER NOT NULL DEFAULT 99,
  status                   TEXT NOT NULL DEFAULT 'pending',
  ecpay_exec_status        TEXT,
  total_success_times      INTEGER NOT NULL DEFAULT 0,
  total_success_amount     INTEGER NOT NULL DEFAULT 0,
  first_trade_no           TEXT,
  first_gwsr               TEXT,
  first_auth_code          TEXT,
  card6no                  TEXT,
  card4no                  TEXT,
  first_paid_at            TEXT,
  last_paid_at             TEXT,
  current_period_started_at TEXT,
  current_period_ends_at   TEXT,
  cancel_requested_at      TEXT,
  cancelled_at             TEXT,
  completed_at             TEXT,
  last_charge_status       TEXT,
  last_error_message       TEXT,
  last_synced_at           TEXT,
  raw_last_query           TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_created
  ON subscriptions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS subscription_charges (
  id                TEXT PRIMARY KEY,
  subscription_id   TEXT NOT NULL,
  cycle_index       INTEGER NOT NULL,
  amount            INTEGER NOT NULL,
  rtn_code          TEXT NOT NULL,
  rtn_msg           TEXT,
  trade_no          TEXT,
  gwsr              TEXT,
  auth_code         TEXT,
  process_date      TEXT,
  raw_callback      TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id, cycle_index)
);

CREATE INDEX IF NOT EXISTS idx_subscription_charges_subscription
  ON subscription_charges(subscription_id, cycle_index DESC);
