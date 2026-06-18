-- ============================================================================
-- Cloudflare D1 (SQLite) Schema
-- 從 Supabase PostgreSQL 轉換而來,並加上自建 Auth 需要的欄位
--
-- 執行方式:
--   wrangler d1 execute bolt-tarot --file=./d1/schema.sql
--   wrangler d1 execute bolt-tarot --file=./d1/seed.sql
-- ============================================================================

-- 可重複執行(開發時常用)
DROP TABLE IF EXISTS reading_unlocks;
DROP TABLE IF EXISTS advanced_reading_unlocks;
DROP TABLE IF EXISTS conversion_events;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS email_leads;
DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS admins;

-- ---------------------------------------------------------------------------
-- profiles:使用者個人資料 + 自建 Auth 的密碼雜湊
--   password_hash 用 scrypt/PBKDF2 等慢雜湊,前綴格式 "algo:params:salt:hash"
--   現有匯入資料的 password_hash 會是 NULL,代表「從 Supabase 匯入的舊帳號還沒有密碼」
--   這些用戶第一次登入時得走「忘記密碼」或由 admin 手動重設
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id                TEXT    PRIMARY KEY,
  email             TEXT    NOT NULL UNIQUE,
  password_hash     TEXT,
  created_at        TEXT    DEFAULT (datetime('now')),
  updated_at        TEXT    DEFAULT (datetime('now')),
  age               INTEGER,
  gender            TEXT,
  occupation        TEXT,
  healing_interest  TEXT,
  purchased_spreads TEXT    DEFAULT '[]'  -- JSON array
);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ---------------------------------------------------------------------------
-- admins:管理員(id 對應 profiles.id)
-- ---------------------------------------------------------------------------
CREATE TABLE admins (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- emails:訪客留信 (email 去重)
-- ---------------------------------------------------------------------------
CREATE TABLE emails (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  source     TEXT NOT NULL DEFAULT 'single_card'
);

-- ---------------------------------------------------------------------------
-- leads:解鎖嘗試紀錄 (email 去重)
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'single_card',
  created_at TEXT DEFAULT (datetime('now')),
  status     TEXT NOT NULL DEFAULT 'success'
);

-- ---------------------------------------------------------------------------
-- email_leads:早期留信表(向下相容)
-- ---------------------------------------------------------------------------
CREATE TABLE email_leads (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  source            TEXT NOT NULL,
  created_at        TEXT    DEFAULT (datetime('now')),
  converted_to_user INTEGER DEFAULT 0,
  user_id           TEXT
);
CREATE INDEX idx_email_leads_email      ON email_leads(email);
CREATE INDEX idx_email_leads_created_at ON email_leads(created_at DESC);

-- ---------------------------------------------------------------------------
-- reading_unlocks:單張牌解鎖紀錄
-- ---------------------------------------------------------------------------
CREATE TABLE reading_unlocks (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  reading_type TEXT NOT NULL,
  card_data    TEXT NOT NULL,
  unlocked_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_reading_unlocks_email ON reading_unlocks(email);

-- ---------------------------------------------------------------------------
-- advanced_reading_unlocks:進階牌陣解鎖紀錄
-- ---------------------------------------------------------------------------
CREATE TABLE advanced_reading_unlocks (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  reading_type TEXT NOT NULL,
  unlocked_at  TEXT DEFAULT (datetime('now')),
  card_data    TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_advanced_reading_unlocks_email        ON advanced_reading_unlocks(email);
CREATE INDEX idx_advanced_reading_unlocks_reading_type ON advanced_reading_unlocks(reading_type);
CREATE INDEX idx_advanced_reading_unlocks_created_at   ON advanced_reading_unlocks(created_at DESC);

-- ---------------------------------------------------------------------------
-- conversion_events:轉換漏斗事件
-- ---------------------------------------------------------------------------
CREATE TABLE conversion_events (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_conversion_events_email      ON conversion_events(email);
CREATE INDEX idx_conversion_events_user_id    ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at DESC);

-- ---------------------------------------------------------------------------
-- events:KPI 事件 (page_view / email_submit / pay_success)
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  meta       TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX events_type_created_idx ON events(event_type, created_at DESC);
CREATE INDEX events_created_idx      ON events(created_at DESC);
