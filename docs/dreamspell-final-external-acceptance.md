# Dreamspell 最後外部整合驗收：準備與實際結果

後續 Phase 3.5 已授權並部署獨立測試站、接通 Cards、加入 NT$2 總預算，
見 [測試站部署報告](dreamspell-phase-3-5-sandbox-deployment.md)。
以下保留當時尚未部署的歷史狀態，真實 OAuth/付款/AI 仍未通過。

日期：2026-10-10（Asia/Taipei）。

**測試 D1 已補齊並完成遠端唯讀驗證。Google、ECPay 與 OpenAI 真實驗收尚未執行；
目前不具備完整正式上線條件。**

本次唯一遠端寫入是指定兩個測試 D1 的缺少 schema 與公開雙語 seed。
沒有修改正式 Worker、Pages、D1、金流或 Secrets；沒有公開部署、DNS 設定、
雲端 Secrets 寫入、真實扣款、官方測試付款、付費 AI、commit 或 push。

## A. 測試 D1：PASS

| 資料庫 | UUID | 完成狀態 |
| --- | --- | --- |
| crystalfield-maya-sandbox-customer | `1ad83812-c5ac-425d-b1bd-fbcd539919fa` | 16 張業務表，全部 0 筆 |
| crystalfield-maya-sandbox-cards | `71cd2302-f5a3-483c-a838-187d7b858e4c` | 5 張業務表；公開內容 520 筆，其餘 0 筆 |

Cloudflare account 與 active zone 已唯讀核對，兩個 UUID 均與正式 D1 不同。
Cloudflare D1 metadata 的 `version: production` 是 D1 平台版本標示，
不代表這兩個名稱/UUID 是正式應用資料庫。

### 原始狀態與補齊方式

先唯讀檢查 Customer 原有 `profiles`、`multi_spread_free_unlocks`：
兩表皆空白，既有欄位/索引與基礎 schema 相符；Cards 無業務表。
**沒有重跑遠端 customer-base.sql、沒有清空、覆寫或重建原有兩表。**

擴充 [maya-d1-initialization.ts](../worker/scripts/maya-d1-initialization.ts)：

- `inspect-remote` 只讀 schema、metadata、筆數。
- `resume-remote` 僅接受已核對的 Customer 兩空表 + Cards 空庫狀態。
  未知表、未知結構、非空私人資料、半套 migration 會停止，不盲目覆寫。
- 先於全新本地 D1 完整驗證，再於另一個全新本地 D1 模擬兩表增量補齊；
  local receipt 包含 SQL/config/runner fingerprint，變更後必須重驗。
- 每份 SQL 前重新確認測試 config、account、binding 與目標 detail UUID。
  明確指定 `wrangler.maya-test.json` 與資料庫名稱，不用預設正式 config。
- `verify-remote` 僅執行 SELECT/PRAGMA，檢查 schema、欄位、索引、外鍵與 seed。

### 實際新增 Customer schema

執行缺少的 SQL，依序為：

1. `003-rate-limit-events.sql`
2. `004-orders.sql`
3. `006-token-generation.sql`
4. `018_profile_member_metadata.sql`
5. `025_maya_dreamspell.sql`
6. `026_maya_sandbox_checkout.sql`
7. `027_maya_production_payment_ai.sql`

最終 16 表：

`profiles`、`multi_spread_free_unlocks`、`rate_limit_events`、`orders`、
`profile_member_metadata`、`maya_kin_profiles`、`maya_kin_content`、
`maya_daily_energy`、`maya_entitlements`、`maya_reports`、`maya_rate_limits`、
`maya_sandbox_orders`、`maya_payment_orders`、`maya_payment_adjustments`、
`maya_ai_budgets`、`maya_ai_sections`。

Google token_generation/member metadata、五張主要 Maya 表、
Sandbox checkout 及 migration 027 的正式形狀 metadata/AI usage 表都存在。
027 的表只是隔離測試 schema；沒有正式商店資料或付款訂單。

### 實際新增 Cards schema / seed

執行 `cards-base.sql`、`001_card_localizations.sql`、`cards-maya-content.sql`、
`maya-kin-content-seed.sql`。

