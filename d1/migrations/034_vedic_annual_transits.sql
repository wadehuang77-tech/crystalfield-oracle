-- Additive annual collection state; immutable natal/annual purchase snapshots are untouched.
CREATE TABLE vedic_annual_transits (
  case_id TEXT PRIMARY KEY REFERENCES vedic_annual_cases(id),
  version TEXT NOT NULL DEFAULT 'prokerala-sampled-v1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','collecting','completed','failed')),
  calls_used INTEGER NOT NULL DEFAULT 0 CHECK(calls_used BETWEEN 0 AND 64),
  samples_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(samples_json)),
  data_json TEXT CHECK(data_json IS NULL OR json_valid(data_json)),
  lock_token TEXT,
  lease_until TEXT,
  retry_at TEXT,
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  CHECK(status!='completed' OR data_json IS NOT NULL)
);
