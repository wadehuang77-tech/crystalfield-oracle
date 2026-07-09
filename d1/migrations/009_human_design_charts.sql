CREATE TABLE IF NOT EXISTS hd_charts (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  user_id       TEXT,
  user_name     TEXT DEFAULT '',
  user_email    TEXT DEFAULT '',
  birth_date    TEXT NOT NULL,
  birth_time    TEXT DEFAULT '',
  birth_city    TEXT DEFAULT '',
  hd_type       TEXT NOT NULL DEFAULT '',
  hd_profile    TEXT NOT NULL DEFAULT '',
  hd_authority  TEXT NOT NULL DEFAULT '',
  chart_data    TEXT NOT NULL DEFAULT '{}',
  chat_answers  TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hd_charts_session ON hd_charts(session_id);
CREATE INDEX IF NOT EXISTS idx_hd_charts_user    ON hd_charts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hd_charts_email   ON hd_charts(user_email);
