CREATE TABLE IF NOT EXISTS multi_spread_free_unlocks (
  id         TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  spread_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(email_hash, spread_id)
);

CREATE INDEX IF NOT EXISTS idx_multi_spread_free_unlocks_created
  ON multi_spread_free_unlocks(created_at DESC);
