-- Additive proposal / isolated local tests only. Never auto-apply to production.
CREATE TABLE IF NOT EXISTS maya_relationship_payment_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  product_code TEXT NOT NULL CHECK(product_code='MAYA_RELATIONSHIP_899'),
  merchant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
  checkout_key TEXT NOT NULL,
  trade_no TEXT UNIQUE,
  payment_state TEXT NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','refunded','revoked')),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(user_id,checkout_key)
);
CREATE TABLE IF NOT EXISTS maya_relationship_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL CHECK(product_code='MAYA_RELATIONSHIP_899'),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL CHECK(status IN ('active','revoked','expired')),
  source TEXT NOT NULL CHECK(source='verified_payment'),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maya_relationship_entitlements_owner ON maya_relationship_entitlements(user_id,status);
CREATE TABLE IF NOT EXISTS maya_relationship_payment_adjustments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES maya_relationship_payment_orders(order_id),
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK(action IN ('refunded','revoked')),
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
-- Report tables/Schema will be proposed after the original twelve-chapter specification is provided.
