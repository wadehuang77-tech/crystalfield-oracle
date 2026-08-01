CREATE TABLE IF NOT EXISTS google_forms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_google_forms_active
  ON google_forms(is_active, deleted_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS button_link_settings (
  button_key     TEXT PRIMARY KEY,
  google_form_id TEXT,
  updated_by     TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (google_form_id) REFERENCES google_forms(id)
);

INSERT OR IGNORE INTO google_forms (
  id,
  name,
  url,
  is_active,
  created_at,
  updated_at
) VALUES (
  'google-form-ai-tarot-design',
  'AI 塔羅設計學說明會',
  'https://forms.gle/DrFhpNTcYBPYq7667',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO button_link_settings (
  button_key,
  google_form_id,
  updated_at
) VALUES (
  'resonance-ai-tarot-design',
  'google-form-ai-tarot-design',
  datetime('now')
);
