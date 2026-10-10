-- Independent complimentary reports; never represent an ECPay payment or entitlement.
CREATE TABLE IF NOT EXISTS maya_admin_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('MAYA_BASIC_199','MAYA_FULL_499','MAYA_RELATIONSHIP_699')),
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW','en')),
  profile_id TEXT REFERENCES maya_kin_profiles(id),
  relationship_profile_id TEXT REFERENCES maya_kin_profiles(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  entitlement_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'pending' CHECK (report_status IN ('pending','processing','completed','failed')),
  report_content TEXT,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_twd REAL NOT NULL DEFAULT 0 CHECK (cost_twd >= 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  lease_expires_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,idempotency_key),
  UNIQUE(user_id,request_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_maya_admin_reports_owner ON maya_admin_reports(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS maya_admin_ai_sections (
  report_id TEXT NOT NULL REFERENCES maya_admin_reports(id) ON DELETE CASCADE,
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
  PRIMARY KEY(report_id,section_index)
);