最終 `decks`、`cards`、`deck_localizations`、`card_localizations`、
`maya_kin_content` 五表。內容為 zh-TW 260 + en 260 = 520。
逐筆驗證 KIN、seal、tone、summary、`maya-reflection-1` version，
英文內容無 CJK；不存在正式牌庫、會員、訂單、生日、session 或報告資料。

保留此前內容位置決策：520 筆只匯入 Cards，Customer 內容表為空。
目前 Maya `freeContent` 仍讀 Customer 並按需產生免費摘要，
**Cards seed 尚未接線到 API**。資料庫初始化 PASS 不等於此項 API 接線完成；
部署前須另確認要接 Cards 還是維持現有摘要行為，不自行改寫既有決策。

### 執行紀錄與修正

SQL 使用精確 `d1 execute --file`，不是全目錄 `d1 migrations apply`；
**沒有填造 d1_migrations ledger**。執行紀錄保留於 session artifacts。
SQL 沒有 DROP/TRUNCATE/DELETE/REPLACE 或既有資料覆寫；
006 只新增欄位，seed 是 INSERT OR IGNORE。

增量寫入全部成功後，第一輪 schema 比較因 Wrangler 本地移除 SQL inline comments、
遠端保留 comments 而失敗，當下停止所有遠端寫入。
只修正本地驗證器：比較忽略 comments/空白，保留 quoted literal；
欄位、FK、索引與資料仍獨立完整檢查。之後全新本地重驗，
再用 **verify-remote 唯讀** 驗證兩庫，沒有重送 migration 或 seed。
此前本地 resume 比較也排除了不具 schema 意義的 execution-duration metadata。
以上歷史失敗沒有被隱藏，最終 schema/資料唯讀驗證為 PASS。

## B. 測試 Worker / Pages：資源存在，部署 BLOCKED

| 項目 | 實際唯讀結果 |
| --- | --- |
| Worker crystalfield-maya-sandbox-api | 存在，`deployed_on=null` |
| Worker 公開/preview subdomain | 均 false |
| Worker settings / secret-name API | HTTP 404，codes 10222 / 10007；尚無可用 script 設定 |
| Pages crystalfield-maya-sandbox | 存在，0 deployments |
| Pages domain | 只有保留的 `crystalfield-maya-sandbox.pages.dev` |
| Pages preview/production env names | 均空白 |
| maya-test.crystalfield101.com | DNS NXDOMAIN |
| maya-api-test.crystalfield101.com | DNS NXDOMAIN |
| 本地專用憑證來源 | 未發現專用 .dev.vars.maya-test / .env.maya-test 或相關環境變數 |

**目前無法驗證有可用、獨立且已綁定的測試 JWT_SECRET、
Google Client 或 ECPay Sandbox 憑證。**
404 不代表已查到 Secret 值或可斷言所有帳號層 Secret 均不存在；
正確結論是部署用 binding/憑證尚不可確認，因此停止對應真實測試。
沒有借用、讀取或複製正式憑證。

本地 [wrangler.maya-test.json](../worker/wrangler.maya-test.json)：

- 兩個 binding 指向上述測試 UUID，local dev `remote=false`。
- API origin 為 `https://maya-api-test.crystalfield101.com`，
  frontend/allowed-origin 為 `https://maya-test.crystalfield101.com`。
- public/member/payment/AI/sandbox 五個 gates 目前全部 false。
- 無正式網域 routes，workers.dev / preview URLs 關閉。
- test bundle 強制 VITE_API_BASE 指向測試 API；無正式 API fallback、
  正式 analytics bootstrap，並設 CSP/noindex。

### 正式隔離驗證：PASS

測試寫入前後比對：

- 正式 D1 metadata、表數/檔案大小。
- 正式 Worker deployment/versions 與修改時間。
- 正式 Pages latest/canonical deployment IDs。
- Worker domains/routes。
- GitHub Actions 近期 run IDs/status。

均一致。沒有以正式 SQL 寫入或 Secret 值比對來達成驗證。
Git HEAD 維持 `64d62ee55c8c8b4715c6dcc01410242975455f51`，
不提交目前混合 WIP，避免 main push 觸發正式 CI/CD。

## C. 真實 Google OAuth：BLOCKED / NOT RUN

