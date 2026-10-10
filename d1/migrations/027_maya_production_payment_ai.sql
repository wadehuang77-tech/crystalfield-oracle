-- Additive only. Requires profiles/orders and migration 025.
-- Production payment metadata is intentionally separate from migration 026.
CREATE TABLE IF NOT EXISTS maya_payment_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  product_code TEXT NOT NULL CHECK (product_code IN ('MAYA_BASIC_199','MAYA_FULL_499','MAYA_RELATIONSHIP_699')),
  merchant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW','en')),
  checkout_key TEXT NOT NULL,
  trade_no TEXT UNIQUE,
  payment_state TEXT NOT NULL DEFAULT 'pending' CHECK (payment_state IN ('pending','paid','failed','refunded','revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, checkout_key)
);
CREATE TABLE IF NOT EXISTS maya_payment_adjustments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES maya_payment_orders(order_id),
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('refunded','revoked')),
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maya_payment_owner ON maya_payment_orders(user_id, payment_state);
CREATE TABLE IF NOT EXISTS maya_ai_budgets (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  reserved_twd REAL NOT NULL DEFAULT 0 CHECK (reserved_twd >= 0 AND reserved_twd <= 1),
  actual_twd REAL NOT NULL DEFAULT 0 CHECK (actual_twd >= 0)
);
CREATE TABLE IF NOT EXISTS maya_ai_sections (
  report_id TEXT NOT NULL REFERENCES maya_reports(id) ON DELETE CASCADE,
  section_index INTEGER NOT NULL CHECK (section_index BETWEEN 0 AND 6),
  state TEXT NOT NULL CHECK (state IN ('reserved','completed','failed','unknown')),
  body TEXT,
  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  reserved_twd REAL NOT NULL CHECK (reserved_twd > 0),
  cost_twd REAL NOT NULL DEFAULT 0 CHECK (cost_twd >= 0),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(report_id, section_index)
);
