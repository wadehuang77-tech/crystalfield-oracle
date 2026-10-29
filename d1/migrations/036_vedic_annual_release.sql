-- Additive release support; existing annual snapshots and grants are unchanged.
CREATE TABLE vedic_annual_checkout (
 case_id TEXT PRIMARY KEY REFERENCES vedic_annual_cases(id),
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 merchant_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE vedic_annual_jobs (
 id TEXT PRIMARY KEY,
 report_id TEXT NOT NULL REFERENCES vedic_annual_reports(id),
 user_id TEXT NOT NULL REFERENCES profiles(id),
 state TEXT NOT NULL CHECK(state IN ('active','completed','failed')),
 ai_state TEXT NOT NULL DEFAULT 'none' CHECK(ai_state IN ('none','reserved','completed','failed','unknown')),
 reserved_twd REAL NOT NULL DEFAULT 0,
 input_tokens INTEGER,
 output_tokens INTEGER,
 created_at TEXT NOT NULL DEFAULT(datetime('now')),
 updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE UNIQUE INDEX vedic_annual_active_owner ON vedic_annual_jobs(user_id) WHERE state='active';
CREATE UNIQUE INDEX vedic_annual_active_report ON vedic_annual_jobs(report_id) WHERE state='active';
ALTER TABLE vedic_annual_reports ADD COLUMN facts_json TEXT;
