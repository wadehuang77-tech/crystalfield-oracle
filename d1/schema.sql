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
DROP TABLE IF EXISTS hd_fixed_knowledge;
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
  generation_mode TEXT NOT NULL DEFAULT 'fixed',
  is_paid     INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO hd_report_section_defs (id, sort_order, icon, title, focus, generation_mode, is_paid, active)
VALUES
  ('centers', 1, '◉', '九大中心完整解析', '逐一分析頭頂、邏輯、喉嚨、G中心、心臟、薦骨、情緒、脾臟、根部中心的定義狀態、制約入口與能量校準方式。', 'fixed', 1, 1),
  ('gates', 2, '✦', '64 閘門分析', '解析個案關鍵閘門的天賦語彙、陰影模式、成熟表達與日常練習。', 'fixed', 1, 1),
  ('channels', 3, '◈', '通道分析', '說明主要通道如何形成穩定能量迴路，並連結到行動風格、關係互動與工作節奏。', 'fixed', 1, 1),
  ('personality', 4, '◇', 'AI 深度人格分析', '整合類型、策略、權威、人生角色與本命十字，產出可閱讀的人格藍圖。', 'openai', 1, 1),
  ('prescription', 5, '★', 'AI 能量處方', '提供具體的能量管理、決策練習、環境調整與七日校準建議。', 'openai', 1, 1),
  ('career', 6, '◎', 'AI 職涯方向建議', '從天賦輸出方式、適合角色、合作條件與職涯風險點給出專業建議。', 'openai', 1, 1),
  ('love', 7, '◈', 'AI 愛情關係分析', '分析親密關係中的需求、界線、投射、溝通節奏與相處提醒。', 'openai', 1, 1),
  ('wealth', 8, '◇', 'AI 財富能量模式', '解析金錢決策、價值交換、接案/創業/收入模式與豐盛阻塞。', 'openai', 1, 1),
  ('mission', 9, '✦', 'AI 靈魂使命', '以本命十字、人生角色與主要通道總結靈魂任務、成熟方向與年度提醒。', 'openai', 1, 1);

CREATE TABLE hd_fixed_knowledge (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category, key)
);
CREATE INDEX idx_hd_fixed_knowledge_category
  ON hd_fixed_knowledge(category, sort_order, key);

INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
VALUES
  ('type-generator', 'type', 'generator', '生產者', '生產者擁有穩定的薦骨生命力，核心策略是等待回應。當身體對外界刺激產生清楚的「是」，能量會自然展開。', 1, 1),
  ('type-manifesting-generator', 'type', 'manifesting-generator', '顯示生產者', '顯示生產者同時具備薦骨續航與快速轉向能力，策略是等待回應後告知。', 2, 1),
  ('type-projector', 'type', 'projector', '投射者', '投射者適合洞察、引導與管理系統，等待正確邀請與認可是成功關鍵。', 3, 1),
  ('type-manifestor', 'type', 'manifestor', '顯化者', '顯化者是啟動型能量，行動前告知能降低阻力並創造和平。', 4, 1),
  ('type-reflector', 'type', 'reflector', '反映者', '反映者九大中心皆未定義，能敏銳映照環境狀態，重大決定需等待月亮週期。', 5, 1),
  ('authority-sacral', 'authority', 'sacral', '薦骨權威', '薦骨權威透過身體即時反應做決定，是生命力對選項的直接回應。', 1, 1),
  ('authority-emotional', 'authority', 'emotional', '情緒權威', '情緒權威需要等待情緒波浪走完整，清明來自時間沉澱後仍穩定的感受。', 2, 1),
  ('authority-splenic', 'authority', 'splenic', '脾臟權威', '脾臟權威是安靜短暫的直覺訊號，關於當下是否健康安全。', 3, 1),
  ('authority-ego', 'authority', 'ego', '自我權威', '自我權威透過真實意志與承諾感做決定，重點是辨識自己是否真的想要。', 4, 1),
  ('authority-self-projected', 'authority', 'self-projected', '自我投射權威', '自我投射權威需要透過說出來聽見自己的方向。', 5, 1),
  ('authority-lunar', 'authority', 'lunar', '月亮權威', '月亮權威屬於反映者，透過約 28 天的月亮週期取得清明。', 6, 1),
  ('definition-none', 'definition', 'none', '無定義', '無定義代表沒有固定中心連接，是強大的環境感知能力。', 1, 1),
  ('definition-single', 'definition', 'single', '單一定義', '單一定義表示已定義中心連成一組，內在運作較一致。', 2, 1),
  ('definition-split', 'definition', 'split', '雙重定義', '雙重定義表示能量分成兩組，容易被能橋接兩組能量的人吸引。', 3, 1),
  ('definition-multiple', 'definition', 'multiple', '多重定義', '多重定義表示能量組更複雜，需要時間與互動讓不同面向整合。', 4, 1),
  ('center-head', 'center', 'head', '頭頂中心', '頭頂中心關於靈感、疑問與壓力來源。', 1, 1),
  ('center-ajna', 'center', 'ajna', '邏輯中心', '邏輯中心關於概念、分析與理解方式。', 2, 1),
  ('center-throat', 'center', 'throat', '喉嚨中心', '喉嚨中心關於表達、行動與被看見。', 3, 1),
  ('center-g', 'center', 'g', 'G 中心', 'G 中心關於方向、身份與愛。', 4, 1),
  ('center-heart', 'center', 'heart', '心臟中心', '心臟中心關於意志、價值與承諾。', 5, 1),
  ('center-sacral', 'center', 'sacral', '薦骨中心', '薦骨中心關於生命力、工作能量與身體回應。', 6, 1),
  ('center-solar-plexus', 'center', 'solar-plexus', '情緒中心', '情緒中心關於情緒波、感受與親密需求。', 7, 1),
  ('center-spleen', 'center', 'spleen', '脾臟中心', '脾臟中心關於直覺、健康與生存感。', 8, 1),
  ('center-root', 'center', 'root', '根部中心', '根部中心關於壓力、推進與腎上腺動能。', 9, 1);

UPDATE hd_fixed_knowledge
SET body = CASE key
  WHEN 'head' THEN '頭頂中心可以把它想成「靈感和問題的入口」。這裡會讓人開始思考人生、未來、意義、方向，也會帶來想弄懂事情的壓力。如果你的頭頂中心是定義的，通常代表你有比較固定的提問方式；如果是開放的，你可能很容易接收到別人的焦慮和疑問。白話來說，有些問題只是經過你，不一定需要你全部解決。'
  WHEN 'ajna' THEN '邏輯中心可以理解成「整理想法和形成觀點的地方」。它負責分析、比較、理解、分類，也會讓你想把事情說清楚。定義時思考模式較固定；開放時能看見不同角度，但也可能為了顯得確定而硬下結論。白話來說，你不必急著證明自己很懂，能容納不同觀點也是一種智慧。'
  WHEN 'throat' THEN '喉嚨中心可以想成「表達和行動的出口」。很多能量最後都想透過喉嚨被說出來、做出來、被別人看見。定義時表達較穩定；開放時會更受場合和對象影響。白話來說，開放喉嚨不是表達不好，而是需要等對的時機，不必為了被注意而急著說。'
  WHEN 'g' THEN 'G 中心可以理解成「我是誰、我要往哪裡走、我如何愛人」的中心。它和身份感、方向感、歸屬感很有關。定義時自我感較穩；開放時你可能在不同人身邊像變成不同版本。白話來說，開放 G 中心的人不是沒有自我，而是很吃環境，選對人和地方非常重要。'
  WHEN 'heart' THEN '心臟中心也常被稱為意志中心，可以把它想成「承諾、價值感、想不想證明自己」的地方。定義時有固定意志力；開放時可能不自覺想證明自己夠好。白話來說，你不需要靠硬撐、逞強或一直答應別人來換取價值，誠實說不反而更健康。'
  WHEN 'sacral' THEN '薦骨中心可以理解成「生命力和工作能量的馬達」。它跟體力、持續投入、喜不喜歡一件事很有關。定義時有穩定續航力，但前提是身體真的有回應；開放時不適合長時間跟著別人的節奏硬撐。白話來說，身體的有力或沒力，比頭腦說服更重要。'
  WHEN 'solar-plexus' THEN '情緒中心可以想成「情緒浪潮和感受深度」的地方。它會影響快樂、失落、期待、親密和衝突。定義時情緒有自己的波浪，需要時間沉澱；開放時很容易放大別人的情緒。白話來說，先等一下，確認這個情緒是不是你的，再決定要不要回應。'
  WHEN 'spleen' THEN '脾臟中心可以理解成「直覺、安全感和身體警訊」的地方。它常用很小、很快的感覺提醒你安全與否。定義時直覺較固定；開放時可能抓住熟悉但不健康的人事物。白話來說，脾臟訊號通常很安靜，練習聽見第一個微小反應會很有幫助。'
  WHEN 'root' THEN '根部中心可以想成「壓力和推進力」的來源。它像內在加速器，讓人想趕快開始、完成、解除壓力。定義時壓力節奏較固定；開放時容易接到外界壓力。白話來說，先分辨這個急迫感是真的需要行動，還是只是別人的壓力經過你。'
  ELSE body
