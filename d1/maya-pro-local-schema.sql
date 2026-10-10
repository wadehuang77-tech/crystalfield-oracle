-- REVIEW PLAN / LOCAL TEST ONLY. Not in the auto-applied migration directory.
-- Independent additive tables preserve every legacy product CHECK, entitlement and report.
CREATE TABLE IF NOT EXISTS maya_pro_payment_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  product_code TEXT NOT NULL CHECK(product_code='MAYA_SOUL_MISSION_PRO_699'),
  merchant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
  checkout_key TEXT NOT NULL,
  trade_no TEXT UNIQUE,
  payment_state TEXT NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','refunded','revoked')),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(user_id,checkout_key)
);
CREATE TABLE IF NOT EXISTS maya_pro_payment_adjustments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES maya_pro_payment_orders(order_id),
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK(action IN ('refunded','revoked')),
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS maya_pro_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL CHECK(product_code='MAYA_SOUL_MISSION_PRO_699'),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL CHECK(status IN ('active','revoked','expired')),
  source TEXT NOT NULL CHECK(source IN ('local_mock','verified_payment')),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(id,user_id,order_id)
);
CREATE INDEX IF NOT EXISTS idx_maya_pro_entitlements_owner ON maya_pro_entitlements(user_id,status);
CREATE TABLE IF NOT EXISTS maya_pro_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id),
  profile_id TEXT NOT NULL REFERENCES maya_kin_profiles(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
  product_code TEXT NOT NULL CHECK(product_code='MAYA_SOUL_MISSION_PRO_699'),
  report_version TEXT NOT NULL CHECK(report_version='dreamspell-soul-mission-pro-v1'),
  request_fingerprint TEXT NOT NULL,
  report_content TEXT,
  status TEXT NOT NULL CHECK(status IN ('completed','blocked')),
  estimated_input_tokens INTEGER NOT NULL CHECK(estimated_input_tokens>=0),
  estimated_output_tokens INTEGER NOT NULL CHECK(estimated_output_tokens>=0),
  estimated_cost_twd REAL NOT NULL CHECK(estimated_cost_twd>=0),
  actual_cost_twd REAL NOT NULL DEFAULT 0 CHECK(actual_cost_twd=0),
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  FOREIGN KEY(entitlement_id,user_id,order_id) REFERENCES maya_pro_entitlements(id,user_id,order_id),
  UNIQUE(user_id,order_id,locale,report_version)
);
CREATE INDEX IF NOT EXISTS idx_maya_pro_reports_owner ON maya_pro_reports(user_id,created_at);
