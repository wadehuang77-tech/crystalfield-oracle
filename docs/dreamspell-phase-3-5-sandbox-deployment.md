# Dreamspell Phase 3.5：隔離測試站部署

日期：2026-10-10（Asia/Taipei）。

**已部署既有獨立測試 Worker/Pages；目前只開放介紹頁與公開 KIN 內容。
真實 Google、ECPay Sandbox 付款與 OpenAI 驗收尚未執行，不能宣稱正式完整上線。**

沒有正式部署、D1 migration/seed 重跑、正式 Secrets 修改、DNS/Custom Domain/OAuth 修改、
真實付款、官方 Sandbox 付款、付費 OpenAI、commit 或 push。
測試 Worker 尚無 Secret bindings，因此會員與付款功能維持關閉。

## A. 測試 Pages

- 中文：[Dreamspell 測試頁](https://crystalfield-maya-sandbox.pages.dev/maya-calendar)
- 英文：[Dreamspell English test page](https://crystalfield-maya-sandbox.pages.dev/en/maya-calendar)
- Project：`crystalfield-maya-sandbox`
- Project 原有發布分支：`maya-test`；沒有修改該設定。
- 最終 canonical/latest deployment：`2fe7ef10-3608-449b-b28e-f6bfb21e6f0f`
- 固定網址：`https://crystalfield-maya-sandbox.pages.dev`
- 此版本專屬網址：`https://2fe7ef10.crystalfield-maya-sandbox.pages.dev`

隔離 bundle 使用 `VITE_API_BASE=https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev`。
編譯產物檢查：無正式 API origin、移除正式 analytics bootstrap、
CSP connect-src 只允許測試業務 API/必要 Google origin、
form-action 僅允許 ECPay stage、全站 noindex/noarchive、robots Disallow。

### 初次 preview 與修正

第一次上傳使用 `--branch main`，只建立 preview
`50400162-ef51-4a90-8ecc-9c917a6cfbc1`，固定 pages.dev 當時 404。
唯讀查出既有 project `production_branch=maya-test` 後，
改用該既有分支上傳，固定網址已回應 200。
這裡 Cloudflare 的 project production branch 是**測試 project 的 canonical 分支**，
不是正式網站部署，也沒有 Git main push。
之後更新正確的 Sandbox/AI 獨立開關文案，最終版本如上。
沒有刪除 preview、改 DNS 或使用正式 Pages project。

## B. 測試 Worker

- Worker：`crystalfield-maya-sandbox-api`
- URL：`https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev`
- 最終 deployment ID：`2c08cc9a-9989-4abd-8650-cd9d3f91f644`
- 最終 version ID：`818718c0-b991-4179-8450-04ea0ff5a6f1`，100% traffic。
- `workers_dev=true`，preview URLs false，custom routes `[]`。
- 專用入口：[mayaTestEntry.ts](../worker/src/mayaTestEntry.ts)。

此入口不是將整個既有 Worker 所有服務公開：

- 僅 allowlist Maya 與必要 auth 路徑；其餘 `/api/cards`、admin、舊 checkout、
  其他命理 API、legacy payment webhook 均 404。
- `/api/maya/payments/*` 正式付款/管理調整路徑直接 404。
- ENV 不是 dev，或正式 payment flag 被開啟時，整個測試入口 fail-closed 503。
- JWT/Google Client 未配置時 auth API 503，不使用預設/正式憑證。
- 私人 Maya API 使用既有 server-side feature/session/owner guard。
- `GET /api/health` 只回 status/environment，不回 Secret、UUID、會員或生日。

實際公開回應：

```json
{"public":true,"member":false,"payment":false,"sandbox":false,"ai":false}
```

| 開關/設定 | 雲端實際值 |
| --- | --- |
| MAYA_PUBLIC_ENABLED | true |
| MAYA_MEMBER_ENABLED | false |
| MAYA_PAYMENT_ENABLED | false |
| MAYA_SANDBOX_ENABLED | false |
| MAYA_AI_ENABLED | false |
| MAYA_AI_MODE | mock |
| MAYA_AI_TEST_CAP_ENABLED | true（預算 guard 已備妥，**不等於 AI 啟用**） |
| MAYA_CONTENT_SOURCE | cards |

部署後讀取 settings，只檢查 binding names/types 與非敏感 vars；
**無 secret_text bindings**，沒有讀取或複製 Secret 值。

## C. D1 / Cards API

部署前先以 `verify-remote` 唯讀驗證兩庫 schema、欄位、索引、FK 與內容；
未執行 025/026/027，也未重送 seed。
實際部署後 settings 再核對 UUID：

| Binding | 名稱 | UUID |
| --- | --- | --- |
| DB | crystalfield-maya-sandbox-customer | `1ad83812-c5ac-425d-b1bd-fbcd539919fa` |
| DB_CARDS | crystalfield-maya-sandbox-cards | `71cd2302-f5a3-483c-a838-187d7b858e4c` |

Customer 16 表皆 0 筆。Cards 5 表，內容 520 筆、其餘空白；FK check 無錯。
公開 API 與 health 不建立會員、訂單或 birthday fixtures。
部署後再次以精確測試 UUID 查詢 counts/FK；SQL API 一次參數格式失敗（400），
補上明確空 params 後唯讀查詢通過，沒有任何 D1 寫入或 SQL 重送初始化。

### Cards 接線

[maya.ts](../worker/src/maya.ts) 的 `MAYA_CONTENT_SOURCE=cards`：

- 使用 `DB_CARDS.maya_kin_content`、`maya-reflection-1` version。
- 在回傳前比對 seal、tone、summary 與確定性引擎。
- 缺資料或不一致會明確 500，不 fallback 成假成功，也不寫 Customer 內容表。
- 未設定 content source 的原有環境保留 Customer 行為；沒有改正式 config。
- 查詢只針對新 Maya 表，沒有變更七套塔羅 deck/card 查詢或核心規則。

新公開 API：

`GET /api/maya/content/:kin?locale=zh-TW|en`

只回 deterministic signature 與免費摘要，不回生日、會員 ID、報告、premium_content。
依 public flag 控制，KIN 範圍 1–260，額外參數/非法 locale 拒絕。

**實際 HTTPS 驗證全部 520 筆**：260 中文 + 260 英文，逐筆與引擎/摘要比對 PASS；
KIN 34 正確為 White Wizard / Galactic / wavespell 3 / castle 1、
calculation_version `dreamspell-2026.2`。
正式 Cards D1 UUID 未綁到測試 Worker，metadata 未變。

### KIN 計算界線

本地 engine、260 KIN、301 外部參考 regression PASS。
`POST /api/maya/calculate` 保留登入要求，member flag 關閉時實際 503，
沒有為方便展示而改成匿名生日計算。
所以**真實會員生日計算/存檔 NOT RUN**，不能以公開 KIN lookup 代替。

## D. Google OAuth 尚需設定

目前缺少已綁定的專用 `GOOGLE_CLIENT_ID`、新獨立 `JWT_SECRET`。
Google/password/cookie/token 不交付聊天或寫入 repository。

待取得 OAuth/Secret 設定授權後，由使用者/管理員：

1. 在 Google Cloud 建立專用 Web Application client 與測試 consent/test users，
   使用兩個授權帳號，不修改正式 Client。
2. Authorized JavaScript Origins：
   `https://crystalfield-maya-sandbox.pages.dev`。
   preview/hash URLs 不在目前 allowed origins，測試請使用固定網址。
3. 現有流程為 GIS popup credential callback，不是 authorization-code redirect；
   不新增假 Redirect URI。Credential POST 路徑為：
   `https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/auth/google`。
4. 由安全 Cloudflare Secret 輸入專用 Client ID 及新隨機 JWT_SECRET，
   不複製正式 JWT_SECRET。
5. 先核對 HTTPS、CORS、CSRF、callback，再開 member gate 與實測兩會員。

CORS 已實測固定 Pages Origin，只回精確 origin、credentials 由既有 helper 管理；
Cookie 保留 host-only / HttpOnly / Secure / SameSite=None。
**pages.dev 與 workers.dev 是不同 site**；真實 Google/session 可能受 third-party cookie
政策影響，這點尚 NOT RUN。不得用 Mock token 宣稱已解決。
若實測受阻，提出同一 registrable domain 的兩測試 custom hosts/DNS/TLS/OAuth origin
變更清單，取得確認後才做，不降低 Cookie 安全設定。

## E. 官方 ECPay Sandbox 準備

現有 stage checkout/callback 是真實 ECPay 介面，不是付款成功 mock；
它重用 CheckMacValue、完整 merchant/amount/product/order/owner 檢查。
本次**只完成離線簽章測試，官方 Sandbox 實際付款 0 次**。

已移除支付環境對 Mock AI mode 的不必要依賴：
Sandbox 仍要求 ENV dev、stage merchant、專用 Sandbox key/IV、非正式 origins、
parent gates 與互斥 payment flag，但允許 AI mode mock/live；
**支付 provider 與報告 provider 分開**。無 OpenAI Key/AI gate 時仍不呼叫 AI。
新增離線案例驗證：mode=live、AI disabled、无 OpenAI Key 時，
官方 stage-shaped checkout/簽章 callback 可開對應 entitlement，
reports 仍 503；不使用 local_mock entitlement 或正式訂單冒充付款。

尚需安全設定、目前未綁定：

- `MAYA_SANDBOX_HASH_KEY`
- `MAYA_SANDBOX_HASH_IV`
- `MAYA_SANDBOX_MERCHANT_ID=3002607`（非 Secret merchant metadata 已配置）
- 先有 Google/session 設定與登入驗收，再按授權開 member/sandbox gates。

| 用途 | 測試 HTTPS URL |
| --- | --- |
| Endpoint | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| ReturnURL | `https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/callback` |
| OrderResultURL | `https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/result` |
| 中文 ClientBackURL | `https://crystalfield-maya-sandbox.pages.dev/maya-calendar/member?maya_order=<id>` |
| 英文 ClientBackURL | `https://crystalfield-maya-sandbox.pages.dev/en/maya-calendar/member?maya_order=<id>` |

NT$199/499/699 官方測試付款及真實 callback/雙語導回均 BLOCKED / NOT RUN。
不用正式 merchant/key、不輸入真卡、不啟動自動續扣或每日付費商品。

## F. OpenAI NT$2 硬預算（離線 PASS，Live 關閉）

[mayaAi.ts](../worker/src/mayaAi.ts) 新增 `reserveMayaTestSection`，
使用已存在 migration 027 的 budgets/sections，**不新增 migration**。
只允許 dev + `MAYA_AI_TEST_CAP_ENABLED=true`，dev Live 未配置 guard 時拒絕。

| 限制 | 實作 |
| --- | --- |
| 跨訂單總預留 | 全測試 D1 的 `SUM(maya_ai_budgets.reserved_twd) + 下一段 <= NT$2` |
| 每份報告 | sections 預留合計最多 NT$0.40 |
| 每張訂單 | 原有 NT$1 累積 cap，雙語/retry 共用 |
| 每次 provider call | 預留 NT$0.0567；6,000 input / 1,200 output token bound |
| 輸入 preflight | byte bound 保留 512 token/framing headroom |
| 並行鎖 | 任何 reserved section 存在時拒絕另一 reservation |
| 失敗停止 | 任一 failed/unknown section 封鎖整個測試 campaign |
| Timeout | 25 秒；未知 outcome 保留鎖/預留，不自動重送 |

D1 atomic batch 先條件式更新總預算，再以 `changes()=1` 建立 section reservation；
預算與全域 lock 在同一 transaction 中建立，在外部 fetch 前完成。
沒有前端傳入價格/預算 override，沒有按新 order/reset key 重新取得 NT$2；
沒有公開 reset/reconcile 或 test-admin endpoint。
completed 才釋放當次 provider lock，預留金額不自動退回。

離線量測：並行兩 reservation 僅一成功；失敗/未知之後不能新呼叫；
NT$0.39 已預留報告不能再預留一段；
35 段最壞預留 NT$1.9845，第 36 段拒絕，總額不超過 2。
所有範例均新本地 D1，沒有在遠端放 budget fixtures 或呼叫 OpenAI。

此 cap 是以目前模型價格與 35 TWD/USD 的**保守 Token 費用估算/預留硬上限**，
不是 Dashboard notification，也不是實際台幣帳單保證；
稅/匯率/模型價格改變仍需啟用前重新核對，超出估價假設時停止驗收。
model/Token/成本/version 保留原有紀錄與 schema 驗證。

| 報告 | 單語首輪最壞預留 NT$ | 雙語 NT$ |
| --- | ---: | ---: |
| BASIC 199（3 段） | 0.1701 | 0.3402 |
| FULL 499（5 段） | 0.2835 | 0.5670 |
| RELATIONSHIP 699（7 段） | 0.3969 | 0.7938 |
| 六份首輪總計 | — | 1.7010 |

Live Key 沒有部署，MAYA_AI_ENABLED=false；
**付費呼叫尚未授權，實際 Token/費用仍 0 / NT$0**。
下一輪須另行核准專用測試 OpenAI Project/Key、最多六份/30 段首輪、
總 cap NT$2/每報告 NT$0.40、人工品質/兩會員權限/usage 核對後才可呼叫。
不能把這些離線結果宣稱為中文/英文真實生成品質 PASS。

## G. 正式隔離

部署前後 snapshot 比對 PASS：

- 正式 Customer D1 `64583df1-9f69-4164-8a89-c6dec6b4ac61` metadata 未變。
- 正式 Cards D1 `7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7` metadata 未變。
- 正式 Worker deployment `173bfc94-152c-4669-aa6e-6a29acae1beb`、
  version `df02072a-56a5-4f4f-97f5-b5760517272d` 未變。
- 正式 Pages canonical `9ade0032-3248-43e3-b8dc-6565bf6b8142` 未變。
- 已有 custom domains/routes、其他 Pages deployment IDs 未變。
- 近期 GitHub runs 未增加/變動；main HEAD
  `64d62ee55c8c8b4715c6dcc01410242975455f51` 未變。

此次部署來自尚未提交的工作樹；以上 HEAD 不代表新增程式已存在該 Git commit。
精確運行版本以本報告 Worker/Pages IDs 為準。
既有 VedAstro/SEO/GA4 等 WIP 沒有丟棄、提交或部署至正式系統。

正式網站 read-only 基本健康：
首頁、`/tarot/`、`/numerology/`、`/human-design/`、`/vedic-astrology/` 均 HTTPS 200。
不加 trailing slash 的舊 PowerShell probe 曾把正常 308 當作錯誤，
改用 canonical URLs/follow redirects 後確認 200，沒有修改正式網站。
此結果只代表頁面基本健康，不是正式登入/支付/報告完整驗收。

## H. 驗證總表

| 項目 | 狀態 | 實際界線 |
| --- | --- | --- |
| 測試 D1 schema/content preflight | PASS | 16/5 表、520 content；唯讀 |
| 遠端 D1 deployment 後 counts/FK | PASS | Customer 全空、Cards 520；0 migrations/seed |
| Worker HTTPS/health/config | PASS | 真實 workers.dev |
| Pages HTTPS zh/en | PASS | 真實固定 pages.dev、noindex/CSP |
| Cards API | PASS | 真實 520 GET 回應與確定性引擎逐筆比對 |
| Feature gates | PASS | 真實 public on，其餘 off；私人/正式 payment/admin API 拒絕 |
| Chrome public UI | PASS | 真實 HTTPS，zh/en × 390/768/1440，无 API mocks |
| 私人 UI | PASS | member page 提示未開放、無生日輸入 |
| CORS/test-only API traffic | PASS | 固定 origin，Chrome 無正式 API request |
| TypeScript/app + Worker + test scripts | PASS | 本次重跑 |
| ESLint | PASS | 0 errors；app 5 個既有 warnings |
| Frontend Build/SEO | PASS | 本地 45 routes，另有隔離 bundle audit |
| KIN / 外部來源 regression | PASS | 7 + 3 tests；296 普通日期/5 閏日差異 |
| Worker/D1/會員隔離/付款/provider | PASS | 全 36 tests；最終受影響 24 tests 再驗 |
| NT$2 cap/單次/並行/失敗停止 | PASS | 本地 D1，無 provider network |
| 七套塔羅及四大系統選定 regression | PASS | deep-analysis/subscription/recurring、HD/Vedic、4 組 numerology |
| 正式四大頁面健康 | PASS | 實際 HTTPS 200，不做交易 |
| 正式 deployment/D1 metadata/CI 隔離 | PASS | snapshots 相同 |
| 真實 Google / 登入生日計算 / 兩會員 E2E | BLOCKED / NOT RUN | 缺專用 Secrets/Client、cookie 尚待實測 |
| 官方 ECPay 三商品付款 | BLOCKED / NOT RUN | 缺 key/IV/session，未授權付款操作 |
| OpenAI Live 品質/實際費用 | BLOCKED / NOT RUN | 無 key、flag off、尚未授權 |
| DNS/custom domain/OAuth 修改 | NOT RUN | 等待確認 |
| 正式完整部署 | NOT RUN | 此次禁止 |

最終無未修復 FAIL；初次 preview 404、read-query 400、VS Code browser CDP timeout
均如實記錄，不算真實整合 PASS。
瀏覽器替代方式為 same-host installed Chrome/Playwright，
對公開測試網址真實連線，無 route fulfillment/Mock OAuth/Mock Payment。
Feb29 birthday 422、五大神諭、未確認城堡象徵、舊月亮輸出、每日付費會員继续停用。

## 下一輪與關閉方式

目前可直接檢視公開中英文介紹、KIN content lookup；不需任何 Secret。
需要另一輪授權/人工設定才可執行：

1. 專用 Google Client/兩測試 users/Origin + 新 JWT_SECRET，
   實測 cookie/CORS/登入導回後開 member。
2. 專用 ECPay stage key/IV，開 sandbox（production payment 保持 false），
   官方三商品 zh/en 支付/callback/owner/logout 驗收。
3. 另行核准 Live key/成本範圍與人工品質驗收，才開 AI；
   先實測 failure/cap，不做未授權付費 calls。
4. 只有 cookie/HTTPS 需求確實要求 custom domains 時才提出 DNS/OAuth 變更，
   經確認後操作。

完成測試後按授權將 public/member/sandbox/AI 都 false，
停用 test workers.dev 或專用 key/client，保留可對帳資料/證據；
不自動刪除資料庫或正式資源。測試 Worker 的 rollback 可使用上一測試 version，
首次版本也保持私人 gates off；正式系統沒有部署變更可回滾。

## 本次檔案/證據

- 新增 [mayaTestEntry.ts](../worker/src/mayaTestEntry.ts)、
  [maya-deployment-check.ts](../worker/scripts/maya-deployment-check.ts)、
  [maya-public-smoke.ts](../app/scripts/maya-public-smoke.ts)。
- 修改 Maya API/AI/payment、test Wrangler/Vite、environment checker、
  Sandbox check、test tsconfig/package scripts、雙語 payment 說明；
  engine、025/026/027、520 seed、七套塔羅核心均未修改。
- Session artifacts：`maya35-before.json`、`maya35-final-deployment-audit.json`、
  `maya35-test-d1-after.json`、`maya35-production-smoke.json`、
  `maya35-browser/maya35-public-smoke.json` 與 screenshots。
  無 Secret 值、會員生日或實際付款資料。
- 重跑公開 smoke：
  設定本地 `MAYA_ACCEPTANCE_OUTPUT` 後 `npm --prefix app run test:maya-public-smoke`。
  此命令只讀公開測試 UI/API，不登入、不付款、不呼叫 paid AI。

已停止在真實 Google/付款/AI 驗收之前，等待下一次確認。
