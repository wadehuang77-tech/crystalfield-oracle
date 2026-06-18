-- 006-token-generation.sql
--
-- 在 profiles 加 token_generation 欄位,用來實現「主動撤銷 JWT」。
--
-- JWT 本身一旦發出去,簽名有效就一直有效到 exp(7 天)。
-- 沒有這個欄位時:
--   - 用戶重設密碼後,舊裝置上的 JWT 還能繼續用 7 天 → 被釣魚的攻擊者繼續登入
--   - 用戶按「登出」只是清 cookie,JWT 字串本身還有效
--
-- 加了這個欄位後流程是:
--   1. 簽 JWT 時把當前的 token_generation 寫進 payload (gen 欄位)
--   2. readSession 時比對 JWT.gen === profile.token_generation,不一致就拒絕
--   3. 重設密碼成功 → token_generation += 1 → 該用戶所有舊 JWT 立刻失效
--
-- 預設值 0,跟既有 JWT(沒有 gen 欄位)相容(沒帶 gen 視為 0,跟 DB 預設 0 相符)
-- 所以 deploy 後既有用戶不會被踢下線,只有未來 reset password 才會觸發撤銷。

ALTER TABLE profiles ADD COLUMN token_generation INTEGER NOT NULL DEFAULT 0;
