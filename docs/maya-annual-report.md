# 馬雅生日流年 NT$599（本機實作）

## 2026-10-23 正式啟用紀錄

- 經使用者明確授權，先以 Actions `39911888025` 讀取正式紀錄，確認 032 未套用且無流年表。
- Actions `39911988144` 僅套用 032，正式紀錄時間為 UTC 06:31:37／台北14:31:37。確認五張流年表、索引與不可改寫快照 trigger；既有 Maya 權限表的彙總紀錄前後一致。
- 本次將 `MAYA_ANNUAL_ENABLED` 改為 true，交由既有 CI 部署。原有 member/payment/AI/live 開關不變。以下「本機」段落保留原始實作與測試記錄。
- 沒有真實刷卡、扣款或正式 AI 生成。正式登入訂單與實際付款後完整驗收需另行確認，不能以部署成功替代。

## 範圍與啟用

- 獨立商品 `MAYA_ANNUAL_599`。入口 `/maya-calendar/member`，報告頁 `/maya-calendar/annual`；英文同路徑加 `/en`。
- 新增 `d1/migrations/032_maya_annual.sql`。只在隔離 Miniflare 資料庫測試，未執行正式 migration。
- `MAYA_ANNUAL_ENABLED` 預設 `false`。未部署；未新增 API Key。未來啟用前須先完成 migration，再開啟此開關，保留既有 Maya member/payment/AI、正式綠界與 OpenAI 設定。
- 不修改原有 199、499、699、899 商品內容、價格或權限。新方案使用獨立付款附表、權限表、報告與 AI 嘗試紀錄。

## 曆法

- 共用 `dreamspell.ts` 的 `calculateDreamspellKin`，及 `maya.ts` 的日期驗證、Asia/Taipei 今日與語言資料。
- 日期使用 `YYYY-MM-DD`；只有計算下一生日前一天時，以明確 UTC 午夜做純日期減一天，沒有本地時區轉換生日。
- 預設：台北今日若尚未到今年生日，起始年為去年；否則今年。可選出生年至明年的起始年份。
- 期間從指定年份生日開始，到下一次生日前一天，含首尾。
- 既有 `maya.ts` 的會員生日規則明確禁止 2/29 個人印記。新功能同樣拒絕預覽／下單，未發明平年替代日。仍需產品方確認此規則後另作變更。
- 年齡＝起始年份－出生年份；循環輪次＝floor(年齡/52)+1；位置＝年齡 mod 52+1。出生是第一輪位置1，51歲位置52，52歲第二輪位置1。
- 既有曆法排除閏日，因此對目前允許的非2/29生日，每年生日推進365有效日；365×52＝18,980＝260×73。程式逐筆驗證流年 KIN 與此算式一致，測試涵蓋跨1900／2000的代表生日。
- 城堡只依年度生日 KIN：1–52紅、53–104白、105–156藍、157–208黃、209–260綠。沒有「年齡分配五城堡」或另外的人生城堡算法。

## 付款與保存

- 後端固定599元；付款時保存不可修改的出生日期、期間與完整演算法快照（KIN、調性、圖騰、城堡、循環位置、版本）。資料庫 trigger 防止改寫快照。
- 同一會員、出生日期與期間只能有一筆 pending/paid 購買，重複點擊重用 pending 訂單；已付費回到原報告。
- 沿用 `mayaPayments.ts` 的綠界簽章、商店、金額、商品、交易與訂單驗證。瀏覽器返回頁不授權。重複 callback 冪等，失敗付款不授權。
- 授權時同時查登入擁有者、599商品、付款訂單、交易編號、商店與 active verified_payment 權限。退款／撤權沿用既有管理者 adjustment 流程，讀取和生成均立即拒絕。
- 報告唯一鍵 `(order_id, locale)`；中英文用同筆付款權限、各自保存內容。下一個生日流年另購，不影響過往報告。
- 路由由既有 App 路由生成器產生直接開啟／重整 rewrite；兩種語言加上 noindex response header，不納入 sitemap。

## AI、成本及進度

- 沿用 `mayaAiMode`、既有 OpenAI Chat Completions provider、`gpt-4o-mini`、timeout與共享 `maya_ai_budgets` 每訂單 NT$1 成本上限。沒有前端密鑰。
- 一次請求生成一章，10章各有不同提示用途。結構化 schema 驗證語言、欄位、長度；第9章要求恰好三項行動。AI不可算生日、KIN、年齡、週期或城堡，數值由前端顯示已固定快照。
- 每次預留4000 input／800 output token的保守上限，約NT$0.0378；中英文20章預留NT$0.756，重試亦計入同一訂單上限。預留不自動退回。
- 同會員一次只允許一份流年報告生成；資料庫原子claim、兩分鐘lease、章節嘗試唯一性避免重複並行。每章最多三次，成功內容不重新呼叫。
- 章節正文先存在嘗試紀錄；若後續報告更新中斷，續接會使用已存章節，不再次呼叫供應商。
- 真實進度＝已儲存章節數×9%，完整10章報告成功保存才100%。不是耗時百分比。重新整理讀取後端進度，接續未完成章節。
- 格式錯誤可按重試，保留已購權限。若供應商timeout／連線失敗導致是否計費不明，或程序中斷超過lease，會blocked並提示聯絡客服；不自動重送。成本上限同樣保留權限並停止生成。
- **待人工流程**：不明結果需要管理者核對供應商帳務及已存內容後處理；本輪沒有提供無條件重送的管理者按鈕，避免重複計費。

## 本機驗證指令

- `cd worker; npx tsx --test scripts/maya-annual-check.ts`：隔離D1 migration、日期／循環、付款回調、擁有者、雙語、冪等、重試、退款與不明結果。
- `cd worker; npm run test:maya-production`：共用付款模組既有方案的離線回歸，所有 provider／綠界資料均為測試資料。
- `cd app; npx tsx scripts/maya-annual-browser-check.ts`：啟動本機5199，全部API mock，手機390／桌面1440、登入門檻、重整、雙語、登出保護；截圖在系統TEMP。
- app／worker typecheck；app production build（含現有預渲染驗證）。

未執行真實 Google 登入、綠界交易、付費 OpenAI 呼叫或正式資料庫／部署。實際生成內容品質、正式金流往返及營運端不明結果處理仍需上線前驗收。

## 本次結果與檔案

- 新功能後端測試3組通過，既有付款離線回歸16組通過。
- 瀏覽器mock測試、前後端型別檢查、production build與預渲染檢查通過；build仍有既有大型bundle提示。
- 新增：`app/src/lib/mayaAnnual.ts`、`app/src/pages/MayaAnnualPage.tsx`、`worker/src/mayaAnnual.ts`、`d1/migrations/032_maya_annual.sql`、`app/scripts/maya-annual-browser-check.ts`、`worker/scripts/maya-annual-check.ts`、本文件。
- 修改：`app/src/App.tsx`、`app/src/pages/MayaCalendarPage.tsx`、`app/src/lib/api.ts`、`app/src/lib/mayaCheckout.ts`、`app/public/_headers`、`worker/src/maya.ts`、`worker/src/mayaPayments.ts`、`worker/src/utils.ts`、`worker/wrangler.toml`。