中文、英文、原頁導回、KIN 儲存、兩會員隔離、登出後私人 API 拒絕：
**本次真實帳號驗收全部 NOT RUN**。
本地 auth/session/owner tests PASS 不代替真實 Google 驗收。

需人工完成：

1. 在 Google Cloud 建立/確認專用測試 Web Client，不修改正式 Client。
2. Authorized JavaScript Origins 設 `https://maya-test.crystalfield101.com`；
   只有確實從其他測試 origin 載入 GIS 才新增那個 origin。
3. 現有程式是 GIS popup credential callback，送至
   `https://maya-api-test.crystalfield101.com/api/auth/google`，
   **不是 OAuth authorization-code redirect**；不把 API callback 填成假 Redirect URI。
4. Consent/test-user 設兩個授權測試帳號，確認使用者自行操作登入。
5. 專用 GOOGLE_CLIENT_ID 與新隨機 JWT_SECRET 安全綁定到測試 Worker，
   不在聊天、程式或報告貼出 Secret、密碼、Cookie、Token。
6. 核對 CORS/credentialed Cookie/GIS popup/CSRF 與雙語 return。

驗收時兩帳號分別以 zh/en 建立 KIN；
每位只能读寫自己的資料，直接測試另一帳號 profile/report ID；
登出後再請求私人 API 應為 401。安全記錄結果，不記帳號憑證或生日。

## D. 官方 ECPay Sandbox：BLOCKED / NOT RUN

| 商品 | 價格 | 官方 stage 付款 | 真實 callback/授權/雙語導回 |
| --- | ---: | --- | --- |
| MAYA_BASIC_199 | NT$199 | NOT RUN | NOT RUN |
| MAYA_FULL_499 | NT$499 | NOT RUN | NOT RUN |
| MAYA_RELATIONSHIP_699 | NT$699 | NOT RUN | NOT RUN |

缺少公開 HTTPS callback、可用測試 app 與已核對的 Sandbox Secrets。
沒有將 32 項離線簽章/合成付款測試宣稱為官方 Sandbox 付款成功。
不使用真卡、不發生真實扣款。

需專用 `MAYA_SANDBOX_HASH_KEY`、`MAYA_SANDBOX_HASH_IV`、
`MAYA_SANDBOX_MERCHANT_ID=3002607`；不使用 ECPAY 正式 Secret。

| 設定 | 待核准的完整 HTTPS URL |
| --- | --- |
| Endpoint | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| ReturnURL | `https://maya-api-test.crystalfield101.com/api/maya/sandbox/callback` |
| OrderResultURL | `https://maya-api-test.crystalfield101.com/api/maya/sandbox/result` |
| 中文 ClientBackURL | `https://maya-test.crystalfield101.com/maya-calendar/member?maya_order=<order_id>` |
| 英文 ClientBackURL | `https://maya-test.crystalfield101.com/en/maya-calendar/member?maya_order=<order_id>` |

callback 只由簽章/merchant/訂單/金額/商品/付款狀態後端驗證開通，
browser return 不開通權限。callback URL 若有 Access/WAF，
只能規劃最小化 server-to-server 例外，不能把所有會員 API 公開。
199/499/699 都不得開通每日深度會員。

三商品各跑 zh/en 一次，使用官方測試付款；
關係商品先有同意的 partner profile。之後唯讀核對 orders、sandbox metadata、
唯一 active entitlement、報告權限。未付款、付款失敗、偽造、重複 callback
仍以離線 negative cases 驗證，不為負向測試製造真實扣款。

## E. OpenAI Live：未授權，NOT RUN

本次真實 paid calls **0**，实际 Token **0**，實際 API 費用 **NT$0**。
中文/英文品質、完整性、真實計算資料一致性、權限與帳單成本全為 NOT RUN。
沒有把 Live fetch stub 當成真實 OpenAI 報告。

已唯讀核對 [OpenAI gpt-4o-mini model/pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini)：
input US$0.15 / output US$0.60 每百萬 Tokens，default snapshot `gpt-4o-mini-2024-07-18`。
下表使用現有每段 6,000 input + 1,200 output 的保守 reservation、
35 TWD/USD 估算，不把估值當實際帳單，也不把美元與台幣混用。

