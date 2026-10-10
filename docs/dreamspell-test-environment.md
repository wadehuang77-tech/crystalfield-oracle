# Dreamspell Phase 2.6：獨立 Cloudflare 測試環境準備

Phase 3.5 後續：現已先使用固定
`crystalfield-maya-sandbox.pages.dev` / `crystalfield-maya-sandbox-api.wadehuang77.workers.dev`；
未設定預定 custom DNS。public true，其餘私人/付款/AI gates false。
詳見 [Phase 3.5 部署報告](dreamspell-phase-3-5-sandbox-deployment.md)。
以下內容為各階段歷史紀錄，不能用舊設定覆蓋目前測試部署。

## 後續本地 Phase 3 開關更新

本地 `wrangler.maya-test.json` 現在明確設定五個 `MAYA_*_ENABLED` 為 `"false"`。
除既有 Sandbox 開關外，public/member/payment/AI 也須明確授權啟用；
單開 sandbox 不會繞過 public/member 依賴。payment 與 sandbox 同開會同時封鎖。
外部 E2E 使用 Mock 報告時仍需 AI flag，但不使用 Live Provider。
此更新未部署，以下稽核為歷史紀錄，不代表目前雲端重新查验結果。
參見 [Phase 3 本地阻塞修復報告](dreamspell-phase-3-blocker-fixes.md)。

稽核日期：2026-10-10。授權僅限唯讀稽核、本地設定與規劃。
**未建立任何雲端資源、公開入口、DNS 紀錄；未部署、執行 SQL/migration、
操作 Google/金流設定、付款、呼叫付費 AI、commit 或 push。**

## A. 可行性與實際唯讀稽核

指定架構可行：

- 前端：`https://maya-test.crystalfield101.com`
- API：`https://maya-api-test.crystalfield101.com`

兩者與正式站在同一 registrable domain，但使用不同 origin。
這有利於現有 credentialed、host-only Secure Cookie 流程；
仍需實測 GIS popup、CSRF、CORS 與瀏覽器 Cookie 行為。
使用**獨立 Pages project、Worker、兩個 D1、Secrets、build artifact**，
不得只是把正式專案的分支加上「test」名稱。

### 2026-10-10 實測

| 資源／檢查 | 唯讀結果 |
| --- | --- |
| Cloudflare 登入 | 既有 Wrangler OAuth 可讀取帳號 metadata，沒有重新登入 |
| Account | 與現有專案設定帳號相符 |
| `crystalfield101.com` zone | API GET 確認 `active`，位於該帳號 |
| NS | `evan.ns.cloudflare.com`、`tegan.ns.cloudflare.com` |
| 預定前端 DNS | 本機 DNS 查詢為 name does not exist；公開 resolver 未回傳 CNAME |
| 預定 API DNS | 同上，尚無可驗證解析 |
| DNS 後台紀錄 GET | **403**：現有 token 無所需權限，後台紀錄／衝突 **未確認** |
| Pages projects | `bolt-tarot`、`vibe-coding-business`；無建議測試 project |
| 正式 Pages | `bolt-tarot`，domains 為 `bolt-tarot-5ek.pages.dev`、主網域、www；Git provider 為 No |
| Worker scripts | `bolt-tarot-api`、`vibe-coding-business`、`vibe-coding-business-api`；無建議測試 Worker |
| 正式 Worker domain | `api.crystalfield101.com` → `bolt-tarot-api` |
| 正式 route | `api.crystalfield101.com/*` → `bolt-tarot-api` |
| D1 inventory | `bolt-tarot-customer`、`bolt-tarot-cards`、`vibe-coding-business-db`；無建議測試 D1 |
| TLS／兩個測試網址服務 | **NOT RUN／BLOCKED**：DNS 尚無可驗證解析，不假設 HTTPS 已可用 |

只讀取 zone、資源名稱、domain/route、deployment metadata。
未讀取 D1 會員／訂單內容，也未查詢 Secret 明文。
Wrangler 現有 token 權限包含寫入，但本次只使用唯讀操作，
不得把「有 token」視為已授權建置或部署。

**DNS NXDOMAIN 不等於名稱已保留或不存在停用的後台紀錄**；
後續由使用者在 Dashboard 核對衝突、CAA/憑證、zone hold、Access/WAF 設定。
Cloudflare 資源列表只證明本次可見帳號內未見名稱，
不是全球 Pages 名稱可用性的預先保證。

## B. 建議資源名稱

