-- 訂單表 — ECPay 金流串接用
--
-- 流程:
--   1. /api/checkout/create-order 建一筆 status='pending' 的訂單,產生 merchant_trade_no
--   2. 前端拿著 ECPay 表單參數跳轉到綠界
--   3. 用戶付款 → 綠界 POST 到 /api/ecpay-webhook → 驗 CheckMacValue → 更新 status='paid' + 解鎖
--   4. 用戶瀏覽器跳回 /checkout/return?order_id=xxx → 輪詢狀態 → 顯示結果

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT    PRIMARY KEY,        -- UUID
  merchant_trade_no   TEXT    NOT NULL UNIQUE,    -- 給綠界的訂單號(英數字 ≤ 20 chars)
  user_id             TEXT,                       -- 對應 profiles.id (可選,訪客也能買?目前需登入)
  email               TEXT    NOT NULL,
  item_type           TEXT    NOT NULL,           -- 'spread' (未來可能加 'course' / 'product')
  item_id             TEXT    NOT NULL,           -- 例如 'tarot_celtic'
  item_name           TEXT    NOT NULL,           -- 例如 '偉特塔羅 凱爾特十字陣'
  amount              INTEGER NOT NULL,           -- TWD 整數
  status              TEXT    NOT NULL DEFAULT 'pending',  -- pending | paid | failed | cancelled
  ecpay_trade_no      TEXT,                       -- 綠界回傳的 TradeNo
  ecpay_payment_type  TEXT,                       -- Credit / ATM / CVS / BARCODE 等
  raw_callback        TEXT,                       -- 綠界 callback 原始 payload (JSON.stringify)
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  paid_at             TEXT,                       -- 付款成功時的 ISO 時間
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email           ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_trade  ON orders(merchant_trade_no);
CREATE INDEX IF NOT EXISTS idx_orders_status_created  ON orders(status, created_at DESC);
