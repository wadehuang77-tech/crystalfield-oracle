-- 005-orders-picks.sql
--
-- 在 orders 表加 picks_payload 欄位,用來保存用戶按下「立即解鎖」當下抽到的牌。
-- 這樣付完款跳回網站時,可以直接還原成「同一組牌 + 完整解析」,
-- 而不是讓用戶重新抽牌(會抽到不一樣的牌,客戶會懷疑被騙)。
--
-- 內容是 JSON array,結構與 spread-unlock 的 picks 相同:
--   [{ "card_key": "...", "position": 1, "reversed": false }, ...]
--
-- nullable — 既有訂單沒這欄位是 OK 的,只是付完款回站要重抽。

ALTER TABLE orders ADD COLUMN picks_payload TEXT;
