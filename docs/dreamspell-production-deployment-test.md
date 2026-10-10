# Dreamspell production deployment and HTTPS acceptance

日期：2026-10-10，Asia/Taipei。

## 實際結果

**正式 Worker、Pages、Customer D1 additive migrations 與 520 筆公開內容已實際發布。**

目前開放中英文 Dreamspell 介紹頁及公開 KIN 內容 API。會員 KIN 計算、生日儲存、每日免費會員能量、正式付款、Sandbox checkout 與 AI 報告仍關閉。這是已完成正式發布的受控部分成果，**不是完整會員／付款／AI 服務上線**。

沒有以 Mock OAuth、離線付款簽章或 Mock AI 通過，冒充真實外部整合驗收。未使用真實消費者付款，未呼叫付費 OpenAI，未修改正式 Secrets 或 OAuth Client，未 commit、push 或觸發 GitHub Actions。

## A–C. 正式部署與 Git

| 項目 | 實際值 |
|---|---|
| Worker | `bolt-tarot-api` |
| 最終 Worker deployment ID | `b8a2d6c2-74bb-40ed-9e42-d25b17d088e5` |
| 最終 Worker version ID | `c5ae20e6-b1f7-451d-aeaa-8358e284cf73`，100% traffic |
| 第一階段全關閉 Worker deployment | `e308ceb4-8b4f-45fa-832d-8b2d6adcaa6d` |
| 第一階段全關閉 Worker version | `54c64d9f-c4d6-43d5-8a89-cbb6efdd282a` |
| Pages project | `bolt-tarot`，production branch `main` |
| 正式 Pages deployment ID | `284f65fc-33d2-44ce-99fb-7c438c481ccb` |
| 部署專屬網址 | https://284f65fc.bolt-tarot-5ek.pages.dev |
| 基底 Git SHA／未改動 HEAD | `64d62ee55c8c8b4715c6dcc01410242975455f51` |

本次發布來源是上述 HEAD 的 `git archive`，加上明確 allowlist 的 Dreamspell 本地 overlay。**並沒有包含完整 Dreamspell 的新 commit SHA**；Pages 的 commit hash 是基底 SHA，不可視為全部發布內容的已提交版本。

發布目錄：
`C:\Users\wadeh\.copilot\session-state\5285ed68-3410-4296-aa15-8aed4298fdb7\files\production-release`

完整 app dist 與 Worker dry-run bundle 的 SHA256 清單保存於同層 `production-artifact-manifest.json`。正式 bundle 只在公開開關值上由初始全關閉改為公開 true；部署版本 ID 是正式生效程式的識別。

### 工作樹隔離

- 使用獨立 archive 發布目錄，沒有回復、覆寫或提交來源工作樹。
- 納入 Dreamspell route、SEO、隱私追蹤保護、API、模型／權限程式與必要測試。
- 排除 `worker/src/vedicAstrology.ts` 未提交的 VedAstro default provider 變更，以及 services、self-host scripts、無關稽核文件。
- 正式使用 HEAD 既有印度占星程式，而非直接部署整個 dirty 工作樹。
- Wrangler release config 僅設定 Maya vars，使用 `keep_vars` 保留既有 vars；非 Maya bindings 部署前後一致，Secrets 未讀出、複製或修改。
- 既有 D1、rate limiter、Vedic workflow、Custom Domain bindings 保留。
- 最新 CI run 仍為 `37910055137`；此次手動發布未觸發 CI。
- 來源正式 `worker/wrangler.toml` 未修改。本次 release config 保存在發布目錄，未提交；未来發布前需明確同步這些設定，不能假設舊 CI config 已包含公開開關。

## D. 正式 D1 migration 與完整性

### 資料庫

- Customer：`bolt-tarot-customer`，`64583df1-9f69-4164-8a89-c6dec6b4ac61`。
- Cards：`bolt-tarot-cards`，`7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7`。
- 兩個測試 UUID 沒有出現在正式 release config；正式 API 沒有連到測試 D1。
- 本次 Maya 公開內容存在正式 Customer；`MAYA_CONTENT_SOURCE=customer`。正式 Cards schema／metadata 未變，七套牌庫不受 seed 影響。

