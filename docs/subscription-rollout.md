# 月費會員訂閱上線 Runbook

這份文件是 `membership_monthly` 真正定期定額上線的最低操作手冊。

## 1. 先做的事

1. 確認 Worker secrets 已設定：
   - `ECPAY_MERCHANT_ID`
   - `ECPAY_HASH_KEY`
   - `ECPAY_HASH_IV`
   - `JWT_SECRET`
2. 確認綠界商店已開通「信用卡定期定額」。
3. 確認正式站 `api.crystalfield101.com` 能被綠界 webhook 打到。

## 2. 套用 migration

這次新增：

- `d1/migrations/008_subscriptions.sql`

正式環境至少要先套這支，否則訂閱流程會失敗。

## 3. 上線前檢查

1. `worker`:
   ```bash
   cd worker
   npm run typecheck
   ```
2. `app`:
   ```bash
   cd app
   npm run build
   ```

## 4. 測試環境必測流程

### 開通訂閱

1. 登入帳號。
2. 進入任一單張牌第 4 次會員提示。
3. 點「加入會員」。
4. 綠界刷卡成功後，確認回到原頁或 `/membership`。
5. `/membership` 應看到：
   - 狀態為「會員有效中」
   - 本期開始 / 到期時間
   - 已成功扣款次數至少 1 次

### 同步綠界狀態

1. 進 `/membership`
2. 點「同步綠界狀態」
3. 確認畫面可正常更新，不報錯

### 取消續扣

1. 進 `/membership`
2. 點「取消後續自動扣款」
3. 成功後狀態應變成「已取消續扣，權益仍有效」
4. 本期到期前，單張牌會員權益仍應有效

## 5. 現在的系統行為

1. 訂閱透過綠界信用卡定期定額建立。
2. 週期設定是：
   - `PeriodType = M`
   - `Frequency = 1`
   - `ExecTimes = 99`
3. 第一次付款走一般 `ReturnURL`。
4. 第二次以後的續扣走 `PeriodReturnURL`。
5. 使用者可從前端取消後續扣款。

## 6. 目前已知限制

1. 綠界定期定額不是無限期，它需要固定次數；目前設成 `99` 次。
2. 目前前端沒有做「扣款失敗後補授權」按鈕。
3. 舊資料若曾經把 `membership_monthly` 寫進 `purchased_spreads`，前端仍保留相容判斷；等舊會員資料清完可以再移除。

## 7. 建議下一步

1. 加一個 admin / 客服用的訂閱查詢頁。
2. 加「扣款失敗」通知信。
3. 規劃 `ExecTimes` 用完前的續約策略。
