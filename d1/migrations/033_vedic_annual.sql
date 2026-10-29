-- Preparation-only release. No annual checkout or AI generation is enabled by this migration.
CREATE TABLE vedic_annual_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  chart_id TEXT NOT NULL REFERENCES vedic_charts(id),
  product_code TEXT NOT NULL CHECK(product_code='vedic_annual'),
  fingerprint TEXT NOT NULL,
  year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2100),
  timezone TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end_exclusive TEXT NOT NULL,
  birth_snapshot_json TEXT NOT NULL CHECK(json_valid(birth_snapshot_json)),
  calculation_json TEXT NOT NULL CHECK(json_valid(calculation_json)),
  settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
  calculation_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_data' CHECK(status IN ('awaiting_data','ready')),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(user_id,fingerprint)
);
CREATE INDEX idx_vedic_annual_cases_owner ON vedic_annual_cases(user_id,created_at);
CREATE TRIGGER vedic_annual_case_immutable BEFORE UPDATE OF user_id,chart_id,product_code,fingerprint,year,timezone,period_start,period_end_exclusive,birth_snapshot_json,calculation_json,settings_json,calculation_version,prompt_version ON vedic_annual_cases
BEGIN SELECT RAISE(ABORT,'Immutable annual case snapshot'); END;
CREATE TABLE vedic_annual_entitlements (
  case_id TEXT PRIMARY KEY REFERENCES vedic_annual_cases(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL CHECK(amount>0),
  status TEXT NOT NULL CHECK(status IN ('active','revoked','refunded')),
  source TEXT NOT NULL CHECK(source='verified_payment'),
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE vedic_annual_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES vedic_annual_cases(id),
  language TEXT NOT NULL CHECK(language IN ('zh-Hant','en')),
  status TEXT NOT NULL CHECK(status IN ('pending','calculating','generating','saving','completed','failed','blocked')),
  content_json TEXT CHECK(content_json IS NULL OR json_valid(content_json)),
  prompt_version TEXT NOT NULL,
  error_code TEXT,
  job_id TEXT,
  lease_until TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(case_id,language),
  CHECK(status!='completed' OR content_json IS NOT NULL)
);