### 部署前即時 Time Travel bookmark

- Customer：`000013ea-00000000-00005100-745b718e3db8cb18129dde8d66d890cf`。
- Cards：`00000366-00000000-00005100-a4dc439a7fabcc9cb17ade637bad6563`。

`wrangler d1 time-travel info` 即時查得：PASS。此次未演練 restore，也沒有執行 export。bookmark 有服務保留期限，未來還原前必須再次確認有效性。

### 審核與執行

1. 以正式 profiles／orders 的實際 schema，在全新 Miniflare D1 重建 dependency tables。
2. 插入本地合成會員與訂單，套用 025、027、520 seed，確認原資料完整、外鍵正常。
3. 部署所有開關關閉的相容 Worker，檢查正式健康、既有 Google config 與 data fingerprints。
4. 專用 migrations directory 只有 025、027；remote pending list 也只有兩個檔案。
5. 明確 config／正式 Customer 名稱／UUID，執行 remote migrations apply。
6. 比對原會員／訂單全部 row 的記憶體 SHA256，不輸出個資或匯出原資料。
7. 匯入只有公開反思文字的 `INSERT OR IGNORE` seed，沒有覆寫資料。
8. 遠端 SELECT／PRAGMA 驗證語言、KIN 範圍、外鍵、schema 與原資料。

| 項目 | 結果 |
|---|---|
| [025](../d1/migrations/025_maya_dreamspell.sql) | PASS：正式套用 |
| [027](../d1/migrations/027_maya_production_payment_ai.sql) | PASS：正式套用；依賴 025、profiles、orders |
| [026](../d1/migrations/026_maya_sandbox_checkout.sql) | NOT RUN：Sandbox 專用，未套用正式庫 |
| migration ledger | PASS：24 → 26，新增 025、027 |
| 公開內容 | PASS：520 筆；zh-TW 260、en 260；KIN 1–260 |
| 外鍵 | PASS：`PRAGMA foreign_key_check` 空結果 |
| 原會員 | PASS：25 → 25；完整 row fingerprints 一致 |
| 原訂單 | PASS：388 → 388；完整 row fingerprints 一致 |
| 正式 Cards | PASS：schema／metadata 一致；未 migration／seed |
| Maya 私人測試資料 | PASS：profiles、reports、entitlements、payment_orders、ai_sections 全部 0 筆 |

新增 10 張 Maya 表：maya_kin_profiles、maya_kin_content、maya_daily_energy、maya_entitlements、maya_reports、maya_rate_limits、maya_payment_orders、maya_payment_adjustments、maya_ai_budgets、maya_ai_sections。必要索引同 migration 建立。

SQL 只有 additive CREATE 與公開 INSERT OR IGNORE，没有 DROP、TRUNCATE、DELETE statement、REPLACE 或既有會員／訂單 UPDATE。FK 的 `ON DELETE CASCADE` 是 schema 定義，不代表此次刪除資料。

## E. 正式網址與 HTTPS

- 中文：https://www.crystalfield101.com/maya-calendar/
- 英文：https://www.crystalfield101.com/en/maya-calendar/
- API：https://api.crystalfield101.com/api/maya/config
- 範例公開內容：https://api.crystalfield101.com/api/maya/content/34?locale=en

真實 HTTPS Chrome／fetch 驗證：

- 520 API 回應逐筆比對 deterministic signature 與 free_summary：PASS。
- 中英文各 390／768／1440px：PASS，無水平溢出或 pageerror。
- canonical：PASS；private member path noindex：PASS。
- 每個 Maya 頁面讀取正式 API，無 sandbox／maya-test API origin：PASS。
- Google 計算按鈕 disabled；私人頁顯示尚未開放，無生日輸入：PASS。
- 生日計算 endpoint、daily、profile、report、checkout：實際 HTTP 503，開關封鎖 PASS；**不能視為會員功能驗收 PASS**。

