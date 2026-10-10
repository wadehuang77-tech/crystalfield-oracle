-- Content-only copy of the migration 025 table for the separate sandbox cards DB.
-- Customer retains its empty table because the existing API still uses DB.
CREATE TABLE maya_kin_content (
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
