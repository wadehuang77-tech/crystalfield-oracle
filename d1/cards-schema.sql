-- ============================================================================
-- Cloudflare D1 (SQLite) — Tarot Cards Database
--
-- 這個資料庫只放牌組內容(各牌組的解讀文字、深度詮釋)。
-- 與客戶資料庫分離,只能透過 Worker 的驗證 endpoint 讀取。
--
-- 執行方式:
--   wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-schema.sql
--   wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-seed.sql
-- ============================================================================

DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS decks;

-- ---------------------------------------------------------------------------
-- decks:牌組目錄
-- ---------------------------------------------------------------------------
CREATE TABLE decks (
  id          TEXT    PRIMARY KEY,         -- 'tarot' / 'osho' / 'lightworker' / 'unicorns' / 'egyptian_gods' / 'work_your_light' / 'dragons'
  name        TEXT    NOT NULL,            -- 顯示名稱
  card_count  INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- cards:每張牌
--   preview_payload 是「免費可見」的部分:封面圖、名字、關鍵字、suit/number 等
--                  抽牌動畫和卡牌封面的 UI 需要這些資料才能顯示。
--   gated_payload   是「需要驗證才能拿到」的部分:牌義、深度解讀、脈輪、靈魂訊息等
--                  Worker 只會在 (a) email gate 通過(免費單張) 或
--                              (b) 已登入且該 spread 已購買 時才會回傳。
-- ---------------------------------------------------------------------------
CREATE TABLE cards (
  id              TEXT    PRIMARY KEY,        -- '{deck_id}:{card_key}' 例如 'tarot:0-fool'
  deck_id         TEXT    NOT NULL,
  card_key        TEXT    NOT NULL,           -- 原始檔案裡的 id (字串或數字字串)
  position        INTEGER NOT NULL,           -- 同一個 deck 內的順序
  name            TEXT    NOT NULL,           -- 主要顯示名(中文優先)
  name_secondary  TEXT,                       -- 副名(英文/中文另一面)
  image           TEXT,
  preview_payload TEXT    NOT NULL DEFAULT '{}',  -- JSON: keywords, suit, number, arcana, subtitle, symbol...
  gated_payload   TEXT    NOT NULL                -- JSON: 牌義、深度解讀(整個物件)
);
CREATE INDEX idx_cards_deck       ON cards(deck_id, position);
CREATE UNIQUE INDEX idx_cards_key ON cards(deck_id, card_key);