測試無 API route mocking。瀏覽器工具連線被中斷，改用同主機已安裝 Chrome／Playwright 完成真實公開 HTTPS，不是本地 mock 預覽。

## F. Google

- 正式 GIS config（allowed Origin）：實際 HTTP 200，client_id／csrf_token 存在，未輸出值。
- 現有正式 Google／JWT Secret bindings 保留：PASS。
- 雙語安全登入導回程式／離線測試：PASS。
- 真實 Google login、KIN 計算與生日儲存、兩會員隔離、登出後私人資料驗收：**BLOCKED／NOT RUN**。

沒有本次可由 agent 操作的專用測試帳號與人工 OAuth 完成流程。不能以重新簽署 JWT 或建立合成正式會員代替 Google 登入。

此外，現在 `MAYA_MEMBER_ENABLED=false`，依使用者要求「通過才開啟」，不能暫時全站開放來測試。下一步需安排受控測試會員與限定測試存取方式，再人工完成兩個帳號的中文／英文流程；不得要求密碼、Cookie 或 Token 明文。

## G. 綠界

- 正式 Maya checkout／callback／撤銷／冪等程式已發布但 gate 關閉。
- 離線簽章、MerchantID／商品／金額／交易編號、重複 callback、失敗／偽造、退款與 entitlement 檢查：PASS。
- 既有塔羅一次性／週期性 ECPay 離線回歸：PASS。
- 原有正式金流 Secrets、bindings、訂單資料未修改：PASS。
- 官方 Sandbox NT$199／499／699 真實交易：**BLOCKED／NOT RUN**。
- 未將 Sandbox 訂單或 migration 026 放入正式庫；未假造正式已付款訂單。

真實 Sandbox 必須使用已存在的獨立測試 Worker／D1 與專用 Sandbox Secrets、callback 入口、測試帳號。此次沒有借用正式金流 Secrets 或臨時啟用正式 Sandbox 流程。正式 `MAYA_PAYMENT_ENABLED=false`。

## H. AI

- Mock 三商品、雙語、immutable calculations、schema、會員隔離與授權：本地 PASS。
- Live Provider adapter、timeout、token／per-order 預留、冪等、失敗停止：本地 PASS。
- 隔離 dev campaign NT$2 聚合預留／每報告 NT$0.40／全域鎖：本地 PASS。
- 以上總測試預算在獨立 dev 環境生效，不應宣稱正式 production 已有相同 NT$2 campaign 上限。
- 正式 Mock／Live 報告端到端：NOT RUN；沒有正式授權測試訂單，AI gate 關閉。
- 真實 Live 品質／Token／帳單成本：NOT RUN；此次授權付費 calls = 0，实际 calls = 0。
- `MAYA_AI_MODE=mock` 只是配置；production provider 不會因此提供 dev Mock bypass，且 `MAYA_AI_ENABLED=false`。

未向任何一般會員開放 Live AI。任何真實付費呼叫需另行授權。

## I. 完整測試狀態

| 項目 | 結果／範圍 |
|---|---|
| Worker TypeScript／ESLint | PASS |
| App TypeScript／ESLint | PASS；0 errors、5 個既有 warnings |
| Frontend Build／SEO | PASS；45 routes、sitemap、hreflang、JSON-LD、noindex |
| KIN／外部參考 | PASS；10 tests；296 ordinary dates 與 5 leap-day 差異案例 |
| Worker Maya／D1／payment／budget | PASS；36 tests |
| 正式相依 schema 的全新本地 D1 | PASS；025＋027＋520 seed；無 026 |
| Auth／checkout return／双語 routes | PASS：本地 |
| Numerology | PASS：四組固定本地 regression；正式頁面健康 |
| Tarot | PASS：subscription／recurring 回歸、正式 decks API 200、正式頁面 |
| Human Design | PASS：授權／locale 回歸；正式 chart 無登入 401、頁面正常 |
| Vedic | PASS：HEAD 原程式 regression／locale；正式 chart 無登入 401、雙語頁面正常 |
| 正式四大系統完整付費 E2E | NOT RUN；此次仅基本健康與本地 regression |
| 正式 520 public API responses | PASS：真實 HTTPS、無 mocks |
| 正式 zh/en × 3 widths | PASS：真實 Chrome |
| 真實 Google＋會員 KIN/daily | BLOCKED／NOT RUN |
| 三個官方 Sandbox 交易 | BLOCKED／NOT RUN |
| 正式 Mock report E2E | NOT RUN；未建立合成正式訂單 |
| 付費 Live AI | NOT RUN：未授權 |

