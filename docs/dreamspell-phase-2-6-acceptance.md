# CrystalField101 Dreamspell Phase 2.6 integration acceptance

日期：2026-10-10。僅本地程式、Sandbox 接線與驗收；未進入 Phase 3。

**結論：Sandbox 程式與離線整合 PASS；真實 Google OAuth、綠界 Sandbox
付款及中英文完整外部 E2E 均 BLOCKED，實際操作 NOT RUN。尚不具備正式上線條件。**

使用者本次明確確認：尚未準備外部測試環境，先完成 Sandbox 程式及離線測試，
提供解除阻塞步驟。沒有索取密碼、Cookie、Token 或金流金鑰。
合成簽章／測試 session／Mock UI 的 PASS 不當作真實外部整合 PASS。

## A. Google OAuth 真實驗收

稽核 [googleAuth.ts](../worker/src/googleAuth.ts)、
[GoogleSignInButton.tsx](../app/src/components/GoogleSignInButton.tsx)、
[utils.ts](../worker/src/utils.ts) 與
[wrangler.toml](../worker/wrangler.toml)。保留既有登入系統，不新增登入機制。

| 項目 | 稽核／驗收結果 |
| --- | --- |
| Google Web Client ID | Worker 使用 `GOOGLE_CLIENT_ID`；本地無設定可供真實驗收。未讀取正式 secret，正式值 **未確認** |
| Authorized JavaScript Origins | Google Console 實際值 **未確認**；Worker 現有 allowed origins 是正式站與 localhost/127.0.0.1:5173，沒有 5199 |
| Authorized Redirect URIs | Console 實際值 **未確認**。本程式採 GIS JavaScript credential callback，**沒有傳統 authorization-code redirect URI 流程** |
| Google credential 驗證 | 既有 RS256、Google JWKS、issuer、audience/azp、exp/iat、sub、verified email，僅 Gmail／Workspace authoritative identity |
| Google CSRF | HttpOnly/Secure/SameSite=None cookie，credential POST 必須匹配 csrf token |
| Worker session | 既有簽署 JWT、有效期、profiles/token_generation；Maya 讀取 fail-closed，資料庫錯誤不放行 |
| 中文／英文安全登入導回 | **PASS：離線 auth 與頁面導航測試**；真實 OAuth 導回 **BLOCKED／NOT RUN** |
| 真實 Google 登入後儲存 KIN／重新登入／登出 | **BLOCKED／NOT RUN** |
| 真實兩帳號會員隔離 | **BLOCKED／NOT RUN** |
| 簽署測試 session、失效／撤銷 session、own profile/report、異會員拒絕 | **PASS：隔離 Worker/D1 測試**，不是 Google 簽發的 credential |

`/api/auth/google` 接收 GIS credential POST；不要為本流程把它當作 Google
authorization-code redirect URI 登記。前端登入後自行依安全且保留語言的
`redirect` 返回 Dreamspell 原頁。

### Google 解除阻塞

1. 準備獨立測試前端、API、D1，使用非正式網域的 HTTPS origin；不得修改正式
   OAuth Client 或正式 Worker 設定。前端應以測試 `VITE_API_BASE` 指向測試 API。
2. 建立或取得授權的 **Web application** 測試 Client，登記該前端完整 origin
   （scheme、hostname、port；不含 path），OAuth consent 若為 testing，加入
   授權測試帳號。僅在測試 Worker 安全設定 `GOOGLE_CLIENT_ID` 與測試 session secret。
3. 測試 API 的 `ALLOWED_ORIGINS` 必須包含實際前端 origin；GIS CSRF 與 session
   cookies 要能送回 API。建議使用同一測試 site 的前端/API 子網域，檢查第三方
   cookie 限制；不為方便測試關閉正式 cookie 安全屬性。
4. 使用空白、隔離 D1 建立既有會員及 auth 所需 schema，包含
   profiles/token_generation、profile_member_metadata、rate_limit_events，
   以及既有登入使用的 tarot/free-reading metadata 表，再套用 Maya 025、026。
   不能只用本測試腳本的精簡 profiles 表假裝可支援完整 Google 登入。
   現有 [customer-schema.sql](../d1/customer-schema.sql) 含 **DROP TABLE**，
   **不得對任何已有資料的資料庫執行**；本次沒有執行它。
5. 人工從中文入口以測試帳號 A 完成 Google，再從英文入口以帳號 B 完成；
   驗證導回、生日持久化、登出後 401、異會員 profile/report 拒絕。
   只記錄去識別化結果及狀態碼，不複製 credential。

## B. ECPay Sandbox 整合與測試

