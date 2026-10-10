# Dreamspell Phase 3 production release gate

日期：2026-10-10（Asia/Taipei）。

## 實際發布結果：BLOCKED，未部署

使用者已授權分階段正式發布，但同時要求任何關鍵檢查失敗即停止。此次先執行唯讀正式環境稽核與本地驗證，發現正式 Maya 付款／AI 實作及真實外部驗收尚未完成，因此**停止於正式 Worker 部署之前**。

本次沒有正式或測試 D1 寫入、migration、seed、Secret 設定、OAuth 修改、DNS 寫入、Worker／Pages 部署、真實付款、付費 AI、commit 或 push。沒有以介紹頁或 Mock 結果替代完整服務上線。

## A. Git 與發布來源

- 工作目錄：`C:\Users\wadeh\Downloads\crystalfield-oracle`。
- branch：`main`。
- HEAD：`64d62ee55c8c8b4715c6dcc01410242975455f51`。
- 現有正式 Pages 記錄的 commit hash 與 HEAD 相同。
- 本地 Dreamspell 引擎、頁面、API、migration、seed 等多個檔案仍為 untracked；另有 modified 檔案。
- 工作樹也包含既有非 Dreamspell 的 GA4、SEO、Vedic、VedAstro 等變更，沒有自行回復、納入 commit 或部署。
- **尚無包含完整 Dreamspell 發布內容的正式 Git SHA／可重現發布 artifact。** 不得以 HEAD 冒充此次 Dreamspell release SHA。
- 正式 [CI/CD](../.github/workflows/ci-deploy.yml) 會在 main push 或符合條件的 workflow_dispatch 部署；本次未觸發。其 frontend typecheck／lint 仍為 non-blocking，本次本地另外執行且確認結果，不能只依賴 CI 綠燈。

## B. 目前正式 Worker／Pages 版本

| 資源 | 稽核時有效版本 |
|---|---|
| Worker | `bolt-tarot-api` |
| Worker deployment ID | `173bfc94-152c-4669-aa6e-6a29acae1beb` |
| Worker active version | `df02072a-56a5-4f4f-97f5-b5760517272d`，100% traffic |
| Pages project | `bolt-tarot` |
| Pages latest／canonical deployment | `9ade0032-3248-43e3-b8dc-6565bf6b8142` |
| Pages commit hash | `64d62ee55c8c8b4715c6dcc01410242975455f51` |

**以上是既有正式版本，不是本次新增 deployment。**

## C. 正式 D1 schema、migration 與還原點

| 資料庫 | UUID | metadata |
|---|---|---|
| bolt-tarot-customer | `64583df1-9f69-4164-8a89-c6dec6b4ac61` | 39 tables；14,966,784 bytes |
| bolt-tarot-cards | `7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7` | 4 tables；2,412,544 bytes |

Customer schema 已以明確 config／database 的唯讀 SQL 查核，包含 profiles、token_generation、profile_member_metadata、rate_limit_events、orders 等既有必要 schema。只查看 schema、migration ledger 與 aggregate counts，沒有匯出會員／訂單內容。

稽核前後：

- profiles：25 筆。
- orders：388 筆。
- d1_migrations：24 筆，涵蓋 001–024（ledger 插入順序不是檔名數字順序）。
- `maya_%` tables：0。
- ledger 沒有 025／026。
- Cards 僅 decks、cards、deck_localizations、card_localizations，沒有 Maya content table。

本次正式 025：**NOT RUN**。正式 026：**NOT RUN**。520 seed：**NOT RUN**。

### Migration 審核

[025](../d1/migrations/025_maya_dreamspell.sql) 使用 additive CREATE TABLE／INDEX，依賴既有 profiles 與 orders；本地 migration／外鍵／唯一約束測試 PASS。尚未執行正式 migration 或正式資料完整性驗收。

[026](../d1/migrations/026_maya_sandbox_checkout.sql) 是 `maya_sandbox_orders`，配合 `item_type='maya_sandbox'` 與 stage-only callback。**不是正式付款 metadata／權限流程，不能原樣套用後宣稱正式 Maya 金流完成。** 暫不套用正式庫；正式 payment 設計需另有適用且已驗證的 schema／migration 與回呼授權。

現有 [API](../worker/src/maya.ts) 使用 Customer DB 的 maya_kin_content；前次測試初始化選擇 seed 存 Cards，不代表正式內容位置已決定。正式 seed 必須在實作確定後匯入實際被 API 讀取的位置，避免 seed 存在但未被使用。

### 可用還原 bookmark（唯讀取得）

`wrangler d1 time-travel info` 對兩個正式庫成功回傳：

- Customer：`000013df-00000000-00005100-563541ce5a50f04e691ef9ba175f8c67`。
- Cards：`0000035c-00000000-00005100-5db99d5a023e4552083072d9bcd816f2`。