| 用途 | 建議名稱 | 狀態 |
| --- | --- | --- |
| Pages project | `crystalfield-maya-sandbox` | 尚未建立；Pages 全球名稱可用性待確認 |
| Pages preview branch alias | `maya-test` | 尚未建立 |
| Worker | `crystalfield-maya-sandbox-api` | 本次帳號列表未見，尚未建立 |
| Customer D1 | `crystalfield-maya-sandbox-customer` | 尚未建立 |
| Cards D1 | `crystalfield-maya-sandbox-cards` | 尚未建立 |
| 前端 custom domain | `maya-test.crystalfield101.com` | 尚未啟用 |
| API custom domain | `maya-api-test.crystalfield101.com` | 尚未啟用 |

Pages 最終 `pages.dev` 名稱以 Cloudflare 真正分配為準，不直接假設等於 project 名稱。

### Pages 選擇

建議獨立 **Direct Upload** 測試 project，不連 Git、不自動建置、不用現有 CI。
以獨立本地測試 artifact 上傳指定 `maya-test` preview branch；
其固定 alias 真正產生後，再關聯指定測試 custom domain。

若要 custom domain 明確指向 preview branch：

1. 先有成功的 preview branch deployment；
2. 在獨立測試 Pages project 的 Custom domains 加入指定 hostname；
3. 該 zone 的 **proxied CNAME** 指向實際 branch alias，
   如 `maya-test.<ACTUAL-PAGES-SUBDOMAIN>.pages.dev`；
4. 必須驗證自訂網域實際內容／build manifest，避免落到 project production branch。

Cloudflare 官方文件：
[custom branch aliases](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/)、
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)。
未經 Pages Custom domains 關聯而只加 DNS CNAME，可能導致 522。
branch alias 需 proxied Cloudflare DNS；不可假設 unproxied 設定仍指向 preview。
**上述全是後續需授權的雲端寫入／公開部署，本次未做。**

若選擇獨立測試 project 的「Production」deployment 承載測試網域，
該名稱只是 Cloudflare 的 project environment，不代表正式商業站；
仍需另外確認並授權，不能混用正式 `bolt-tarot` project。

## C. 已準備的本地設定

### 1. Worker 設定

新增 [wrangler.maya-test.json](../worker/wrangler.maya-test.json)，
完全獨立於 [wrangler.toml](../worker/wrangler.toml)：

- 新 Worker 名稱，`main=src/index.ts` 重用既有 API implementation。
- 保留相同 account；不複製正式 D1 ID。
- 兩個 D1 ID 都是 `REPLACE_WITH_NEW_TEST_*` placeholders。
- `workers_dev=false`、`preview_urls=false`、`routes=[]`：
  **準備階段不發佈任何 Worker 路由。**
- `ENV=dev`、`MAYA_AI_MODE=mock`。
- `MAYA_SANDBOX_ENABLED=false`：準備期間關閉 checkout/callback。
- `MAYA_SANDBOX_MERCHANT_ID=3002607`。
- 專用 API/frontend origins 都是使用者指定測試 hostname。
- `ALLOWED_ORIGINS` 僅允許測試前端，不含正式站或 `*`。
- `DB`／`DB_CARDS` 對應不同新測試資料庫名稱；
  `remote=false` 防止本地 Wrangler dev 連 remote D1。
- customer migrations_dir 指向既有 customer migrations；
  cards migrations_dir 指向獨立 cards migrations。
- 不複製正式 workflow、ratelimit namespace、付費 API、郵件設定、
  deployment routes 或其他雲端 binding。
- 不含 JWT、Google、金流 Secret 值。

**現在不是可部署的完成設定。**D1 placeholders 必須保持至新資源建立且 ID
人工核對完成；不能以正式或其他既存 D1 替代。
`remote=false` 只影響本地 dev，**不會阻止 remote CLI/部署操作**。
`routes=[]` 也不是阻止使用者執行 deploy 的安全鎖；
目前禁止任何 deploy，將來仍需明確 config、帳號、資源審核與操作授權。

後續 API custom domain 計畫：

```json
{ "pattern": "maya-api-test.crystalfield101.com", "custom_domain": true }
```

這段**沒有加入目前 routes**；只有另獲公開入口授權後才能加入測試設定，
不得變更正式 Worker 的 routes。

### 2. 前端測試 build

新增 [vite.maya-test.config.ts](../app/vite.maya-test.config.ts) 與命令
`build:maya-test`：

