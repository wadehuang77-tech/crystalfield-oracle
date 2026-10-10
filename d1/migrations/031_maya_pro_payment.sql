CREATE TABLE maya_pro_payment_orders (
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
CREATE TABLE maya_pro_payment_adjustments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES maya_pro_payment_orders(order_id),
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK(action IN ('refunded','revoked')),
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE maya_pro_entitlements (
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
CREATE INDEX idx_maya_pro_entitlements_owner ON maya_pro_entitlements(user_id,status);
