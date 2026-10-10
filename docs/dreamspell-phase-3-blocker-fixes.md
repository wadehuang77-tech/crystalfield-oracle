# Dreamspell Phase 3 上線阻塞修復：本地交付報告

後續測試 D1 增量補齊與外部環境唯讀結果，見
[最後外部整合驗收](dreamspell-final-external-acceptance.md)；
本文件保留本地阻塞修復階段的原始驗收界線。

日期：2026-10-10。範圍僅限本地程式、全新本地 D1、離線驗證。

**結論：本地功能開關、正式付款程式與 Live AI adapter 已完成；尚不具備完整正式上線條件。**
沒有部署 Worker/Pages、遠端 migration、DNS/Secret 修改、真實付款、付費 OpenAI 呼叫、commit 或 push。
本次沒有重新查驗雲端 deployment ID / D1 metadata，不把歷史稽核當成本次驗收。

## A. 功能開關

實作於 [mayaFeatures.ts](../worker/src/mayaFeatures.ts)，僅接受字串 `"true"`；
缺少設定、`"false"`、其他值均關閉。測試 config 五個開關均明確為 `"false"`。
正式 Wrangler、正式 Secrets 與雲端 vars 未修改。

| 開關 | 控制與依賴 |
| --- | --- |
| MAYA_PUBLIC_ENABLED | 公開介紹頁；關閉時前端只顯示未開放提示 |
| MAYA_MEMBER_ENABLED | 依賴 public；控制計算、資料、每日摘要等會員 API |
| MAYA_PAYMENT_ENABLED | 依賴 member；正式 checkout、callback、查詢及調整 |
| MAYA_AI_ENABLED | 依賴 member；Mock/Live 生成與報告 API，包括歷史/讀取 |
| MAYA_SANDBOX_ENABLED | 依賴 member；獨立 Sandbox checkout/callback |

payment 與 sandbox 同時 true 時，兩者都拒絕使用，不做隱含環境切換。
`GET /api/maya/config` 是無需登入的唯讀開關回應，不回傳 Secret；
其他 API 維持 session、CSRF、ownership、rate limit 驗證。
前端載入前 default-deny，設定格式錯誤/請求失敗會明確提示並維持關閉。
SSR 只輸出功能確認標題，不預先輸出會員、付款或报告內容。

全 32 種開關組合、嚴格布林、預設拒絕及關閉時不呼叫 provider 已離線驗證。
沒有改動四大命理系統的功能開關或核心計算。

## B. 正式 ECPay 程式

共用 [mayaPayments.ts](../worker/src/mayaPayments.ts) 重用既有 ECPay 表單與 CheckMacValue helper；
[mayaSandbox.ts](../worker/src/mayaSandbox.ts) 保留相容 wrapper。

正式模式要求 `ENV=production`、`ECPAY_ENV=production`、production payment flag、
既有 `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV`、
明確正式 API/前端 origin 與 allowed-origin。沒有读取或改寫實際 Secret 值。
Sandbox 使用專用 Sandbox Secrets、stage endpoint、dev/mock 環境及非正式 origin。

| 項目 | 正式模式 |
| --- | --- |
| Endpoint | `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| 商品 | MAYA_BASIC_199 / MAYA_FULL_499 / MAYA_RELATIONSHIP_699 |
| 金額 | NT$199 / NT$499 / NT$699 |
| orders.item_type | `maya`；不使用 `maya_sandbox` 或其他命理商品類型 |
| Metadata | `maya_payment_orders`；不使用 migration 026 的 Sandbox metadata |
| ReturnURL | `https://api.crystalfield101.com/api/maya/payments/callback` |
| OrderResultURL | `https://api.crystalfield101.com/api/maya/payments/result` |
| 中文 ClientBackURL | `https://www.crystalfield101.com/maya-calendar/member?maya_order=<order_id>` |
| 英文 ClientBackURL | `https://www.crystalfield101.com/en/maya-calendar/member?maya_order=<order_id>` |

路由：

- `POST /api/maya/checkout`：依明確開關選擇模式，owner/idempotency 綁定。
- `GET /api/maya/checkout/config`、`GET /api/maya/checkout/:id`：登入及 owner 驗證。
- `POST /api/maya/payments/callback`：有界表單、拒絕重複欄位、簽章常數時間比較、
  MerchantID / MerchantTradeNo / TradeNo / 商品 / 金額 / owner 關係 / SimulatePaid 驗證。
- `POST /api/maya/payments/result`：驗證回傳後只導頁，不修改付款或權限。
- `POST /api/maya/payments/:id/adjust`：既有 admin 授權，唯一外部 reference，
  登記 `refunded` 或 `revoked`，原子撤銷該訂單權限。