- 只接受 `--mode maya-test`。
- 必須明確設定 `VITE_API_BASE=https://maya-api-test.crystalfield101.com`；
  缺少或指向正式 API 即失敗。
- 在測試 bundle 固定此 API base，重用原 credentialed transport。
- 輸出 [dist-maya-test/](../app/dist-maya-test)，不覆蓋正式 `dist/`；
  在 build 清空／寫入輸出前拒絕其他 outDir override。
- 不執行原 prerender，避免產生正式 SEO sitemap／indexable 頁面。
- 測試 HTML 移除正式 GA4/Meta bootstrap；沒有改動正式
  [index.html](../app/index.html)。
- 全站生成 `X-Robots-Tag: noindex, nofollow, noarchive`、
  `robots.txt: Disallow: /`。
- 產生測試 `_headers` CSP：業務 connect-src 僅 self／測試 API，
  允許 Google 登入必要來源；form-action 僅 self／ECPay stage。
  禁止連正式 API、production analytics、正式付款入口。
- 產生不含機密的 `maya-test-build.json`，供上傳前／部署後確認 artifact。

**noindex 不是存取控制。**後續公開測試域必須另做測試帳號與公開路徑風險檢查。
CSP 是測試環境額外防護，未在真正 GIS／ECPay 外部流程實測；
若 Google widget 因來源或 CSP 阻擋，維持 BLOCKED，不能隨意放寬到正式 API。
既有 share/canonical 的正式介紹連結不代表業務 API 請求；本次未重寫產品內容。

### 3. 本地隔離檢查

新增 [maya-environment-check.mjs](../app/scripts/maya-environment-check.mjs)：

- 使用已安裝 Wrangler JSON schema／既有 Ajv 驗證 Worker 設定。
- 檢查精確 Worker 名稱、兩個不同 D1、非正式 ID、無公開 routes、
  關閉 Sandbox、無 Secret／不相關 binding。
- 檢查測試 build 使用獨立 artifact，無 deploy/prerender 步驟。
- `--check-build` 驗證 compiled JS 沒有正式 API URL、
  正確測試 API、移除正式 analytics bootstrap、
  CSP/noindex/robots 與 Pages project manifest。
- `--require-d1` 遇到 placeholders 必定失敗；填 ID 後也只證明**靜態檢查**，
  不是已確認雲端 ID 的 owner、resource type 或實際 binding。

本地操作（已執行，沒有雲端寫入）：

```powershell
npm.cmd --prefix app run check:maya-environment
$env:VITE_API_BASE = 'https://maya-api-test.crystalfield101.com'
npm.cmd --prefix app run build:maya-test
npm.cmd --prefix app run check:maya-environment -- --check-build
npm.cmd --prefix app run typecheck:maya-acceptance
```

更新 [.gitignore](../.gitignore) 忽略獨立測試 build artifact；
更新 [package.json](../app/package.json) 與測試 tsconfig。
未新增 dependency，也未編輯兩份既有 GitHub workflow。

## D. 手動設定與完整網址

下列項目現在只是操作規劃，**不要在未另獲授權前執行**。

### 【使用者／Cloudflare：DNS 與資源】

1. 在 zone DNS 後台確認兩個 hostname 沒有既存 DNS、
   Workers route/custom domain、其他 Pages binding 或 Access 衝突。
2. 確認 account、zone active、CAA/TLS、zone hold 與 DNS 管理權限。
3. 另獲建資源授權後，建立上述獨立 Pages、Worker、兩個空白 D1。
4. 回填**新測試 D1 UUID**，核對 name/binding/account，執行本地靜態檢查。
5. 另獲 migration 授權後，對空白測試 DB 初始化完整登入 schema、
   migrations 025/026 與 520 bilingual content seed；
   cards 使用獨立 schema／經授權公開內容。
6. **不要複製正式資料，不匯入預先付費的 E2E 測試會員權限。**
7. 另獲測試公開部署／DNS 授權後，才上傳測試 artifact、部署測試 Worker、
   加 custom domain/branch alias。
8. 檢查 TLS、DNS、測試 build manifest、health/auth config、
   CORS/Cookie、Cloudflare cache 與 WAF/Access。
   私人 API 必須 no-store；不得設定 cache-everything 快取 session/profile/report。

