-- Phase 2: additive migration. Apply only to an isolated local D1 during this phase.
CREATE TABLE IF NOT EXISTS maya_kin_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('personal', 'relationship')),
  birth_date TEXT NOT NULL,
  kin_number INTEGER NOT NULL CHECK (kin_number BETWEEN 1 AND 260),
  solar_seal INTEGER NOT NULL CHECK (solar_seal BETWEEN 1 AND 20),
  galactic_tone INTEGER NOT NULL CHECK (galactic_tone BETWEEN 1 AND 13),
  wavespell INTEGER NOT NULL CHECK (wavespell BETWEEN 1 AND 20),
  castle INTEGER NOT NULL CHECK (castle BETWEEN 1 AND 5),
  calculation_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, role)
);
CREATE TABLE IF NOT EXISTS maya_kin_content (
  kin_number INTEGER NOT NULL CHECK (kin_number BETWEEN 1 AND 260),
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  title TEXT NOT NULL,
  solar_seal_name TEXT NOT NULL,
  tone_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  strengths TEXT NOT NULL,
  challenges TEXT NOT NULL,
  growth_guidance TEXT NOT NULL,
  content_version TEXT NOT NULL,
  PRIMARY KEY (kin_number, locale, content_version)
);
CREATE TABLE IF NOT EXISTS maya_daily_energy (
  date TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  kin_number INTEGER NOT NULL CHECK (kin_number BETWEEN 1 AND 260),
  free_summary TEXT NOT NULL,
  premium_content TEXT,
  content_version TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (date, locale, content_version, calculation_version)
);
CREATE TABLE IF NOT EXISTS maya_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL CHECK (product_code IN ('MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699')),
  order_id TEXT NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  source TEXT NOT NULL CHECK (source IN ('local_mock', 'verified_payment')),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_id, product_code)
);
CREATE INDEX IF NOT EXISTS idx_maya_entitlements_owner ON maya_entitlements(user_id, status, product_code);
CREATE TABLE IF NOT EXISTS maya_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699')),
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  profile_id TEXT REFERENCES maya_kin_profiles(id),
  relationship_profile_id TEXT REFERENCES maya_kin_profiles(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  entitlement_id TEXT NOT NULL REFERENCES maya_entitlements(id),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'pending' CHECK (report_status IN ('pending', 'processing', 'completed', 'failed')),
  report_content TEXT,
  model_name TEXT NOT NULL DEFAULT 'mock-dreamspell-ai',
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
  UNIQUE(user_id, idempotency_key),
  UNIQUE(order_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_maya_reports_owner ON maya_reports(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS maya_rate_limits (
  scope TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bucket INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 1),
  PRIMARY KEY(scope, user_id, bucket)
);