END
WHERE category = 'center';

WITH channel_defs(key, title, sort_order) AS (
  VALUES
    ('34-57', '34-57 力量通道', 1), ('20-34', '20-34 超時通道', 2),
    ('1-8', '1-8 靈感通道', 3), ('13-33', '13-33 足跡通道', 4),
    ('2-14', '2-14 脈動通道', 5), ('5-15', '5-15 韻律通道', 6),
    ('11-56', '11-56 求知通道', 7), ('7-31', '7-31 阿爾法通道', 8),
    ('36-35', '36-35 多變通道', 9), ('19-49', '19-49 融合通道', 10),
    ('37-40', '37-40 共同通道', 11), ('6-59', '6-59 親密通道', 12),
    ('10-20', '10-20 警覺通道', 13), ('25-51', '25-51 啟動通道', 14),
    ('28-38', '28-38 掙扎通道', 15), ('39-55', '39-55 情緒通道', 16),
    ('26-44', '26-44 投降通道', 17), ('21-45', '21-45 貨幣通道', 18)
)
INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
SELECT
  'channel-' || key,
  'channel',
  key,
  title,
  title || ' 可以理解成兩個能量中心之間已經接好的線路。當這條通道出現在你的人類圖裡，代表這股能量比較固定，別人也比較容易從你身上感受到。它可能表現在工作方式、說話風格、人際互動或做決定的節奏上。白話來說，通道不是你必須隨時表演的能力，而是自然容易流露的特質；用在對的人、事、時機上，會比較像天賦，用在錯的地方就容易變壓力。',
  sort_order,
  1
FROM channel_defs;

WITH RECURSIVE gates(n) AS (
  VALUES(1)
  UNION ALL
  SELECT n + 1 FROM gates WHERE n < 64
)
INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
SELECT
  'gate-' || printf('%02d', n),
  'gate',
  CAST(n AS TEXT),
  '閘門 ' || n,
  '閘門 ' || n || ' 是人類圖 64 閘門中的固定知識單元，可以把它想成你生命裡某一種常被啟動的主題。它可能表現成天賦、興趣、反覆遇到的課題，也可能在壓力下變成卡住的模式。一般人不用先背很多專業名詞，只要先理解：閘門像一個按鈕，遇到特定的人、事、環境就會被按下。真正解讀時，還要看它位在哪個中心、是否接成通道，以及你是否按照自己的內在權威做決定。',
  n,
  1
FROM gates;

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
