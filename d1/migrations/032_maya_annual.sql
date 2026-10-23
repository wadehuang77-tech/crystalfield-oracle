CREATE TABLE maya_annual_payment_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  product_code TEXT NOT NULL CHECK(product_code='MAYA_ANNUAL_599'),
  merchant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
  checkout_key TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  trade_no TEXT UNIQUE,
  payment_state TEXT NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','refunded','revoked')),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(user_id,checkout_key)
);
CREATE TABLE maya_annual_payment_adjustments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES maya_annual_payment_orders(order_id),
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK(action IN ('refunded','revoked')),
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE maya_annual_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL CHECK(product_code='MAYA_ANNUAL_599'),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL CHECK(status IN ('active','revoked','expired')),
  source TEXT NOT NULL CHECK(source IN ('local_mock','verified_payment')),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(id,user_id,order_id)
);
CREATE INDEX idx_maya_annual_entitlements_owner ON maya_annual_entitlements(user_id,status);

CREATE UNIQUE INDEX idx_maya_annual_active_purchase ON maya_annual_payment_orders(user_id,birth_date,period_start) WHERE payment_state IN ('pending','paid');
CREATE TRIGGER maya_annual_snapshot_immutable BEFORE UPDATE OF birth_date,period_start,period_end,snapshot_json,product_code,user_id ON maya_annual_payment_orders BEGIN SELECT RAISE(ABORT,'Immutable annual purchase'); END;
CREATE TABLE maya_annual_reports (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES maya_annual_payment_orders(order_id),
 user_id TEXT NOT NULL REFERENCES profiles(id),
 locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','failed','blocked','completed')),
 sections_json TEXT NOT NULL DEFAULT '[]',
 report_json TEXT,
 error TEXT,
 lease_until TEXT,
 created_at TEXT NOT NULL DEFAULT(datetime('now')),
 updated_at TEXT NOT NULL DEFAULT(datetime('now')),
 UNIQUE(order_id,locale)
);
CREATE TABLE maya_annual_ai_attempts (
 id TEXT PRIMARY KEY,
 report_id TEXT NOT NULL REFERENCES maya_annual_reports(id),
 section_index INTEGER NOT NULL CHECK(section_index BETWEEN 0 AND 9),
 state TEXT NOT NULL CHECK(state IN ('reserved','completed','failed','unknown')),
 body TEXT,
 input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0,
 cost_twd REAL NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE UNIQUE INDEX idx_maya_annual_section_lock ON maya_annual_ai_attempts(report_id,section_index) WHERE state IN ('reserved','completed','unknown');