成功 callback 的 metadata、付款狀態及單一對應 entitlement 使用 D1 atomic batch。
失敗不開通；不同金額/商品/會員、偽造簽章、跨 Sandbox/正式訂單均拒絕。
已退款/撤銷不能透過舊 callback 重啟。199/499/699 都不授予每日付費會員。
舊共用 ECPay webhook 拒絕 Maya 訂單，避免繞過專屬驗證。

**退款界線：adjust 是管理員在綠界查核完成後的記帳/撤權端點，不是執行退款的支付 API。**
不送出金錢、不接受會員自行宣稱退款。正式營運前仍需人工退款 SOP、
對帳、异常訂單處理與管理員稽核流程；目前沒有自動綠界退款/對帳整合。

## C. OpenAI Mock / Live Provider

[mayaAi.ts](../worker/src/mayaAi.ts) 使用既有 Worker `OPENAI_API_KEY` Secret 架構，
Live 走 `https://api.openai.com/v1/chat/completions`，固定 model alias `gpt-4o-mini`。
本次所有 fetch 都是測試 stub，**沒有呼叫 OpenAI 真實 API**。

- Mock 僅在 dev + `MAYA_AI_MODE=mock` + AI flag 開啟時可用。
- Live 要求 `MAYA_AI_MODE=live`、AI flag、API key；缺少任何一項拒絕。
- 三種商品與兩種語言分段產生，結構化 signature 由既有 Dreamspell 引擎重算；
  prompt 不含生日、Email、會員 ID 或完整個人資料。
- JSON schema、完成狀態、字串長度、HTML、語言與數字 KIN/波符/城堡宣稱檢查；
  seal/tone/signature/heading 等結構由伺服器組装，AI 不得覆寫。
- 報告取用與每段產生前後重新驗證付款/owner；撤權期間不回傳報告。
- report fingerprint、order+locale uniqueness、processing lease、防並行與已完成快取。
- 已完成段落可重用；已確認計費但 schema 不合格的段落可重試，保留累積成本。
- model snapshot 存入 section，report 存 model alias、prompt/calculation version、Token、估算成本。
- Provider 回應最多 64,000 bytes；串流達上限取消；25 秒 timeout。
- 失敗只記 error code，不記 Secret、provider error body、生日或個人報告。

### 成本與重試政策

| 項目 | 本地程式上限/策略 |
| --- | --- |
| 每段輸入/輸出 | 6,000 / 1,200 Tokens；固定 prompt byte preflight 與回傳 usage 驗證 |
| 每段預留 | NT$0.0567，在網路呼叫前寫入 D1 |
| 每張訂單 | 預留總額最多 NT$1，兩種語言與所有重試共用 |
| 每段 / 報告重試 | 最多 3 attempts；每日生成另有 6 次會員 rate limit |
| Basic / Full / Relationship | 3 / 5 / 7 段 |
| 未知結果 | timeout、網路、HTTP、無效 usage 等保留 reserved/unknown，不自動重送 |