重用既有 [ecpay.ts](../worker/src/ecpay.ts) 的
`buildAioCheckOutForm`、`computeEcpayCheckMac`、`makeMerchantTradeNo`。
**沒有把 Maya 加入正式 SPREAD_CATALOG，沒有修改其他商品價格或正式 ECPay 設定。**

### Sandbox 隔離 gate

新增 [mayaSandbox.ts](../worker/src/mayaSandbox.ts)，只有下列條件**全部成立**
才提供 checkout／callback：

| 測試設定 | 要求 |
| --- | --- |
| `ENV` | `dev` |
| `MAYA_AI_MODE` | `mock` |
| `MAYA_SANDBOX_ENABLED` | 明確 `true`，預設關閉 |
| `MAYA_SANDBOX_MERCHANT_ID` | 固定測試 merchant `3002607` |
| `MAYA_SANDBOX_HASH_KEY` / `MAYA_SANDBOX_HASH_IV` | 測試 Secret；**不讀既有 ECPAY_HASH_KEY/IV** |
| `MAYA_SANDBOX_API_ORIGIN` | 獨立 HTTPS callback origin，非三個現有正式站網域 |
| `MAYA_SANDBOX_FRONTEND_ORIGIN` | 獨立 HTTPS 前端 origin，同樣拒絕正式站網域 |
| `ALLOWED_ORIGINS` | 明確包含該測試前端 origin |

固定付款 endpoint：
`https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`。
沒有 production endpoint fallback，沒有 admin 免付費 bypass，沒有 recurring。
前端也拒絕非 stage endpoint、錯誤 merchant、商品金額不符、
錯誤 order binding、暴露 HashKey/HashIV 或 period 欄位的 form。

### 新增 API

| 路徑 | 行為 |
| --- | --- |
| `GET /api/maya/checkout/config` | 需 session，只回報 Sandbox enabled/mode，不回傳 secret |
| `POST /api/maya/checkout` | session/origin/locale/product/input validation、每會員每小時 10 次、owner-bound idempotency，回傳 stage 簽署 form |
| `GET /api/maya/checkout/:id` | 只讀自己的 Sandbox 訂單狀態及商品／金額，不接受 user_id |
| `POST /api/maya/sandbox/callback` | 外部 form-urlencoded callback，僅本路徑免 browser Origin/session；必須通過 Sandbox gate 與完整簽章核對 |
| `POST /api/maya/sandbox/result` | 簽章核對後 303 返回**訂單儲存語言**的會員頁；**不更新付款、不開權限** |

三商品：

- `MAYA_BASIC_199`：NT$199。
- `MAYA_FULL_499`：NT$499。
- `MAYA_RELATIONSHIP_699`：NT$699。

訂單以既有 orders 儲存，`item_type='maya_sandbox'`，
新增 [migration 026](../d1/migrations/026_maya_sandbox_checkout.sql)
的 `maya_sandbox_orders` 只存補充關聯：
order_id、user_id、product_code、merchant_id、locale、checkout_key、
unique trade_no、created_at。無 DROP、無覆蓋會員或付款資料。
保留 migration 025，不重建五個 Maya 表。
**025＋026 只在 Miniflare 的隔離本地 D1 測試，未套用正式 D1。**

### Callback 核對與交易

- 限定 form-urlencoded，串流讀取上限 16KB，拒絕重複或大小寫碰撞欄位。
- 使用測試 Secret 驗證 SHA-256 CheckMac，固定格式及 constant-time 比對。
- 核對 MerchantID、MerchantTradeNo、TradeNo、TradeAmt、RtnCode、
  SimulatePaid、CustomField1 商品及 CustomField2 訂單。
- 查後端 order/metadata 核對商品 catalog 金額、member ownership、
  merchant、item_type；不從前端指定會員或接受 paid=true。
- 成功 callback 以 D1 atomic batch 寫入 trade binding、paid 狀態與
  **僅該商品** entitlement。保留 unique(order_id, product_code)；
  同回呼重播／並行只能一份權限，不重新啟用 revoked 權限。
- 失敗訂單不開通，失敗後成功衝突拒絕；已驗證 paid 的延遲失敗不覆蓋 paid。
- 同 TradeNo 不得任意換綁訂單；已綁定 TradeNo 的不一致回呼拒絕。
- D1 entitlement write failure：整筆 batch rollback，保留 pending，
  可重送 callback，不重複 grant。
- `SimulatePaid=1` **不開通**，不要把綠界後台「模擬通知」當作測試付款成功。
- Sandbox 權限僅在 gate 成立時被 Maya report 接受；離開測試環境不可使用。
- 199／499／699 均不包含每日深度權限，`daily/premium` 繼續 403。
- 既有 shared ECPay webhook 明確拒絕 `maya_sandbox` order，
  避免透過其他金流路徑變更測試訂單。

