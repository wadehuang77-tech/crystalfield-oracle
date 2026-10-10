-- Additive live report storage, distinct from local-only Pro Mock reports.
CREATE TABLE maya_premium_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  entitlement_id TEXT NOT NULL,
  product_code TEXT NOT NULL CHECK(product_code IN ('MAYA_SOUL_MISSION_PRO_699','MAYA_RELATIONSHIP_899')),
  locale TEXT NOT NULL CHECK(locale IN ('zh-TW','en')),
  report_version TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES maya_kin_profiles(id) ON DELETE CASCADE,
  relationship_profile_id TEXT REFERENCES maya_kin_profiles(id) ON DELETE CASCADE,
  request_fingerprint TEXT NOT NULL,
  inputs TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','completed','blocked')),
  report_content TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(user_id,order_id,locale,report_version),
  CHECK((product_code='MAYA_SOUL_MISSION_PRO_699' AND relationship_profile_id IS NULL AND report_version='dreamspell-soul-mission-pro-v1')
    OR (product_code='MAYA_RELATIONSHIP_899' AND relationship_profile_id IS NOT NULL AND report_version='dreamspell-relationship-blueprint-v2'))
);
CREATE INDEX idx_maya_premium_reports_owner ON maya_premium_reports(user_id,product_code,locale,created_at);
CREATE TABLE maya_premium_ai_budgets (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  reserved_twd REAL NOT NULL DEFAULT 0 CHECK(reserved_twd>=0 AND reserved_twd<=4)
);
CREATE TABLE maya_premium_ai_sections (
  report_id TEXT NOT NULL REFERENCES maya_premium_reports(id) ON DELETE CASCADE,
  section_index INTEGER NOT NULL CHECK(section_index BETWEEN 0 AND 14),
  state TEXT NOT NULL CHECK(state IN ('reserved','completed','rejected','unknown')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK(attempts BETWEEN 1 AND 3),
  content TEXT,
  reserved_twd REAL NOT NULL CHECK(reserved_twd>0),
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK(input_tokens>=0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
  actual_cost_twd REAL NOT NULL DEFAULT 0 CHECK(actual_cost_twd>=0),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  PRIMARY KEY(report_id,section_index)
);