目前 [customer-schema.sql](../d1/customer-schema.sql) 含 **DROP TABLE**；
只能考慮已確認空白且可丟棄的新測試 DB，不能對已有資料的 DB 重跑。
完整 base schema 與既有增量 migrations 的相容順序需在本地先核對，
不能把這次設定檢查當作完整初始化鏈已驗證。
現有 migration workflow 不是測試初始化工具。

### 【使用者／Google Cloud：獨立測試 OAuth】

- 建立 Web application 測試 Client，不修改正式 Client。
- Authorized JavaScript Origins：
  `https://maya-test.crystalfield101.com`
- 目前 GIS credential callback 架構**不需 Authorized Redirect URI**；
  不要把 API `/api/auth/google` 或會員頁填成 authorization-code redirect URI。
- 設定測試 consent、允許測試帳號；
  真實兩語言／會員隔離至少需兩個授權測試帳號。
- 將測試 Client ID 配到測試 Worker `GOOGLE_CLIENT_ID`。
  Client ID 是公開識別碼，不需要 Client Secret 來完成目前流程。
- 不要登記或擴大到正式站 origins；Pages 自動 alias 不列為正式 E2E 登入入口，
  除非另行核准。

### 【使用者／Cloudflare Secrets】

只在**測試 Worker**安全管理：

| 名稱 | 要求 |
| --- | --- |
| `JWT_SECRET` | 新產生、測試專用，與正式不同 |
| `GOOGLE_CLIENT_ID` | 獨立 Google 測試 Web Client |
| `MAYA_SANDBOX_HASH_KEY` | 與測試 `3002607` 匹配 |
| `MAYA_SANDBOX_HASH_IV` | 與測試 `3002607` 匹配 |

**不提供或輸出任何 Secret 明文**；不放在 VITE_*、JSON、Git 或前端 bundle。
不帶入正式 ECPAY_*、OPENAI_API_KEY、RESEND、Prokerala 等付費／正式設定。
`MAYA_SANDBOX_ENABLED` 保持 false，直到可達 callback、測試憑證與付款操作
都另獲授權且準備完成。

### 【使用者／綠界：測試憑證與 callback】

| 用途 | 完整規劃 |
| --- | --- |
| stage checkout | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| ReturnURL | `https://maya-api-test.crystalfield101.com/api/maya/sandbox/callback` |
| OrderResultURL | `https://maya-api-test.crystalfield101.com/api/maya/sandbox/result` |
| 中文 ClientBackURL | `https://maya-test.crystalfield101.com/maya-calendar/member?maya_order=<ORDER_ID>` |
| 英文 ClientBackURL | `https://maya-test.crystalfield101.com/en/maya-calendar/member?maya_order=<ORDER_ID>` |
| 中文首頁 | `https://maya-test.crystalfield101.com/maya-calendar` |
| 英文首頁 | `https://maya-test.crystalfield101.com/en/maya-calendar` |

ORDER_ID 由後端產生，不固定填入，也不包含生日/email。
三個 return 欄位由 checkout form 動態設定；綠界後台若要求登記則用實際測試域。
callback/result 必須允許綠界直接 POST，不得被 Access login/challenge 阻擋；
例外限指定路徑，不關閉程式 CheckMac/merchant/amount/owner 驗證。
只有 ReturnURL 交易驗證能 grant；browser result 或 URL 不能 grant。
`SimulatePaid=1` 仍拒絕開通。

## E. 部署前隔離清單與驗證結果

### 本次本地／唯讀結果

| 檢查 | 結果 |
| --- | --- |
| Cloudflare zone/account/資源 inventory 唯讀 | PASS；DNS 後台讀權限另列 BLOCKED |
| 預定 DNS／TLS 已可用 | BLOCKED，沒有已存在入口的證據 |
| 專用 Worker JSON schema | PASS，使用已安裝 Wrangler schema |
| 不引用正式 D1、兩 binding 分離、routes 空、公開 flags 關閉 | PASS，靜態檢查 |
| D1 readiness | BLOCKED：placeholders；負向測試確認 `--require-d1` 拒絕 |
| 測試前端 build | PASS：1601 modules，本地 dist-maya-test，既有 bundle size 警告 |
| missing VITE_API_BASE／正式 API override／outDir 指向正式 dist | PASS：均在 build 寫入前被拒絕 |
| compiled JS 正式 API URL | PASS：未出現；測試 API URL 存在 |
| HTML analytics／noindex／robots／CSP | PASS |
| 同主機 Chrome 的 CSP 正式 API fetch 阻擋 | PASS：本地臨時伺服器、所有外連攔截，未送出正式請求，測試後關閉 |
| TypeScript（含新 Vite config） | PASS |
| ESLint | PASS，0 errors，5 個既有 warnings |
| 原 `dist/`、正式 Vite config／index／wrangler／workflow | 本次未修改 |
| 雲端建立、DNS 寫入、SQL、migration、部署、付款 | NOT RUN：未授權且未執行 |
| Google/ECPay 真實 E2E | BLOCKED／NOT RUN |