估價使用 input US$0.15 / output US$0.60 每百萬 Tokens、匯率 35 TWD/USD；
7 段一次最壞預留 NT$0.3969，雙語一次 NT$0.7938。
來源：[OpenAI gpt-4o-mini model](https://developers.openai.com/api/docs/models/gpt-4o-mini)。
這是估算，不是實際帳單/鎖定匯率；正式啟用前需再次核對價格與 model snapshot。

**未知 outcome 不可盲目重試**：可能已計費但 response 遺失。需管理員查核 provider usage，
依對帳结果設計/執行受控 reconciliation；本次不提供自動解除 unknown 的端點，
避免再次成本或漏記成本。沒有把未知失敗偽裝成可安全自動重試。

語言 guard 會拒絕英文 CJK、要求中文 CJK，但不等於完整繁簡或內容品質審查。
真實三商品双語品質、錯誤命理宣稱、內容完整度與實際單次成本仍 **NOT RUN**，
正式 AI 保持關閉直到人工品質驗收。

## D. Additive D1 migration

新增 [027_maya_production_payment_ai.sql](../d1/migrations/027_maya_production_payment_ai.sql)：

1. `maya_payment_orders`：正式付款 metadata / owner / 商品 / locale / idempotency / state。
2. `maya_payment_adjustments`：管理員退款/撤銷稽核及唯一外部 reference。
3. `maya_ai_budgets`：訂單共用預留與累積估算費用。
4. `maya_ai_sections`：分段狀態、文字、model、usage、成本、attempts。

依賴順序：既有 `profiles` / `orders` schema → migration 025 → migration 027。
026 只為 Sandbox checkout 使用，**不是正式付款依賴，也不轉換 Sandbox 訂單**。
025/026 未改寫。027 僅 CREATE TABLE/INDEX IF NOT EXISTS，沒有 destructive DDL、
DROP/TRUNCATE/DELETE/REPLACE 或既有訂單資料更新；外鍵 ON DELETE CASCADE 是約束，
不是本次執行的刪除操作。

32 項本地 Worker 測試使用全新 Miniflare D1，驗證 migration、索引、FK、unique、
520 筆內容/兩種語言及測試 fixtures。fault injection 僅發生在可丟棄本地 D1。
**沒有在正式或遠端測試 D1 套用 027，也沒有續跑前次中斷的遠端初始化。**

Cards/Customer 外部測試內容配置仍依前次決策：遠端 Cards 預計 520 筆，
Customer 內容表保持空白；目前每日 API 讀 Customer。
跨 DB 內容接線與遠端初始化續跑仍需後續明確範圍，不在此次宣告完成。

## E. 本次驗證

PASS 僅指實際完成的本地測試，不等同外部整合。

| 項目 | 結果 | 證據/界線 |
| --- | --- | --- |
| Frontend TypeScript + acceptance scripts | PASS | typecheck、typecheck:maya-acceptance |
| Worker TypeScript + Maya tests | PASS | typecheck、typecheck:maya-tests |
| ESLint | PASS | Worker 0 errors；app 0 errors、5 個既有 warnings |
| 正式 frontend build / SEO | PASS | 本地 build；45 routes / sitemap / noindex / alternates |
| 隔離測試 frontend build | PASS | 明確 VITE_API_BASE；bundle/CSP/analytics/noindex 檢查 |
| KIN | PASS | 7 tests；含 260 KIN 全覆蓋與時區 |
| 外部參考 regression | PASS | 3 tests；296 一般日期一致、5 閏日差異仍保留限制 |
| Worker / D1 / Maya auth / payments / providers | PASS | 32 tests = Phase2 12 + Sandbox 8 + production-shaped 12 |
| 正式形狀離線簽章/金額/商品/雙語 return | PASS | 合成 merchant/key/callback，未送綠界 |
| 退款/撤權/重複/跨模式/atomic rollback | PASS | 本地 D1 / callback tests |
| Live adapter / cost / retry / unknown / concurrency | PASS | fetch stub；零付費 API |
| 中英文路由 / redirect / noindex | PASS | test:maya-routes |
| Chrome 390/768/1440 | PASS | 51 checks；Mock auth/payment/API，含 config error 與關閉 UI |
| 既有登入 / checkout return / GA4 | PASS | test:auth / test:payment-return / test:ga4 |
| 塔羅 | PASS | deep-analysis / subscription / recurring-payment regression |
| 人類圖 | PASS | calculation-auth / bilingual report+entitlement tests |
| 印度占星 | PASS | Vedic locale / Worker contracts / privacy/payment guard |
| 生命靈數 | PASS | 路由測試含 4 組固定 arithmetic/master-number/grid regression |
| 四大系統完整真實付費 E2E | NOT RUN | 本次只有上述選定本地回歸，不宣稱完整外部驗收 |
| 真實 Google OAuth zh/en | NOT RUN / BLOCKED | 需要可連線隔離 HTTPS、Google test client、人工測試帳號 |
| 真實 ECPay Sandbox 三商品 | NOT RUN / BLOCKED | 需要 stage Secrets、外部 callback、人工付款操作 |
| 正式 merchant 設定/對帳 | NOT RUN | 本次未讀取或驗證正式 Secret/後台設定 |
| 真實 AI 品質與帳單成本 | NOT RUN | 本次明確禁止付費模型 |
| 正式/遠端 D1 migration、部署、smoke | NOT RUN | 不在授權範圍 |

修復過程曾發現：admin adjust 路由錯誤位置、SSR 缺少 H1、
舊瀏覽器 label 與開關 allowlist 不一致，均已修正後重跑通過。
測試累積 rate-limit 導致 429，僅調整合成本地案例隔離，**沒有提高正式 rate limit**。
隔離 build 未給 VITE_API_BASE 時正確拒絕，依規定設定測試 origin 後通過；
没有加入正式 API fallback。目前上述已完成驗證無剩餘 FAIL。

## F. 本次修改/新增檔案

- Worker：`src/mayaFeatures.ts`、`src/mayaPayments.ts`、`src/mayaAi.ts`（新增）；
  `src/mayaSandbox.ts`、`src/maya.ts`、`src/index.ts`、`src/utils.ts`。
- Worker 驗證/本地設定：`scripts/maya-production-check.ts`（新增）、
  `scripts/maya-phase2-check.ts`、`scripts/maya-sandbox-check.ts`、
  `package.json`、`tsconfig.maya-tests.json`、`wrangler.maya-test.json`。
- 前端：`src/pages/MayaCalendarPage.tsx`、`src/lib/maya.ts`、
  `src/lib/api.ts`、`src/lib/mayaCheckout.ts`。
- 前端驗證：`scripts/maya-browser-check.ts`、`scripts/maya-route-check.ts`、
  `scripts/maya-external-e2e.ts`、`scripts/maya-environment-check.mjs`。
- D1：migration 027（新增）。
- 文件：本報告（新增）、`dreamspell-test-environment.md` 的新開關說明。

保留 Dreamspell engine `dreamspell-2026.2`、已驗證內容 seed 與此前成果。
工作樹仍包含以前階段尚未提交的成果，不把全部 untracked 宣稱為本次新增。

## G. Git 工作樹與安全提交規劃（未執行）

branch `main`；HEAD `64d62ee55c8c8b4715c6dcc01410242975455f51`，沒有新 commit。

### A：Dreamspell 必要工作

本報告 F 的檔案，以及歷史階段的 Dreamspell engine/tests/pages、
migrations 025/026、520 seed、sandbox SQL/initializer、Dreamspell acceptance/docs。
相關 shared integration：App route、SeoMetadata、prerender routes、robots/_headers、
API、Worker dispatcher/utils、package manifests/locks、GA4 隱私排除。
這些 shared 檔案需逐 hunk 檢查，不盲目整檔 stage。

### B：既有四大系統 WIP，保留不混入

`worker/src/vedicAstrology.ts`、`worker/scripts/vedic-astrology-check.ts`
有既有 VedAstro endpoint 變更；`services/vedastro-selfhost/`、
`scripts/*vedastro*`、`docs/vedastro-*.md` 為獨立印度占星工作。
本次沒有丟棄、覆寫或提交这些改動。

### C：獨立/混合工作，另行確認

`docs/ga4-spa-page-views.md`、`docs/prerender-seo-report.md`、
`app/index.html`、`app/scripts/ga4-event-check.ts` 等有既有 SEO/GA4 工作；
與 Dreamspell 直接相關的 hunk 才能進 A，其餘保留。`.gitignore` 與 lockfile
也需確認來源。既有 `.vscode/tasks.json` 沒有修改。

未來先檢視 diff，再以明確檔案/hunk staging，禁止 `git add .` / `git add -A`：

1. Dreamspell baseline（engine、025、seed、會員/API/UI；shared 只選必要 hunks）。
2. 隔離 Sandbox（026、專用 config、驗證工具與歷史報告）。
3. Phase3 default-off gates、027、正式付款/AI adapters、離線驗證及此報告。

每組檢視 staged diff、typecheck/test、確認無 Secrets 或其他系統變更；
取得提交授權後才 commit，包含 Co-authored-by trailer。
**推送 main 可能觸發正式 CI/CD，commit 授權不等於 push/部署授權。**

## H. 下一次正式部署前置條件

尚未具備完整條件，以下維持 BLOCKED：

1. 另行授權隔離測試資源初始化續跑與 Worker/Pages 部署；
   先確認指定測試 UUID、部分初始化狀態、Customer/Cards 資料來源及 DNS/TLS。
2. 人工於 Google Cloud 建立/確認專用測試 client，Origins 為測試前端/API 所需 origin；
   此案用 GIS credential callback，沒有新 OAuth code-flow redirect URI。
   不修改正式 client，不在聊天/程式貼密碼、Cookie 或 Token。
3. 專用 stage Secrets、安全 session secret 與 stage callbacks；僅在隔離測試
   public/member/sandbox/AI Mock gates 明確開啟後，人工跑三商品 zh/en 真實流程。
4. 外部 E2E runner 不替換 Google/付款/API 回應；設定核准 origins、authorized flag，
   三商品各跑一次（各語言），由人工完成登入/測試付款；之後關閉測試 gates。
5. 正式付款 merchant/簽章/對帳/退款 SOP 經安全檢查，Sandbox 真實驗收通過，
   才考慮 production payment enable；先查備份/還原點、production schema 與 additive migration。
6. 另行授權受控付費 AI 品質/成本/兩會員隔離測試，處理 unknown reconciliation，
   再啟用正式 AI。不能以 stub 結果取代實際驗收。
7. 部署前重新核對 Git 範圍、正式 D1 備份、deployment rollback、四大系統回歸；
   部署後真實中英文 E2E / smoke 均需通過。

本次完成後停止，等待下一次明確授權。