### 結果

| 測試項目 | 結果 |
| --- | --- |
| 三金額 × 兩語言 stage form、CheckMac、無 Secret 洩漏、無自動續扣 | **PASS：合成測試 Secret，未送出綠界網路請求** |
| 簽章／merchant／trade／amount／product／order／owner mismatch、偽造成功 | **PASS：離線 callback fixtures** |
| 成功只開對應報告，未付款／失敗不開，premium 不開 | **PASS：真實隔離 D1** |
| idempotency、並行/重複 callback、revocation、DB rollback/retry | **PASS：真實隔離 D1** |
| 中文／英文 browser result 303 與 ClientBackURL | **PASS：離線；語言來自存檔訂單** |
| callback → D1 grant → Mock report → own history/privacy | **PASS：離線 Worker 整合，非真實外部付款** |
| 真實 ECPay stage 199／499／699、可達 callback、實際付款導回 | **BLOCKED；實際操作 NOT RUN** |

本次 [maya-sandbox-check.ts](../worker/scripts/maya-sandbox-check.ts)
**8 tests PASS**。測試用 HashKey/IV 是明確的合成值，不是可用綠界憑證。
離線簽章往返驗證還不是綠界官方外部成功付款證明。

### 綠界解除阻塞

1. 取得授權且匹配 `3002607` 的 stage 測試 HashKey/IV；
   安全放入**測試環境** Secret 管理，不貼在聊天、程式或 repo。
   若沒有匹配此 merchant 的憑證，維持 BLOCKED，不換正式 merchant。
2. 準備可由綠界訪問的 HTTPS 測試 API入口，callback/result URL 如上。
   可以另行授權獨立測試反向代理／tunnel；本次未建立 tunnel、未公開本機服務、
   未部署任何站點。127.0.0.1 callback 對外不可達，因此 gate 不接受 HTTP loopback。
3. 安全設定上述專用 Sandbox variables，使用隔離 D1 及測試 Google client。
   現有正式 [wrangler.toml](../worker/wrangler.toml) 綁定正式 D1 與網域；
   **不能拿它直接啟動或套用測試 migration**。必須有獨立本地測試設定，
   禁止 `--remote` 及正式資料庫 ID。
4. 確認外部 POST 可以到 callback，不要求登入／browser Origin，也不由 WAF/CSRF
   阻擋；仍保留程式簽章核對。只回報去識別化 event/outcome/code。
5. 以官方測試付款方式走三商品，並驗收錯誤金額、失敗、偽造、重複 callback、
   revocation、語言導回及付款前後 report/premium 權限。
   不輸入真實付款資料，不啟用 production endpoint。

## C. 中文完整外部 E2E

**BLOCKED；全流程實際執行 NOT RUN。**

已建立 [maya-external-e2e.ts](../app/scripts/maya-external-e2e.ts)：
headed Chrome、fresh browser context、使用者自行操作 Google 與綠界測試頁。
不保存 browser profile、Cookie、Token、birth data、完整報告、trace 或截圖。
只記錄 locale/stage/status。

流程：
介紹 → 真實 Google credential POST 回應 200 → 中文原頁 →
生日 KIN/重新整理確認持久化 → 每日免費內容 → Sandbox checkout →
觀察實際 stage POST/navigation → 使用者測試付款 → 返回 →
輪詢自己的後端訂單 paid → 生成 Mock report → history → Sign Out →
profile/report API 401。

程式只 abort 非允許流量，**從不 fulfill/替換 OAuth、Payment 或 API 回應**。
stage 與測試 origins、Google 必要 hosts 以 allowlist 控制；其他 analytics／
production payment／AI requests 阻擋。先確實進入 stage，再等待導回，
避免舊頁 URL 誤判為付款已完成。

本次只執行 prerequisite gate，產生 `BLOCKED` artifact；
沒有準備環境時不開瀏覽器、不登入、不付款。Runner 本身已 typecheck/lint，
**真實互動分支尚未實測**，不可宣告 runner 真實 E2E PASS。

## D. 英文完整外部 E2E

**BLOCKED；全流程實際執行 NOT RUN。**

同一 runner 在中文後使用 fresh context 驗收 `/en/maya-calendar`，
確認 Google 導回英文會員頁，form Language=ENG、英文商品名稱、
儲存訂單 locale=en 與英文 result return；英文 Mock 報告和 history。
需使用沒有該商品 entitlement 的另一授權測試帳號，以實際完成 checkout；
不要用已授權報告繞過測試付款。

