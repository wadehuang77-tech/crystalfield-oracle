# 管理者免費 Mock 驗收

## 最新更新：管理者單次免費解鎖（2026-10-10）

指定帳號的 NT$199／499／Pro699／雙人899，現在使用「管理者免費解鎖」直接生成，不需再按第二個生成按鈕。先確認本人生日，雙人另需另一人資料、關係類型及同意；同樣受後端雙重身分確認、所有權、成本／並發限制。普通會員改按「付費解鎖」，付款返回後自動生成，未授權不生成。未知錯誤／中斷可用既有權限繼續，不重新付款。

已部署 Worker version `b5ff91aa-b922-47b0-9720-f5bc525468b1`、Pages `5fd76a70-b6cb-4179-be4f-c44f4d26c410`；本地四方案雙語三尺寸免費／付款流程與正式 synthetic 管理者 UI PASS，真人管理者正式 AI 生成仍 NOT RUN，本輪真實 AI／付款 0。沒有 migration／Secrets／OAuth 變更或 commit／push。詳見 [最新四方案解鎖流程](dreamspell-production-ecpay-installation.md)；下方操作是歷史紀錄。

## 最新狀態：指定管理者正式 Pro／雙人免商品費（2026-10-10）

本節取代下方歷史功能狀態；原 Mock 預覽與舊版管理者 Live 流程保留。

- `wadehuang77@gmail.com` 原有 Dreamspell NT$199／499 免費能力不變；新增獨立 `MAYA_SOUL_MISSION_PRO_699` 與 `MAYA_RELATIONSHIP_899` 免費生成及閱讀。
- 後端驗證有效 Session、指定 email、D1 本人 email 及既有管理者／Live 開關；前端只接受後端 `admin_complimentary` 權限，不以 email 或 CSS 解鎖。每次讀取／繼續均重驗，撤銷身分或能力後拒絕。
- 中文／英文商品頁顯示「管理者免費使用 / Complimentary admin access」，購買按鈕停用；完成本人生日、雙人資料及同意後，使用既有報告生成管理介面，不呼叫綠界 checkout。
- GET 權限不建立訂單；明確 POST 建立報告且輸入驗證通過後，建立本人、商品獨立、金額 0、status `complimentary`、item_type `maya_admin` 的訂單。不是付款交易，不寫綠界付款紀錄，不改普通會員已購權益。
- AI 仍有實際供應商成本，沿用每章預留 NT$0.11、每報告 NT$2、同訂單雙語 NT$4 上限、並發與重試防護；成功報告存 D1，重新閱讀不生成。
- 本地兩商品完整 15＋12 篇 Mock 生成、快取、冒用 email／跨會員／身分撤銷／成本與零付款：PASS；既有付費雙人及 provider-error／並發兩組回歸 PASS。36 個雙語三尺寸未購買／已購買／管理者 UI 與 4 個商品目錄案例 PASS；TypeScript／相關 ESLint／production build／45-route SEO PASS。
- 正式指定帳號唯讀查詢匹配 1 筆；正式公開設定與 24 個 synthetic 會員雙語三尺寸 UI、匿名 GET／POST 401 隔離 PASS。**真人管理者正式登入及完整 Live AI 生成 NOT RUN**，不能將攔截會員 UI 當成正式身分驗收。本輪實際 AI／checkout 呼叫均 0。
- Worker deployment `bc3de41c-5560-46b6-983e-deaf60a58c03`，version `9ff45559-8d8b-411f-bfab-21a762fc076c`；Pages `3536adb0-046f-4b27-9523-3ef6d814868d`。376 source／63 dist 雜湊核對，前後 D1 schema／ledger／counts／content、bindings／功能開關完全相同；沒有 migration、Secrets、OAuth 或其他命理系統變更。
- 發布使用前次隔離正式目錄加未提交 Dreamspell overlay；repository HEAD `e05ce107de9fb095e93aa63f3cefec19d55f6ffc`，不是全部已部署程式的 commit SHA。本輪未 commit／push。私有發布 manifest 保存來源與部署識別。

管理者可使用現有會員系統登入，前往 `/maya-calendar/member` 或 `/en/maya-calendar/member`。這是免費功能驗收，不是正式付款或 Live AI 開放。

## 2026-10-10 正式部署

