-- 密碼重設驗證碼。
--
-- 設計重點:
--   * code_hash 不存明碼 — DB 外洩時驗證碼也無法直接用
--   * 每張 code 一次性,用過或過期就不能再用
--   * attempts 計數錯誤次數,超過 5 次自動失效防爆破
--   * 同一 email 1 小時內最多 3 張(在 worker 那層 query 控制)
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,            -- SHA-256(code) hex
  expires_at  TEXT NOT NULL,            -- ISO datetime
  used_at     TEXT,                     -- ISO datetime; NULL = 還沒用過
  attempts    INTEGER NOT NULL DEFAULT 0,
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prc_email_created ON password_reset_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prc_expires       ON password_reset_codes(expires_at);