### 過程中錯誤與處理

- 全新 archive 先跑 route test 缺 `dist/sitemap.xml`：第一次 FAIL。先建立 artifact 後重跑 PASS，並非跳過驗收。
- 本地 SQL guard 原先只允許 INSERT INTO，seed 是 INSERT OR IGNORE：guard 調整至精確允許 seed 格式，重跑完整本地 D1 PASS，未放寬破壞性 SQL。
- 正式 Numerology empty access 原被測試錯誤預期 401，實際現有契約是 200＋空權限；讀取既有 handler，核對空 groups／capabilities 後 PASS，沒有改變正式行為。
- 最後 Wrangler 唯讀 D1 查詢曾回 Authentication error 10000：未重跑寫入。改用新讀取 OAuth Token 的 direct API 唯讀核對，所有原資料 fingerprint、部署 ID、外鍵與 0 private Maya rows PASS。原因未確認，不聲稱已修復 Wrangler 認證。

## J. 實際開關與停止點

| 開關 | 實際值 |
|---|---|
| MAYA_PUBLIC_ENABLED | true |
| MAYA_MEMBER_ENABLED | false |
| MAYA_PAYMENT_ENABLED | false |
| MAYA_AI_ENABLED | false |
| MAYA_SANDBOX_ENABLED | false |

已開放：中英文介紹、圖騰／音調介紹、商品展示、520 筆公開 KIN 內容 API。

尚未開放：會員生日計算／儲存、每日會員能量、會員歷史報告、付款、AI。2 月 29 日生日、五大神諭、未確認城堡象徵、舊月亮日期與每日付費會員限制保留。

部署完成後停止，不自行開啟會員、付款或 AI。完整正式上線條件尚未全部通過。

## 回滾

回滾方式已確認，沒有實際執行：

1. 最低風險先關閉 `MAYA_PUBLIC_ENABLED`，保留 member/payment/AI/sandbox false；這會停止新增功能而不刪資料。
2. Worker 可使用發布 config：
   `wrangler rollback df02072a-56a5-4f4f-97f5-b5760517272d --name bolt-tarot-api --config wrangler.production-release.toml --message "Dreamspell release rollback"`
   原版本為部署前 100% traffic 版本。回滾後檢查 bindings／health／Google／既有 API。
3. Pages 透過 Cloudflare Dashboard rollback 至部署前 `9ade0032-3248-43e3-b8dc-6565bf6b8142`，驗證正式 custom domains。
4. DB 優先保留 additive tables／seed，不做 DROP 或為回滾刪原資料。
5. 只有確認資料損毀且獲得還原批准，才針對正確 Customer UUID 用上方 Time Travel bookmark 還原。整库 restore 會回退 bookmark 後其他正式交易，必須先停止寫入、確認保留期與後續資料影響，不能自動執行。

## 驗證 artifacts

同一 session files 目錄包含：

- `production-preflight-before.json`：原 schema、部署、count 與 private row SHA256，沒有原 row 內容。
- `production-after-closed-worker.json`、`production-after-migrations.json`、`production-after-seed.json`。
- `production-closeout-audit.json`：最終實際部署、bindings、外鍵、0 private Maya rows。
- `production-local-d1-result.json`、`production-artifact-manifest.json`。
- `production-browser/production-https-result.json` 與六張真實 HTTPS screenshots。
- 發布目錄 `app/scripts/maya-production-https-check.ts`：可重跑、沒有 OAuth/payment mocks、沒有付費呼叫。

文件與 session artifacts 是本次新增本地成果；没有擅自提交來源工作樹。