結果：**PASS：查得 Time Travel bookmark**。未建立 SQL export 備份、未執行還原演練，也未確認此 bookmark 在未來發布時仍於保留期。不能把查得 bookmark 等同已完成可演練還原方案；真正發布前必須重新取得並驗證恢復條件。

## D. 正式網址與現有 HTTP 結果

| URL | 本次唯讀探測 | 判定 |
|---|---|---|
| https://api.crystalfield101.com/api/health | 200 | PASS：既有 API health |
| https://www.crystalfield101.com/maya-calendar | 404 | FAIL：Dreamspell 尚未上線 |
| https://www.crystalfield101.com/en/maya-calendar | 404 | FAIL：Dreamspell 尚未上線 |

不是部署後 Smoke Test；本次沒有新部署。其他系統完整正式端到端 Smoke Test **NOT RUN**。

## E. Google OAuth 與 session

正式 Worker bindings metadata 顯示 `GOOGLE_CLIENT_ID`、`JWT_SECRET` 已存在；只讀 binding 名稱／型態，不輸出 Secret。

使用 allowed Origin `https://www.crystalfield101.com` 唯讀 GET `/api/auth/google/config`：

- HTTP 200。
- `client_id`、`csrf_token` 存在；未輸出內容，也未保留 cookie。

不帶 Origin 的第一次探測為 403；補入符合既有安全規則的 Origin 後為 200。此 403 不是登入失敗證據，不為測試關閉 Origin 防護。

結果：

- **PASS：GIS config 可由正式 allowed Origin 取得**。
- Google Cloud Authorized Origins／實際 Console 設定：**NOT RUN**。
- 真實中文／英文登入、原頁導回、KIN 儲存、登出及兩會員隔離：**BLOCKED／NOT RUN**。
- 本地簽署 session／Mock 登入與資料隔離測試 PASS，但不是 Google 真實登入驗收。

本次未要求 Google 密碼／Token，未修改正式 OAuth Client。

## F. ECPay 正式付款

正式 Worker bindings 存在 ECPAY_MERCHANT_ID／HASH_KEY／HASH_IV；只核對存在，不讀取／輸出明文，也未發送正式付款。

既有 [ecpay.ts](../worker/src/ecpay.ts) 的 endpoint 選擇：

- `ECPAY_ENV='stage'` 使用 stage。
- 其他值（含未設定）使用 production endpoint。
- 此次正式 metadata 沒有 ECPAY_ENV binding，因此依目前本地 helper 規則會選 `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`。
- 這是設定／程式路徑稽核，不是有效商店金鑰、正式簽章或正式付款實测。

关键阻塞：

1. [Maya checkout](../worker/src/mayaSandbox.ts) 只有 stage 專用實作，明確拒絕正式 origins，不使用正式金鑰。
2. Maya 三商品尚未整合正式 checkout/catalog／正式 callback grant。
3. migration 026 與 `maya_sandbox` orders 不能視為正式商品／訂單。
4. 官方 ECPay Sandbox 真實付款尚未驗收；隔離測試 Worker 尚未部署，Customer D1 只有兩張空白基礎表，Cards D1 仍空白。
5. 正式 Maya 退款／撤銷／異常訂單的完整權限一致性尚未實作驗收。
6. `MAYA_PAYMENT_ENABLED` 尚未出現在實作／正式 bindings；不能聲稱已設 false 且由正式程式有效執行。

**正式 Maya payment：BLOCKED，未啟用。** 合成簽章、離線 callback、D1 冪等性測試 PASS 不代替真實 Sandbox 通過。

## G. AI 深度報告与成本

正式 OPENAI_API_KEY binding 存在，不代表 Dreamspell 已接通。

现有 Maya reports POST 僅在 `ENV='dev' && MAYA_AI_MODE='mock'` 時生成 Mock；其他情況回傳 503 `MOCK_ONLY`。其他命理系統的 OpenAI helper 不能直接當作 Maya 正式 AI 實作。

尚缺：

- Maya 正式模型 adapter／分語言 prompt／schema 驗證與分段生成。
- 正式付費 entitlement gate。
- 以訂單為單位的實際 AI 成本／重試／token budget／timeout 與重複呼叫限制。
- 受控帳號的真實品質、權限、語言與成本驗收。
- `MAYA_AI_ENABLED` 明確 false gate；目前未實作、未設定於正式 bindings。

**真實 AI：BLOCKED／NOT RUN**。單次實際成本：**N/A（沒有呼叫）**。本地 Mock 的零成本不是實際 AI 單次成本。

## H. 本次測試與四大命理狀態