- Worker deployment：`1fc4d5e9-7f14-4456-b957-7f14d4f0a91c`；version `c64bd695-cc55-47c4-ab75-f926a9e13626`。
- Pages deployment：`fb64d053-88cf-4699-b021-79e568ccf6c8`。
- Public／admin preview true；general member／payment／AI／Sandbox false。
- 使用既有隔離正式發布目錄增量建置，排除無關 dirty 工作樹。基底 HEAD `305119fa6c94b2a50ac1e58551b0ca2c8c578fe5` 加未提交 admin overlay；未新增 commit／push。
- 沒有 migration、seed、Secrets 或付款變更，沒有 agent 代替管理者儲存真實生日。
- 真實匿名 API 拒絕 profile／admin-preview（401）；checkout 503，公開 config 不提供 admin 資格。剛部署時一次 profile 503，後續實際重驗 401，屬初次檢查未通過後已重驗，不省略結果。
- 真實 HTTPS 首頁入口 zh/en × 390/1440 PASS；38 項 Worker、本地 mocked 三方案雙語 UI、typecheck／相關 lint／45 routes build PASS。
- 真人管理者 Google＋生日＋三報告操作 NOT RUN，待管理者依下方步驟親自操作。未以 Mock UI 當成真實登入成功。
- 回滾可關閉 admin preview flag，或回滾至前次 Worker version `c5ae20e6-b1f7-451d-aeaa-8358e284cf73`／Pages `2aa2e347-8434-47f0-85c6-c64dae4180bd`；未執行。

## 授權与限制

- `MAYA_ADMIN_PREVIEW_ENABLED` 預設未設定／false；只有明確 true 才開啟。
- 身分由 `readSession(..., true)` 與既有 `requireAdmin` 後端確認；不接受前端宣稱 admin 或 user_id。
- 設定 API 使用 private/no-store，僅已驗證管理者收到 `admin_preview=true`。
- 一般會員開關可維持 false；付款、AI、Sandbox 開關仍 false。
- 管理者可儲存自己個人／關係生日、計算 KIN、查看每日免費能量；資料寫入既有 Maya profiles／daily／rate_limits，沒有新增 schema。
- `POST /api/maya/admin-preview` 只使用本人已儲存 profile，產生三商品 zh-TW／en 的 deterministic Mock 文字。
- 預覽不儲存，不產生 orders、付款、entitlements、maya_reports、AI budgets 或 provider calls，刷新後消失。
- 三商品價格與原本青藍色主要按鈕保留。管理者免費測試改為獨立的次要文字按鈕「管理者免費測試（Mock，非付款）」；報告標示 Mock，不取代付款／權限按鈕。
- 未儲存個人生日時按鈕停用；關係報告還需先儲存經同意的另一人資料。
- 管理者撤銷、session 失效、壞來源、其他會員 profile 或輸入自帶 KIN，皆不能存取預覽。
- 報告歷史不包含此暫存 Mock 預覽；不是已付費報告。
- 2 月 29 日生日仍 422；未確認神諭與其他限制保留。

## 測試

- `npm run test:maya-admin-preview`（worker）：本地 Miniflare 授權、雙管理者隔離、三商品雙語、0 訂單／報告／預算、撤銷與 Session 驗證。
- `npm run test:maya-admin-preview-ui`（app）：390px 雙語三按鈕，明確 Mock 網路；不能視為真實 Google 登入驗收。
- 完整 Worker Maya 回歸本次 38 tests PASS；App／Worker typecheck、相關 lint PASS。

## 人工正式試用

1. 用現有管理者 Google 帳號登入，不提供密碼或 Token。
2. 打開 Dreamspell 首頁，點「會員與免費計算」。
3. 儲存生日，確認 KIN 與每日免費能量。
4. 按三方案的「管理者免費測試（Mock，非付款）」；關係方案先保存另一人生日。
5. 下方閱讀標示 Mock 的報告；不扣款、不呼叫 AI、不寫付款訂單。
6. 登出後會員／預覽權限應撤銷。

若非管理者，按鈕不會因前端操作而解鎖。未執行的真人流程不能標示 PASS。

## 2026-10-10 恢復主要按鈕與官方 Sandbox 前置檢查

使用者選擇「先完成官方 Sandbox 三商品付款與報告流程驗收，再開正式付款」。