解除阻塞後，在本地 PowerShell 設定**非機密** origins 與操作授權：

```powershell
$env:MAYA_ACCEPTANCE_OUTPUT = Join-Path $env:TEMP 'crystalfield-maya26'
$env:MAYA_E2E_FRONTEND_ORIGIN = 'https://YOUR-TEST-FRONTEND'
$env:MAYA_E2E_API_ORIGIN = 'https://YOUR-TEST-API'
$env:MAYA_E2E_AUTHORIZED = 'true'
$env:MAYA_E2E_PRODUCT = 'MAYA_BASIC_199'
npm.cmd --prefix app run test:maya-external-e2e
```

替換 origin placeholders；不要把 secret 加入命令或輸出。
可分別改為 `MAYA_FULL_499`、`MAYA_RELATIONSHIP_699` 重跑；
relationship 分支會輸入虛構 partner 日期。
每次預留人工 Google/付款時間（各最多 10 分鐘），
付款返回後等 callback（最多 2 分鐘）。
若 consent/CAPTCHA/付款失敗/網路不通，保留失敗狀態，
不得以 mock 替代。雙帳號彼此 report isolation 仍須配合 A 節驗收。

## E. 本次新增／修改檔案

### 新增

- [mayaSandbox.ts](../worker/src/mayaSandbox.ts)：隔離付款／callback／result API。
- [026_maya_sandbox_checkout.sql](../d1/migrations/026_maya_sandbox_checkout.sql)：
  additive Sandbox metadata。
- [maya-sandbox-check.ts](../worker/scripts/maya-sandbox-check.ts)：8 項離線 D1/付款整合測試。
- [mayaCheckout.ts](../app/src/lib/mayaCheckout.ts)：stage form 檢查及安全 DOM POST。
- [maya-external-e2e.ts](../app/scripts/maya-external-e2e.ts)：真實人工外部 journey runner。
- 本交付報告。

### 修改

- [index.ts](../worker/src/index.ts)：獨立路由／外部 callback origin exemption，
  既有 webhook 拒絕 Sandbox 訂單；其他系統路由行為保留。
- [utils.ts](../worker/src/utils.ts)：專用 Sandbox Env 型別，未改正式 secret。
- [maya.ts](../worker/src/maya.ts)：只在 Sandbox gate 成立時接受該測試訂單 grant。
- [api.ts](../app/src/lib/api.ts)：重用 credentialed transport，新增測試付款 API。
- [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx)：僅已啟用 Sandbox 才顯示
  測試 checkout，返回後讀自己訂單狀態，pending 提供重新整理；不憑 URL 開通權限。
- [maya-browser-check.ts](../app/scripts/maya-browser-check.ts)：保留 42 checks，
  新增六個語言/尺寸 Sandbox-gated UI checks 和安全 POST form probe。
- [app/package.json](../app/package.json)、
  [worker/package.json](../worker/package.json)：新增兩個 runner 命令。
- [tsconfig.maya-acceptance.json](../app/tsconfig.maya-acceptance.json)、
  [tsconfig.maya-tests.json](../worker/tsconfig.maya-tests.json)：新增測試檔 typecheck。

沒有新增 dependency，沒有改動 dreamspell-2026.2、301 日期 fixtures、
520 content seed、migration 025、Google auth implementation、
原有四系統核心、正式商品 catalog/價格或正式金流設定。
既有未提交工作樹與其他 Vedastro/SEO 變更保留，不算本次新增成果。

## F. 本次重新執行驗收

所有 PASS 是本次執行，未執行項目明列 NOT RUN/BLOCKED。

