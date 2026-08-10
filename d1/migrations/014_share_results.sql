CREATE TABLE IF NOT EXISTS share_results (
  id           TEXT PRIMARY KEY,
  deck_id      TEXT NOT NULL,
  deck_name    TEXT NOT NULL,
  spread_name  TEXT NOT NULL,
  cards_json   TEXT NOT NULL,
  summary      TEXT NOT NULL,
  image_mime   TEXT NOT NULL DEFAULT 'image/jpeg',
  image_base64 TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_results_expires_at
  ON share_results(expires_at);
