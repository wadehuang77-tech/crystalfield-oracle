# 塔羅全館月費會員上線 Runbook

本站 7 個牌組只販售一個塔羅會員商品：`tarot_monthly_600`，價格 NT$600。每次成功扣款提供 30 天權益，期間內 7 個牌組與其全部牌陣、完整解讀皆不限次數。

## 上線前準備

1. 確認 Worker secrets：`ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`JWT_SECRET`。
2. 確認綠界商店已開通信用卡定期定額。
3. 確認正式站 `/api/ecpay-webhook` 可由綠界連線。
4. 套用 `d1/migrations/008_subscriptions.sql`。

## 驗證指令

```bash
cd worker
npm run typecheck

cd ../app
npm run typecheck
npm run build
```

## 必測流程

1. 未訂閱帳號用完免費占卜後，7 個牌組的任何單張或多張牌陣都只顯示「塔羅全館月費會員」。
2. 結帳目錄只有 `tarot_monthly_600`，金額為 NT$600；舊單次牌陣與次數包商品不可建單。
3. 付款成功後，`/membership` 顯示會員有效，本期到期日為付款成功時間後 30 天。
4. 同一帳號可不限次數取得 7 個牌組全部 16 個牌陣的完整內容，不扣除任何額度。
5. 取消後續扣款後，本期權益維持到到期日。
6. 生命靈數、人類圖、印度占星仍使用各自原有商品與價格。

## 綠界週期設定

- `PeriodType = M`
- `Frequency = 1`
- `ExecTimes = 99`
- 每次扣款成功後，本站權益窗固定為 30 天。

取消訂閱只停止後續扣款，不會回收本期已付款權益。