- 已部署恢復原本主要按鈕的 Pages：部署網址 https://d470f47f.bolt-tarot-5ek.pages.dev 。
- 四個首頁入口保留原青藍色 class／文字；管理者 Mock 為次要文字按鈕，不冒充正式付款。
- 真實 HTTPS zh/en × 390/1440 原四個控制樣式 PASS，general member/payment/AI/Sandbox 仍 false。
- typecheck／相關 lint／45 routes build／route tests／Mock UI PASS。
- Mock UI 第一次計數遇到個人化設定重新渲染競態 FAIL；改等待第三個控制可操作後重跑 PASS，沒有以固定 sleep 代替驗證。
- 官方 Sandbox 離線 9 tests PASS。真實 Google／三商品付款／callback 完整外部 E2E NOT RUN。
- Worker、D1、Secrets 未更動；本次沒有扣款、付費 AI、commit 或 push。

### 阻塞：隔離 Worker 缺少測試憑證

唯讀 binding metadata 確認 `crystalfield-maya-sandbox-api` 沒有：

1. `JWT_SECRET`：獨立測試隨機值，不可使用正式 JWT。
2. `GOOGLE_CLIENT_ID`：獨立測試 Web Client；Authorized JavaScript Origin 为 https://crystalfield-maya-sandbox.pages.dev 。現有 GIS credential popup 流程不是 authorization-code redirect，不應猜測 Redirect URI。
3. `MAYA_SANDBOX_HASH_KEY`：官方 Sandbox Key，僅於測試 Worker Secret 安全設定。
4. `MAYA_SANDBOX_HASH_IV`：官方 Sandbox IV，僅於測試 Worker Secret 安全設定。

測試 MerchantID 設定為 `3002607`；沒有檢視 Secret 明文，不能聲稱實際商店憑證已驗證。不得把 Secrets 貼入聊天、程式碼或 commit。

Callback 規劃：

- ReturnURL：https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/callback
- OrderResultURL：https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/result
- ClientBackURL：依訂單語言使用 https://crystalfield-maya-sandbox.pages.dev/maya-calendar/member 或 https://crystalfield-maya-sandbox.pages.dev/en/maya-calendar/member ，並附上後端該訂單識別。

憑證完成後，仍須核對測試 bindings、CORS／Cookie、官方 stage endpoint，才在隔離 Worker 啟用 member、Sandbox 與 Mock 報告流程。`MAYA_AI_ENABLED` 於測試站開啟 Mock 時必須搭配 `ENV=dev`、`MAYA_AI_MODE=mock`、不綁 OpenAI Key；不代表允許 Live 呼叫。

Pages／workers.dev 跨站 Cookie 可能遭瀏覽器阻擋，若需要自訂同站網域，必須另行確認 DNS／OAuth 變更，不弱化 Session 保護。

目前沒有修改任何測試雲端 Secret 或 OAuth 設定。等待安全設定後再安排人工官方 Sandbox 支付，禁止合成結果冒充真實付款通過。
# 更新：指定管理者免商品費的 Live AI 報告

2026-10-10 16:13（Asia/Taipei）。使用者明確授權 `wadehuang77@gmail.com` 三種真實 AI 報告免 NT$199／499／699 商品費、必要 API 成本及正式部署。本節為最新狀態；下方原 Mock 預覽紀錄保留為歷史。

- Worker deployment：`e841765e-414a-4e39-8981-81073d0a881f`。
- Worker version：`5e9a89b7-19b5-4d0f-ba7f-4b44d7914317`。
- Pages deployment：`664af20c-df2a-4f6f-bc13-ee16c5ba2342`。
- 正式入口：https://www.crystalfield101.com/maya-calendar/member ，英文 https://www.crystalfield101.com/en/maya-calendar/member 。
- PUBLIC／MEMBER／PAYMENT／AI=true、SANDBOX=false、AI_MODE=live、ADMIN_PREVIEW=true；新增 ADMIN_LIVE=true。

## 免付款規則

既有 Google Session 的簽章、有效期與 token_generation 必須有效；Session email 及該 user_id 在 D1 的 email 都須是指定帳號，並通過既有管理者檢查。其他 admins 或普通會員無此免費能力。前端不以 email 判斷授權，只使用後端私有 `admin_live` config。

