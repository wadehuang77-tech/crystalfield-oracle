-- 通用 rate limit 紀錄
-- (scope, rl_key) 的最近一段時間內計數,超過閾值即拒絕

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         TEXT PRIMARY KEY,
  scope      TEXT NOT NULL,                      -- 'cards-unlock' | 'save-email' | 'signup' | ...
  rl_key     TEXT NOT NULL,                      -- IP 或 email 或 user_id
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rl_scope_key_created ON rate_limit_events(scope, rl_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rl_created_at        ON rate_limit_events(created_at);
