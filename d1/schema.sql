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
DROP TABLE IF EXISTS hd_full_report_sections;
DROP TABLE IF EXISTS hd_full_reports;
DROP TABLE IF EXISTS hd_report_section_defs;
DROP TABLE IF EXISTS hd_charts;
DROP TABLE IF EXISTS email_leads;
DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS subscription_charges;
DROP TABLE IF EXISTS subscriptions;
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

-- ---------------------------------------------------------------------------
-- hd_charts: 人類圖計算結果與問答紀錄
-- ---------------------------------------------------------------------------
CREATE TABLE hd_charts (
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
CREATE INDEX idx_hd_charts_session ON hd_charts(session_id);
CREATE INDEX idx_hd_charts_user    ON hd_charts(user_id, created_at DESC);
CREATE INDEX idx_hd_charts_email   ON hd_charts(user_email);

-- ---------------------------------------------------------------------------
-- hd_report_section_defs: 人類圖完整版付費報告 9 大區塊定義
-- ---------------------------------------------------------------------------
CREATE TABLE hd_report_section_defs (
  id          TEXT PRIMARY KEY,
  sort_order  INTEGER NOT NULL UNIQUE,
  icon        TEXT NOT NULL,
  title       TEXT NOT NULL,
  focus       TEXT NOT NULL,
  is_paid     INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO hd_report_section_defs (id, sort_order, icon, title, focus, is_paid, active)
VALUES
  ('centers', 1, '◉', '九大中心完整解析', '逐一分析頭頂、邏輯、喉嚨、G中心、心臟、薦骨、情緒、脾臟、根部中心的定義狀態、制約入口與能量校準方式。', 1, 1),
  ('gates', 2, '✦', '64 閘門分析', '解析個案關鍵閘門的天賦語彙、陰影模式、成熟表達與日常練習。', 1, 1),
  ('channels', 3, '◈', '通道分析', '說明主要通道如何形成穩定能量迴路，並連結到行動風格、關係互動與工作節奏。', 1, 1),
  ('personality', 4, '◇', 'AI 深度人格分析', '整合類型、策略、權威、人生角色與本命十字，產出可閱讀的人格藍圖。', 1, 1),
  ('prescription', 5, '★', 'AI 能量處方', '提供具體的能量管理、決策練習、環境調整與七日校準建議。', 1, 1),
  ('career', 6, '◎', 'AI 職涯方向建議', '從天賦輸出方式、適合角色、合作條件與職涯風險點給出專業建議。', 1, 1),
  ('love', 7, '◈', 'AI 愛情關係分析', '分析親密關係中的需求、界線、投射、溝通節奏與相處提醒。', 1, 1),
  ('wealth', 8, '◇', 'AI 財富能量模式', '解析金錢決策、價值交換、接案/創業/收入模式與豐盛阻塞。', 1, 1),
  ('mission', 9, '✦', 'AI 靈魂使命', '以本命十字、人生角色與主要通道總結靈魂任務、成熟方向與年度提醒。', 1, 1);

-- ---------------------------------------------------------------------------
-- hd_full_reports / hd_full_report_sections: 付費後產生並保存的完整版報告內容
-- ---------------------------------------------------------------------------
CREATE TABLE hd_full_reports (
  id             TEXT PRIMARY KEY,
  chart_id       TEXT NOT NULL,
  session_id     TEXT NOT NULL DEFAULT '',
  user_id        TEXT,
  user_email     TEXT DEFAULT '',
  birth_date     TEXT NOT NULL DEFAULT '',
  birth_time     TEXT NOT NULL DEFAULT '',
  birth_city     TEXT NOT NULL DEFAULT '',
  hd_type        TEXT NOT NULL DEFAULT '',
  hd_profile     TEXT NOT NULL DEFAULT '',
  report_version TEXT NOT NULL DEFAULT 'professional-v1',
  chart_data     TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chart_id, report_version)
);
CREATE INDEX idx_hd_full_reports_chart ON hd_full_reports(chart_id, created_at DESC);
CREATE INDEX idx_hd_full_reports_user  ON hd_full_reports(user_id, created_at DESC);
CREATE INDEX idx_hd_full_reports_email ON hd_full_reports(user_email, created_at DESC);

CREATE TABLE hd_full_report_sections (
  id          TEXT PRIMARY KEY,
  report_id   TEXT NOT NULL,
  section_id  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL,
  icon        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(report_id, section_id)
);
CREATE INDEX idx_hd_full_report_sections_report
  ON hd_full_report_sections(report_id, sort_order);

-- ---------------------------------------------------------------------------
-- subscriptions: 月費會員定期定額主表
-- ---------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id                        TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL,
  order_id                  TEXT NOT NULL,
  merchant_trade_no         TEXT NOT NULL UNIQUE,
  item_id                   TEXT NOT NULL,
  amount                    INTEGER NOT NULL,
  period_type               TEXT NOT NULL DEFAULT 'M',
  frequency                 INTEGER NOT NULL DEFAULT 1,
  exec_times                INTEGER NOT NULL DEFAULT 99,
  status                    TEXT NOT NULL DEFAULT 'pending',
  ecpay_exec_status         TEXT,
  total_success_times       INTEGER NOT NULL DEFAULT 0,
  total_success_amount      INTEGER NOT NULL DEFAULT 0,
  first_trade_no            TEXT,
  first_gwsr                TEXT,
  first_auth_code           TEXT,
  card6no                   TEXT,
  card4no                   TEXT,
  first_paid_at             TEXT,
  last_paid_at              TEXT,
  current_period_started_at TEXT,
  current_period_ends_at    TEXT,
  cancel_requested_at       TEXT,
  cancelled_at              TEXT,
  completed_at              TEXT,
  last_charge_status        TEXT,
  last_error_message        TEXT,
  last_synced_at            TEXT,
  raw_last_query            TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_subscriptions_user_created ON subscriptions(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_status       ON subscriptions(status, updated_at DESC);

-- ---------------------------------------------------------------------------
-- subscription_charges: 每期授權紀錄
-- ---------------------------------------------------------------------------
CREATE TABLE subscription_charges (
  id              TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  cycle_index     INTEGER NOT NULL,
  amount          INTEGER NOT NULL,
  rtn_code        TEXT NOT NULL,
  rtn_msg         TEXT,
  trade_no        TEXT,
  gwsr            TEXT,
  auth_code       TEXT,
  process_date    TEXT,
  raw_callback    TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id, cycle_index)
);
CREATE INDEX idx_subscription_charges_subscription
  ON subscription_charges(subscription_id, cycle_index DESC);
