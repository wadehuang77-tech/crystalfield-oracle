CREATE TABLE IF NOT EXISTS numerology_share_capabilities (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  order_id    TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_numerology_share_capabilities_order
  ON numerology_share_capabilities(order_id, expires_at);

CREATE TABLE IF NOT EXISTS numerology_share_results (
  id                TEXT PRIMARY KEY,
  section_key       TEXT NOT NULL,
  numerology_number INTEGER NOT NULL,
  section_name      TEXT NOT NULL,
  plan_name         TEXT NOT NULL,
  share_scope       TEXT NOT NULL,
  summary           TEXT NOT NULL,
  guidance          TEXT NOT NULL,
  highlights_json   TEXT NOT NULL DEFAULT '[]',
  image_mime        TEXT NOT NULL DEFAULT 'image/jpeg',
  image_base64      TEXT NOT NULL,
  revoke_token_hash TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  expires_at        TEXT NOT NULL,
  revoked_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_numerology_share_results_expires
  ON numerology_share_results(expires_at, revoked_at);