| 報告 | 段數 | 單語 input/output 上限 | 單語估計上限 TWD | 雙語合計 TWD |
| --- | ---: | --- | ---: | ---: |
| BASIC 199 | 3 | 18,000 / 3,600 | 0.1701 | 0.3402 |
| FULL 499 | 5 | 30,000 / 6,000 | 0.2835 | 0.5670 |
| RELATIONSHIP 699 | 7 | 42,000 / 8,400 | 0.3969 | 0.7938 |
| 六份首輪合計 | 30 | 180,000 / 36,000 | — | 1.7010 |

### 成本上限與授權 gate

- **本次已授權的付費執行上限：0 calls、NT$0。**
- 既有程式每段預留 NT$0.0567、單張訂單累積最多 NT$1；
  同一訂單不同語言與 retries 共用，未知結果保留預留、不自動重送。
- 待另行明確核准的首輪測試方案：最多六份、30 次分段 calls，
  每份最多 NT$0.40 估價、campaign 總預留最多 NT$2，首輪不自動重試。
- 現有 Worker 只有 per-order durable cap，**尚無跨訂單 campaign hard cap**。
  在核准付費測試後仍須先加入/驗證總預算 reservation guard，
  確認獨立測試 OpenAI Project/Key、定價/匯率與 usage 記錄，再允許第一個真實呼叫。
  不能只以 Provider Dashboard 的警示預算冒充硬上限。
- 價格、匯率或實際 input 比假設高時停止；provider outcome unknown 先對帳，
  不解除 unknown 重試去消耗額外費用。

Live 階段需另確認測試付款授權與 Live Provider 的安全連接：
目前 Sandbox enable 要求 `MAYA_AI_MODE=mock`，不能只改成 live 就宣稱
Sandbox entitlement 可用。需隔離且可追溯的受控 Live acceptance 授權機制，
不得解除 production/Sandbox 防混用 guard，也不得拿正式訂單或前端 grant 替代。

品質檢查包含：三商品 zh/en、段落完整、Traditional Chinese/純英文、
無偽造 KIN/圖騰/音調、無 BLOCKED 神諭/象徵、無科學預測宣稱、
兩會員不能越權、失敗/逾時/成本控制与 cache。
API schema/language guard 不是完整語意品質審查，必須人工看真實報告。

## F. 本次回歸與完整狀態

| 項目 | 結果 | 備註 |
| --- | --- | --- |
| Cloudflare account/zone/目標 UUID | PASS | 唯讀確認 |
| 原有兩 Customer 表、空白 Cards | PASS | 寫入前唯讀 |
| 全新本地 D1 / 两表增量模擬 | PASS | 最終重驗通過 |
| 測試 D1 補齊、025/026/027 | PASS | 精確缺少 SQL，不重跑 base |
| 遠端 schema/columns/index/FK | PASS | 最終 verify-remote 唯讀 |
| Cards 520 雙語逐筆驗證 | PASS | 260 zh-TW + 260 en |
| 私人/訂單/會員資料為空 | PASS | 全部 Customer 表 0 筆 |
| 正式環境隔離 baseline | PASS | D1 metadata/deployments/routes/CI 一致 |
| 測試 Worker / Pages 資源存在 | PASS | 未部署，不等於 app 可用 |
| 公開 HTTPS/DNS/憑證 bindings | BLOCKED | 未授權設定；目前 NXDOMAIN/無 deployed script |
| TypeScript frontend + Worker + Maya scripts | PASS | 本次重跑 |
| ESLint | PASS | 0 errors；app 5 個既有 warnings |
| Frontend Build/SEO | PASS | 45 route SEO verification |
| KIN tests | PASS | 7 tests，含 260 KIN |
| 外部參考 regression | PASS | 3 tests，296 一般日 + 5 閏日差異 |
| Worker/D1/auth/payment/provider offline | PASS | 32 tests |
| 雙語 routes、安全 return/noindex | PASS | 本次重跑 |
| 塔羅 | PASS | deep-analysis/subscription/recurring-payment |
| 人類圖 | PASS | calculation auth/bilingual report |
| 印度占星 | PASS | locale/Worker contracts/payment/privacy |
| 生命靈數 | PASS | 4 組 arithmetic/master/grid regression |
| 四大命理真實完整 E2E | NOT RUN | 選定本地回歸不等同全部實際服務 |
| Google 兩帳號真實驗收 | BLOCKED / NOT RUN | 無可用外部 app/test credentials |
| 官方 ECPay 199/499/699 | BLOCKED / NOT RUN | 未執行付款 |
| OpenAI 實際品質/成本 | BLOCKED / NOT RUN | 付費呼叫尚未授權 |
| Cards seed API 接線 | BLOCKED | 保留原決策，部署前需確認 |
| 正式部署/金流/AI 啟用 | NOT RUN | 未獲此次授權，不具完整條件 |

