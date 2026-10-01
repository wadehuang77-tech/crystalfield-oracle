-- Bilingual content scaffolding for the Crystal Field app.
-- This migration keeps the existing Chinese content and IDs intact and adds a
-- language-aware translation layer for content that must be displayed to users.
-- It is intentionally additive and does not overwrite any live user data.

CREATE TABLE IF NOT EXISTS i18n_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh-Hant', 'en')),
  field_name TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, locale, field_name)
);

CREATE INDEX IF NOT EXISTS idx_i18n_content_lookup
  ON i18n_content(entity_type, entity_id, locale, field_name);

CREATE TABLE IF NOT EXISTS i18n_route_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_path TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL CHECK (locale IN ('zh-Hant', 'en')),
  target_route TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Example usage (kept as documentation only, not executed automatically):
-- INSERT INTO i18n_route_aliases(route_path, locale, target_route)
-- VALUES ('/en/oracle', 'en', '/oracle');
-- INSERT INTO i18n_content(entity_type, entity_id, locale, field_name, value)
-- VALUES ('landing_page', 'hero', 'en', 'headline', 'Crystal Field');