三方案在會員頁顯示「管理者免費 AI 報告 · 原價 NT$199／499／699 · 免付款」。先儲存本人出生日期；699 另需經同意的關係資料。按下後使用 `/api/maya/admin-reports`，不呼叫 checkout、不送 ECPay form。原 Mock 預覽仍是獨立次要按鈕。

報告由確定性引擎計算，再呼叫既有 Live Provider。報告存入本人歷史，可由 `/api/maya/reports/:id` 讀取；未登入、其他會員、其他管理者或關閉此能力時拒絕存取。

商品費免費，不代表 OpenAI 免費。沿用每份報告 NT$1 程式預留上限、section token 限制、25 秒 timeout、生成鎖與有限重試。估價使用既有固定模型費率與匯率，不是實際帳單保證；已完成同一輸入／商品／語言會重用報告，刷新或換 idempotency key 不重新扣 API 成本。不同語言／出生資料算不同報告。帳號每日生成請求上限仍為 6。

## 資料與部署

只新增 additive [028_maya_admin_reports.sql](../d1/migrations/028_maya_admin_reports.sql)，先在全新本地 D1 套用兩次、外鍵／授權／生成驗證，再僅套用正式 Customer `64583df1-9f69-4164-8a89-c6dec6b4ac61`；不重跑 025／027、不執行 026、不改 Cards／舊資料。

新增：

- `maya_admin_reports`。
- `maya_admin_ai_sections`。
- 本人 admin report 索引。

AI budgets 重用現有 `maya_ai_budgets`，關聯零元內部 `orders`：item_type=maya_admin、status=complimentary、amount=0、paid_at／ecpay_trade_no=NULL。**不是已付款訂單，不建 `maya_payment_orders`／`maya_entitlements`，不偽造綠界交易。** 既有綠界 webhook 明確拒絕此 order type。

預先確認 Time Travel bookmark：
`000013f8-00000012-00005100-698a8bbe977138700970cde609715da6`。

部署後所有原表 schema、既有 ledger entries、會員 25／orders 388／一般 Maya 訂單 0／entitlements 0／reports 0 與 Cards schema 保持一致；新增管理者表及 complimentary orders 都 0。沒有代登入、建立正式免費報告或呼叫真實付費 OpenAI。首份實際品質及 API 帳單仍需管理者操作，不標示為 PASS。

來源仍為隔離 production-release＋未提交 Dreamspell overlay；HEAD=`305119fa6c94b2a50ac1e58551b0ca2c8c578fe5`，不是完整來源 SHA；本次無 commit／push。來源、build、028 雜湊保存於 `maya-admin-live-release-manifest.json`。

## 驗證

- Worker TypeScript／test types／ESLint：PASS。
- Worker 付款／Live Provider／管理者 Mock 與新增指定管理者免費生成：14 tests PASS。三產品 × zh/en、重複生成不再呼叫 provider、跨會員／其他 admin／不匹配 Session email／關閉能力／撤銷 Session：PASS（全為隔離且攔截外部呼叫）。
- 首輪有一次 INTERNAL_ERROR（500）；未進行遠端變更，單獨重跑及移除暫時診斷後的完整重跑均 PASS，未確認首次本地錯誤的根因，不冒稱已定位。
- 塔羅 recurring／付款權限回歸：PASS。
- Frontend TypeScript／ESLint（既有 5 warnings）／Build／45-route SEO／Maya routes：PASS。
- zh/en UI 三模式（disabled、paid、complimentary）：PASS。免費管理者三按鈕發送 admin report，不發送 checkout；測試 API／AI 全為合成。
- 正式 HTTPS 公開按鈕、390／1440px、雙語 Google 登入導回、匿名 API／免費報告 endpoint 拒絕、無效 callback：PASS。
- 指定帳號真人登入後免費 Live AI 生成及真實品質／成本：NOT RUN，需本人操作。

回滾：關閉 `MAYA_ADMIN_LIVE_ENABLED` 停止新免費生成，或恢復 Worker version `3fbd1c67-ffb7-463f-b0ee-5621ea3c9bed`、Pages `6322b43e-31ba-45fb-9a5d-5c9ba730ef3e`；保留 additive 表與合法報告，勿 DROP／整庫還原。不要關閉一般付款 gate 而忽略在途通知。

---