| 測試 | 狀態 | 限制 |
|---|---|---|
| Frontend TypeScript | PASS | 本地 |
| Frontend ESLint | PASS | 0 errors、5 既有 warnings |
| Worker TypeScript／ESLint | PASS | 本地 |
| Frontend build／prerender SEO | PASS | 45 routes；既有 >500KB bundle warning；未上傳 artifact |
| Dreamspell engine + references | PASS | 10 tests；含 260 KIN、296 ordinary references／5 leap-day known differences |
| 中英文 Maya route／noindex／sitemap | PASS | 本地 rendering checks |
| Maya Worker/D1/auth | PASS | 12 tests，隔離本地 D1 |
| Maya Sandbox/callback | PASS | 8 tests，合成簽章／Mock，不是真實付款 |
| 塔羅 quota | PASS | 19 offline checks |
| 塔羅深度推薦／7 decks／16 spreads | PASS | 既有本地 script |
| 人類圖報告語言／權限／错误 | PASS | OpenAI fetch 被測試攔截，不付費 |
| 人類圖／印度占星未登入拒絕 | PASS | 不接正式 D1 |
| 印度占星時區／contracts／付款 guard／privacy | PASS | 測試 fetch stub |
| 印度占星中英文頁面 | PASS | 本地，未呼叫占星 provider |
| 四系統登入／redirect 與付款返回 | PASS | 既有 app auth／checkout-return checks |
| 生命靈數完整計算專屬測試 | NOT RUN | 不以登入／redirect checks 代替 |
| 四大命理完整真實端到端回歸 | NOT RUN | 上述是選定離線回歸，不是全量正式外部流程 |
| 真實 Google 登入 | BLOCKED／NOT RUN | 尚未人工驗收 |
| 真實 ECPay Sandbox 三商品雙語付款 | BLOCKED／NOT RUN | 測試環境未完成 |
| 正式 Maya payment 全面安全驗收 | BLOCKED | 正式實作尚缺 |
| 真實 Maya AI／成本 | BLOCKED／NOT RUN | 正式實作尚缺 |
| 中文／英文完整外部 E2E | BLOCKED／NOT RUN | 不使用 Mock 冒充 |
| 手機／Chrome Maya UI | NOT RUN（本次） | Phase 2.6 歷史 Mock 48 checks 不算本次正式驗收 |
| 正式 migration／seed | NOT RUN | 發布 gate 不通過 |
| 正式部署後 Smoke Test | NOT RUN | 沒有新部署 |

本次沒有修改四大命理核心。未提交的既有其他系統改動不因此自動取得可部署驗收。

## I. 功能開關實際狀態

| 開關 | 正式 bindings | 本地實作與有效狀態 |
|---|---|---|
| MAYA_PAYMENT_ENABLED | 不存在 | 未實作，不能假稱 false；正式 Maya 支付路徑尚未建立 |
| MAYA_AI_ENABLED | 不存在 | 未實作，不能假稱 false；Maya 只有 Mock-only reports |
| Maya 全體會員功能 gate | 未查得 | 現有本地 `/api/maya/*` dispatcher 無總 gate；不能部署後保證新功能全關 |
| MAYA_SANDBOX_ENABLED | 不存在 | 本地需精確 true 且符合獨立環境才啟用，正式 gate 不成立 |
| MAYA_AI_MODE／ENV | 未查得 | 本地 Mock 條件在正式 bindings 不成立 |

**實際本次開放的新 Dreamspell 功能：無。** 正式 URL 仍 404，Maya schema 未安裝，沒有因授權而自動切換金流或 AI。

## J. 回滾與解除阻塞

### 本次回滾

沒有正式寫入／部署，因此不需也未執行回滾。只有本地新增本報告及 build artifact（沒有發布）。

### 未來正式發布必備方案

1. 固定一份審核過的可重現 release snapshot／SHA，排除或單獨驗收其他 dirty changes。
2. 實作並測試總 gate、MAYA_PAYMENT_ENABLED、MAYA_AI_ENABLED，預設關閉、正式 metadata 明確可查。
3. 修復並接續隔離測試 D1 的部分初始化；不可把既有兩張表刪除或套完整 DROP schema。
4. 在隔離環境完成真實 OAuth／官方 Sandbox 雙語付款，再審核 production-specific payment／退款／grant 路徑。只有通過後才考慮啟用 payment。
5. 實作正式 AI adapter 與成本控管，用受控帳號實測，通過後才啟用 AI。
6. 發布前重新取得 Customer／Cards Time Travel bookmarks，確認保留期限與恢復操作／權限；若要 export，只輸出到受控安全位置，禁止提交或公開。
7. 保留上述已知正式 Worker version 與 Pages deployment；回滾到經確認可運行的既有版本，避免用 dirty 工作樹重新 build 舊版。
8. Additive schema 的程式回滾優先保留新表，不用 DROP 作快速回退。
9. Time Travel 恢復會影響整個資料庫，可能丟失 bookmark 之後的新會員／新付款；必須先關閉受影響写入、評估並對帳，另確認恢復決策，不自動還原。
10. 對完整四大命理與新版 Maya 重跑正式外部驗收；任何失敗依停止條件阻止受影響階段。

**此次結論：Phase 3 尚不具備完整發布條件，已停止上線。**
