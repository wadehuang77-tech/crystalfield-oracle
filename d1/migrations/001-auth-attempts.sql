-- 紀錄登入失敗嘗試,用來實作簡易 rate limit。
-- 同一 email 在 15 分鐘內失敗超過 5 次就會被擋。
CREATE TABLE IF NOT EXISTS auth_attempts (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email   ON auth_attempts(email);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created ON auth_attempts(created_at);