本次不重跑 Dreamspell 功能全套測試，因未改核心／API／功能。
前述 PASS 是**環境準備靜態及本地 build 防護**，不是外部整合或上線通過。

### 每次部署前必須人工確認

- [ ] 選定的是測試 Pages project／Worker/account。
- [ ] 顯式使用 `wrangler.maya-test.json`，**不使用 npm run deploy 的正式預設**。
- [ ] 兩個 D1 ID 是這次新建的測試 DB，與所有既存 DB 不同；核對 Dashboard。
- [ ] 所有 Secrets 只屬於測試 Worker；沒有正式或付費服務 Secrets。
- [ ] 前端只上傳 `app/dist-maya-test`，檢查 build manifest，不能誤上傳 `app/dist`。
- [ ] 不透過 Git push、PR merge、main workflow_dispatch 或現有 D1 workflow 部署。
- [ ] 如果新增 public route，只能精確測試 API hostname，沒有 wildcard。
- [ ] DNS/CNAME/Pages association/TLS 正確，custom domain 指向正確 branch。
- [ ] ALLOWED_ORIGINS 精確匹配測試前端，無正式 origins 或 `*`。
- [ ] 正式站、正式 API、既有兩個 D1 的 bindings／routes 未變。
- [ ] 私人 API no-store；全測試站 noindex；公開 callback 路徑有嚴格簽章檢查。
- [ ] 真實 E2E 帳號沒有預先 mock paid 權限，沒有匯入正式會員資料。
- [ ] 已取得此次雲端建立／migration／公開部署的逐項明確授權。

### CI/CD 隔離

現有 [ci-deploy.yml](../.github/workflows/ci-deploy.yml)：
非 PR、`main` 事件可部署正式 Worker／Pages；
build 的 VITE_API_BASE 若無變數也預設正式 API。
現有 [d1-migrations.yml](../.github/workflows/d1-migrations.yml)
是需輸入 APPLY 的正式 remote 操作。

本次沒有更動 workflow、Git commit/ref 或 push，也沒有觸發 GitHub Actions。
新本地測試 build/check 命令只讀寫本地，不含 deploy／SQL／Cloudflare write。
**加一份測試 config 不會使現有 CI 自動變成測試 CI**；
將來必須與正式 workflow 完全分開，禁止借用正式 repo variables/secrets。

## F. 下一步需明確授權

請分階段批准，不把本次本地準備授權延伸成雲端操作：

1. **資源建立授權**：獨立 Pages project、Worker、新 customer/cards D1；
   仍禁止上傳 artifact、公開域與 DNS 寫入。
2. **測試 DB 初始化授權**：核對新 UUID、base schema/migrations 順序、
   空白測試 DB／非私密內容 seed；不能操作正式 DB。
3. **測試設定授權**：獨立 Google Client、測試 Secrets、CORS、
   完整測試域 DNS/Pages/Worker custom domains。
4. **公開測試部署授權**：只有兩個指定測試域／獨立資源，
   含 Pages 自動公開的 pages.dev alias；不得改正式 deployment。
5. **外部操作授權**：真實 Google 測試帳號、ECPay stage 測試付款，
   使用者自行操作，不提供 credential；Mock AI，不啟用付費模型。

完成實際測試後的關閉流程：

- 確認沒有 pending callback，再關 `MAYA_SANDBOX_ENABLED`；
  現有 gate 同時關 checkout/callback，不能有未處理付款就直接關。
- 關測試 Worker custom domain、workers.dev/preview 及 Pages custom domain/alias。
- 移除／輪替測試 Secrets，停用測試 Google Client/origins、綠界測試登記。
- 保留去識別化驗收報告；刪除測試 D1／Pages project 需另外核對 ID 與刪除授權。
- 最後外部驗證測試入口不可達，正式站未受影響。

目前保持本地準備完成、雲端資源與真實 E2E BLOCKED。
**沒有建立公開測試入口。完成後停止，等待使用者確認。**