最終本地/遠端資料庫驗證沒有剩餘 FAIL；中途驗證器差異如 A 節揭露。
没有本次真實 Chrome 外部 E2E PASS；以前 51 項 Mock UI 驗收不列為本次外部通過。
Feb29 birthday 422、神諭、未確認城堡象徵、舊月亮日期與每日付費會員繼續停用。

## G. 等待確認的雲端操作清單（尚未執行）

以下需下一次明確授權，不能把 D1 補齊授權擴張成公開部署：

1. **Cloudflare Worker**：僅部署 `crystalfield-maya-sandbox-api`，
   使用 test config/兩測試 UUID；先全 gates false，驗證無正式服務 binding。
2. **Cloudflare Secrets**：專用新 JWT_SECRET、GOOGLE_CLIENT_ID、
   Sandbox HashKey/HashIV。由安全 Dashboard/CLI 輸入，不交付聊天明文。
   暫不設定/使用付費 OpenAI Key，不借用正式 Secrets。
3. **Cloudflare DNS/HTTPS**：確認 zone/名稱衝突後，
   將 `maya-api-test.crystalfield101.com` 只綁測試 Worker；
   將 `maya-test.crystalfield101.com` 只綁獨立 Pages。
   核對現有正式 routes 不變、TLS、callback 可达、Cookie/CORS/CSP。
4. **Pages direct upload**：明確 `VITE_API_BASE=https://maya-api-test.crystalfield101.com`
   建置隔離 bundle，僅上傳 `dist-maya-test` 至測試 project，noindex/無正式 analytics，
   不串正式 Git CI/CD。
5. **Google Cloud 人工**：C 節專用 client/兩測試 user/Origins，無正式 Client 修改。
6. **測試 gates**：驗證隔離後 public/member/sandbox/AI 開啟，payment=false，
   `ENV=dev`、`MAYA_AI_MODE=mock`；僅官方 stage 付款，不做自動續扣。
7. **人工真實 E2E**：使用 [maya-external-e2e.ts](../app/scripts/maya-external-e2e.ts)，
   先設定授權的測試 HTTPS origins、人工操作授權與產品；
   runner 不 mock Google/付款/API，限制只到 Google/test API/ECPay stage。
   三商品各執行 zh/en，含 owner/logout 檢查；不傳密碼或 Token 到聊天。
8. **Live 另行核准**：核准 E 節少量 paid calls、確定硬總預算與測試授權機制後，
   才設定專用 OpenAI Project/Secret 並執行品質驗收。
9. **關閉入口**：測試結束將五 gates false，撤銷測試 session/停用專用 client/key；
   按授權停用測試 custom routes/DNS 或設 Access，保持無正式影響。
   不自動刪除資料库、schema 或 artifacts。

目前僅完成測試 D1 與本地回歸；停在公開環境/憑證/付費驗收之前。
等待確認，不宣稱 Dreamspell 完整正式上線。

## 本次檔案與證據

- 修改 [maya-d1-initialization.ts](../worker/scripts/maya-d1-initialization.ts)：
  027、唯讀 inspection、受控 incremental resume、模擬與語意 schema comparison。
- 新增本報告；歷史 D1/阻塞報告增加後續結果連結，不改寫當時的 BLOCKED。
- Session artifacts：`maya-final-external-d1/`（初始唯讀）、
  `maya-final-external-d1-v3/`（成功 SQL/第一輪比較差異）、
  `maya-final-external-d1-v4/`（最終本地/唯讀 PASS）、
  `maya-final-cloud-environment.json`、`maya-final-production-isolation.json`。
  artifacts 不含 Secret 值、會員資料或付款憑證，不提交 repository。
