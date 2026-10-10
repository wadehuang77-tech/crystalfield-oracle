-- Local/sandbox only. Keep migration 025 and existing payment tables intact.
CREATE TABLE IF NOT EXISTS maya_sandbox_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  product_code TEXT NOT NULL CHECK (product_code IN ('MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699')),
  merchant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  checkout_key TEXT NOT NULL,
  trade_no TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, checkout_key)
);