| 項目／命令 | 結果 |
| --- | --- |
| App TypeScript / Worker TypeScript | PASS：既有 `Validate localization batch` task |
| Worker `typecheck:maya-tests` | PASS |
| App `typecheck:maya-acceptance` | PASS |
| App ESLint | PASS：0 errors，5 個既有 warnings |
| Worker ESLint | PASS |
| Frontend Build | PASS：1601 modules；既有大 bundle warning |
| Prerender/SEO/robots/sitemap | PASS：45 routes |
| `test:hydration` | PASS：45 routes＋404 |
| `test:dreamspell` | PASS：7 tests，260 KIN/日期/雙語全商品 Mock schema |
| `test:maya-references` | PASS：3 tests，301 fixture 保留；296 一般日相符，5 個閏日差異維持 BLOCKED |
| Worker `test:maya` | PASS：12 tests，隔離 D1 migration/seed/rate/auth/ownership/report/privacy |
| Worker `test:maya-sandbox` | PASS：8 tests，合成簽章、atomic local D1、三商品雙語 form/callback |
| Migration 025/026 | PASS：隔離本地 D1；正式 migration NOT RUN |
| `test:maya-browser` | PASS：48 checks，390/768/1440 × zh-TW/en；Mock OAuth/API、攔截 form.submit probe，**不是外部付款** |
| `test:maya-external-e2e` prerequisite | BLOCKED：已執行環境 gate；實際 Google/綠界 zh/en journey NOT RUN |
| `test:maya-routes` | PASS：實際 SSR 雙語頁、auth/noindex/sitemap |
| `test:auth` / `test:payment-return` / `test:ga4` | PASS：既有 auth、付款導航、privacy analytics 回歸 |
| Worker `test:ecpay-recurring` | PASS：既有 recurring/one-time/idempotency 回歸，無外部付款 |
| Worker `test:health` / `test:calculation-auth` | PASS |
| 塔羅 `test:tarot-subscription` / `test:tarot-deep-analysis` | PASS |
| 人類圖 `test:human-design-report-locale` | PASS：模型呼叫 Mock |
| 印度占星 `test:vedic-locale` | PASS：無外部占星請求 |
| 生命靈數既有付款/導航回歸範圍 | PASS：payment-return/ECPay one-time；不宣稱全面核心 E2E |
| 四系統完整真實登入／金流／AI／所有核心 E2E | NOT RUN，不能以選定回歸代替 |
| Google Console 實際 origins/redirect/client settings | BLOCKED／未確認 |
| 真實 stage credentials/callback reachability | BLOCKED／NOT RUN |
| 正式 AI／真實付款／正式部署／commit/push | NOT RUN：禁止且未執行 |

VS Code test discovery 無法發現此 Node test script，已改用既有 `tsx --test`
runner，未把 discovery 空結果當 PASS。
新增程式首輪發現測試型別與 DOM form 變數 shadowing 問題，已修正，
最終 typecheck、lint 及 Chrome form probe 通過。

本地 Chrome 截圖/JSON 存於 session `files/maya26`，
external prerequisite artifact 明列 `mocks:false`、zh-TW/en NOT RUN；
不包含 secret、Google credential 或會員報告內容。

## G. 未解決項目與限制

1. **BLOCKED：真實 Google OAuth**。缺 test Client/Console 設定與授權操作環境。
   本次不替使用者登入、不更改正式 Google 設定。
2. **BLOCKED：真實 ECPay Sandbox**。程式接線完成，尚無可用測試憑證與
   外部可達 HTTPS callback；未驗證與綠界實際 callback 欄位完全相容。
3. **BLOCKED：中文／英文完整外部 E2E**。runner 可重跑，互動分支 NOT RUN；
   人工 CAPTCHA／登入／付款不以 Mock 繞過。
4. **BLOCKED：特殊規則**。2 月 29 日繼續 422＋雙語清楚錯誤；
   五大神諭、城堡象徵、舊 moon-date 及每日付費會員繼續停用。
5. **NOT RUN：實機與完整四系統 E2E**。Chrome 固定 viewport 不是實體 iOS/Android。
6. 整合瀏覽器先前 loopback 問題未宣稱根治，沿用同主機 Chrome 替代驗收。
7. 正式 AI adapter/cost/content、依賴 advisories 審核與 production 運維方案
   仍需另外授權；本次未無關升級或 audit fix。
8. 本次無錯誤自動付款「成功」fallback。已付款但 callback 尚未到時，
   前端明示 pending／可重新整理；沒有前端自行 grant。

## H. 是否具備 Phase 3 上線條件

**否。**已具備保留的 deterministic engine、雙語內容與頁面、
authenticated API、隔離 D1、Sandbox 接線及離線測試基礎；
尚缺真正外部 OAuth／三商品 stage callbacks／雙語端到端驗收證據。

在上線決策前應依 A/B 節準備獨立測試環境，再完成：

- Google 兩帳號／兩語言登入導回、session、資料隔離與登出；
- stage 三商品成功／失敗／偽造／重複 callback、revocation、
  付款返回與 report 權限；不包含 daily premium；
- 中文／英文完整 runner 及人工異會員驗收，記錄實際結果；
- 剩餘實機、完整回歸、特殊規則與 production 運維風險評估。

只有使用者另行確認後，才能討論 Phase 3 正式 Secret、D1 migration、
部署、付款切換及 AI 啟用；本次並未授權或執行。

本地暫時 Vite 於驗收後停止。
**沒有 commit、push、部署、正式 D1 migration、正式會員資料更動、
真實付款或付費 AI 呼叫。完成後停止，等待確認。**
