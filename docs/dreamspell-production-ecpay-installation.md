# Dreamspell 正式綠界安裝與部署（不付款驗收）

日期：2026-10-10，Asia/Taipei。

## 最新更新：四方案「付費解鎖」後自動生成（2026-10-10）

本節為最新狀態；下方付款開通與人工生成操作是歷史紀錄。

| 商品 | 價格 | 正式入口 |
|---|---|---|
| `MAYA_BASIC_199` | NT$199 | `/maya-calendar/member` |
| `MAYA_FULL_499` | NT$499 | `/maya-calendar/member` |
| `MAYA_SOUL_MISSION_PRO_699` | NT$699 | `/maya-calendar/pro` |
| `MAYA_RELATIONSHIP_899` | NT$899 | `/maya-calendar/relationship` |

英文入口沿用 `/en` 前綴。四個公開 CTA 同步改成「付費解鎖 / Pay to unlock」，不改商品 ID、價格或歷史 `MAYA_RELATIONSHIP_699` 權益。

### 操作與防護

1. 先登入、儲存並確認出生資料；Pro／雙人頁也能在付款前輸入。雙人需另一人資料、關係類型與同意。
2. 按一次「付費解鎖」，確認真實金額後前往既有綠界。已購買者按「解鎖／查看報告」，指定管理者按「管理者免費解鎖」直接使用既有授權生成，皆不重新付款。
3. 付款返回同一瀏覽器分頁後，自動查詢本人後端訂單，再取得 **同一 order_id 與商品** 的有效 entitlement。只接受 `paid` 與同語言；pending 最多查詢 30 次、間隔 2 秒，仍待確認時提示稍後重新整理，不重複付款。
4. 只有付款前明確儲存的解鎖請求能自動生成。sessionStorage 按 user／locale／order 分隔，保存選定 profile ID、生日快照、雙人類型／同意及冪等鍵；不保存完整報告。比較付款前後生日，資料變更時阻止自動生成，請本人確認，不猜測替代資料。
5. 自動流程使用原本生成 API／逐章 advance，不需第二個「生成報告」按鈕。`waiting→started→completed` 與同步 in-flight guard 防止 Strict Mode／雙擊／重整重複發送；成功 Pro／雙人 report ID 留在請求中，重整只 GET 既有報告。
6. 後端仍逐次驗證 Session、商品、本人 profile／order／entitlement、管理者資格、成本／並發／重試限制；新增 entitlement DTO 的 order_id 只用來比對訂單，不作為授權憑證。
7. **生成需保持返回頁面開啟，不是付款 callback 的伺服器背景工作。** 關閉／中斷、缺少分頁請求、換瀏覽器、清除 storage 或未知錯誤不會偷偷重試 AI；可用本人既有權限確認資料後繼續，不必再次付款。單純開頁、讀取歷史、failed／foreign／wrong-locale／wrong-product／wrong-grant 返回都不自動生成。

### 修改與驗證

- 前端：[MayaCalendarPage](../app/src/pages/MayaCalendarPage.tsx)、[MayaProPage](../app/src/pages/MayaProPage.tsx)、[MayaRelationshipPage](../app/src/pages/MayaRelationshipPage.tsx)、[MayaPremiumReportManager](../app/src/components/maya/MayaPremiumReportManager.tsx)、[mayaUnlock](../app/src/lib/mayaUnlock.ts)、[useMayaPaymentReturn](../app/src/hooks/useMayaPaymentReturn.ts)、[api](../app/src/lib/api.ts)。
- 後端僅補授權列表 order_id：[maya](../worker/src/maya.ts)、[mayaPro](../worker/src/mayaPro.ts)、[mayaRelationship](../worker/src/mayaRelationship.ts)。不改綠界 checkout／callback／金額、OAuth、KIN 公式或其他命理系統。
- 新增 [四商品單次解鎖 browser check](../app/scripts/maya-unlock-browser-check.ts) 與 `test:maya-unlock-browser` script；更新既有 payment-buttons／premium-live browser checks 及 [production payment checks](../worker/scripts/maya-production-check.ts) 的訂單映射斷言。
- **PASS**：76 新流程案例（四商品、雙語、390／768／1440px、普通付款／管理者、pending→paid／grant 延遲、重新整理零追加生成、失敗／跨訂單／語言／商品／缺請求／生日變更隔離）。
- **PASS**：48 既有 premium 讀取／生成 UI、36 paid／unpaid／admin 按鈕、4 catalogue、8 基礎／完整商品 AI gate；Worker 16 payment 回歸，以及新增 order_id 斷言後的兩組精確回歸。
- **PASS**：App／Worker types、Worker test types、相關 ESLint、隔離 production build／45 routes SEO、編輯器 diagnostics。既有大型 bundle／LINE public asset warnings 未改。
- 最初新 browser checks 因隱藏 SVG title 與被拒絕訂單不應掛載 manager 的等待條件失敗；改為等待實際可見報告／拒絕狀態後重跑完整案例 PASS，不將初次失敗省略或視為正式交易驗收。
- **實際 AI／正式付款呼叫 0**；24 次 checkout 與 48 次 create 全為本地 Playwright 攔截，不能當作官方綠界或真實 OpenAI 端到端驗收。

### 正式發布證據

- Worker deployment `f15039ab-f757-42e7-896f-bc18c3b43b91`，version `b5ff91aa-b922-47b0-9720-f5bc525468b1`，100%。
- Pages `5fd76a70-b6cb-4179-be4f-c44f4d26c410`，正式中英文頁已更新。
- 正式 6 個公開四按鈕頁面與 36 個 synthetic paid／unpaid／admin UI（共 42）PASS；實際公開設定、匿名 reports／entitlements GET 及生成 POST 401 PASS。**真人登入、實際付款返回與正式 AI 完整生成 NOT RUN**。
- 378 source／63 dist 雜湊核對；前後兩庫 schema、ledger、資料計數／內容、foreign keys、bindings／Secrets metadata 與開關完全不變，無 D1 migration。
- 以先前隔離正式目錄增量 overlay 發布，排除無關 GA4／Vedic dirty changes；repository HEAD `e05ce107de9fb095e93aa63f3cefec19d55f6ffc` 不是全部已部署程式 SHA，本輪未 commit／push。私有 release manifest 保存來源、前後部署與驗證結果。

## 後續授權更新：正式會員、付款與 Live AI 已啟用

2026-10-10 15:45（Asia/Taipei）更新。下方原安裝報告是 15:34 的歷史關閉狀態，本節為最新狀態。

使用者後續明確選擇「向所有登入會員開放正式付款」，再確認「對所有登入會員啟用正式付款與 Live AI，沿用每訂單 AI NT$1 上限；付款由會員本人完成」。因此本次後續發布：

| 項目 | 最新值 |
|---|---|
| Worker deployment | `f00efb18-38ba-4e74-9b19-d000aeeb8676` |
| Worker version | `3fbd1c67-ffb7-463f-b0ee-5621ea3c9bed` |
| Pages deployment | `6322b43e-31ba-45fb-9a5d-5c9ba730ef3e` |
| Pages URL | https://6322b43e.bolt-tarot-5ek.pages.dev |
| PUBLIC／MEMBER／PAYMENT／AI | true |
| SANDBOX | false |
| MAYA_AI_MODE | live |

Pages full ID 以 `payment-install-activation-after.json` 的 canonical deployment 為準。

正式中英文公開頁面顯示可點擊的「綠界付款 · NT$199／499／699」，未登入先導回現有 Google 登入。會員頁需先儲存個人 KIN，關係商品另需 partner profile；正式 checkout 送出前會確認該金額是真實交易。有效 callback 後可用對應 entitlement 產生 AI 報告，無有效付款不得產生。管理者免費 Mock 保留為獨立次要功能，不會跳過付費權限；已修正 admin_preview 導致 checkout／entitlements 永遠不讀取的 UI 問題。

沿用 [mayaAi.ts](../worker/src/mayaAi.ts) 的 `gpt-4o-mini`、每 section 輸入檢查與最多 1,200 output tokens、25 秒 timeout、每訂單跨語言保留費用最多 NT$1、失敗最多三次、未確認 provider outcome 不自動重試、section／report 並行鎖。費用換算使用既有 USD input 0.15／output 0.60 per million 與 USD/TWD=35，單次預留 NT$0.0567；**這是固定費率假設下的程式預算，不是 OpenAI 實際帳單或即時匯率保證**。既有 OpenAI Key binding 僅確認存在，未讀值／修改，沒有由 agent 執行付費呼叫。

本輪驗證：

- Worker TypeScript／ESLint、正式付款＋Live Provider＋admin 隔離 13 tests：PASS，provider 全部用離線攔截。
- 塔羅 recurring／one-time／entitlement：PASS。
- Frontend TypeScript／acceptance types／ESLint／Build／SEO／路由：PASS（既有 warnings）。
- zh/en admin UI 閉鎖＋開啟兩模式：PASS，三商品 synthetic checkout、form submit 被攔截，無外部交易。
- 正式真實 HTTPS 390／1440px：PASS，可點擊三價格按鈕、真實 zh/en login redirect。
- 匿名 profile／entitlements／reports／checkout config：401。
- 正式 callback 無簽章探測：400、`0|INVALID_SIGNATURE`，不授權、不寫訂單。本次來源沒有 challenge，不是官方綠界來源驗收。
- 正式非 Maya bindings、兩庫 schema hash、ledger：PASS，保持不變；無 migration／seed。
- 前後會員 25、orders 388、Maya 訂單／entitlements／reports 各 0，aggregate 未變；未讀個別會員資料。
- 真實付款、官方有效 callback、會員實際生成 Live AI、報告品質／實際帳單：NOT RUN。開關啟用不等於這些驗收 PASS。

此輪 agent 沒有建立正式訂單、送出綠界 form、操作信用卡或呼叫 OpenAI。會員可自行操作，並承擔正常商品費用。沒有 commit／push，仍使用隔離來源 overlay；Git HEAD 未改變。

回滾目標為本報告原安裝版本：Worker version `b7e1c981-c42c-487e-9b6d-565aa743b6d9`、Pages `724287b5-2575-4013-bb8f-97126a296889`。關閉付款 gate 也會阻擋在途 callback；如已有交易，須先核對在途訂單與通知，再安排關閉，不能直接恢復 D1／刪除付款記錄。

證據：`payment-install-activation-before.json`、`payment-install-activation-predeploy.json`、`payment-install-activation-after.json`、`maya-live-activation-https.json`；原 installation manifest 是前次發布，不套用此輪新 dist。

## 結果

**PASS：正式 Worker、Pages 已實際部署；付款程式與正式設定已安裝，但未開放。**

沒有送出綠界正式 checkout、建立真實交易、實際扣款、退款或呼叫付費 AI。官方 Sandbox／真實付款驗收依本次範圍 **NOT RUN**，不作為本次「關閉功能的安裝部署」之阻塞，也不宣告金流實際收款成功。

## 1. 部署與來源

| 項目 | 部署前／回滾目標 | 此次部署 |
|---|---|---|
| Worker deployment ID | `1fc4d5e9-7f14-4456-b957-7f14d4f0a91c` | `4b650e7b-a5f8-457c-81b5-91f0b00dcf23` |
| Worker version ID | `c64bd695-cc55-47c4-ab75-f926a9e13626` | `b7e1c981-c42c-487e-9b6d-565aa743b6d9` |
| Pages deployment ID | `d470f47f-ab83-4901-921c-e78b47532812` | `724287b5-2575-4013-bb8f-97126a296889` |

Worker：`bolt-tarot-api`，https://api.crystalfield101.com 。

Pages：`bolt-tarot`，https://www.crystalfield101.com 。

此次部署網址：https://724287b5.bolt-tarot-5ek.pages.dev 。

正式頁面：

- https://www.crystalfield101.com/maya-calendar/
- https://www.crystalfield101.com/en/maya-calendar/

Git HEAD：`305119fa6c94b2a50ac1e58551b0ca2c8c578fe5`。

發布包沿用已驗證的隔離 `production-release`：基底 `64d62ee55c8c8b4715c6dcc01410242975455f51`＋已提交首頁入口＋未提交 Dreamspell overlay。本次沒有 commit／push，也未把無關工作樹一起部署。**HEAD 並非包含所有 Dreamspell 功能的可重建 SHA。** 發布 manifest 保存 254 個 source／config／dist SHA256，部署後再次逐一核對一致。

未發布工作樹中的 Vedic provider 變更與 self-host service。既有 checkout、ECPay helper、subscription business logic、Session 與 Worker dispatcher 保持既有發布版本。

> 後續不能直接用只有 Git HEAD 的 CI 發布取代此 overlay；需先經授權整理 Dreamspell 專屬 commit，再確認發布包一致性。

## 2. 沿用塔羅正式金流

[checkout.ts](../worker/src/checkout.ts) 使用既有 [ecpay.ts](../worker/src/ecpay.ts) 的 `buildAioCheckOutForm`、`computeEcpayCheckMac` 與 AioCheckOut V5。

Dreamspell [mayaPayments.ts](../worker/src/mayaPayments.ts) 重用上述工具、`orders` 架構、Session、既有 `ECPAY_MERCHANT_ID`／`ECPAY_HASH_KEY`／`ECPAY_HASH_IV` binding，不建立第二套登入或另一份正式商店 Secrets。

雲端只核對上述 Secret bindings 與 JWT binding 的存在／名稱，不讀取或複製值，不以 binding 存在宣稱商店契約或實際簽章交易已驗證。

正式 endpoint：

`https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`

原先 ECPAY_ENV 不存在時既有 helper 已選正式 endpoint；此次明確設為 `production`，不改變塔羅 endpoint 選擇或 recurring／one-time 商業規則。ENV 明確設為 `production`；既有正式 ALLOWED_ORIGINS 保留，Session／Cookie／CORS 系統未改寫。

## 3. 商品與 Callback

| 商品 | 金額 | 訂單識別 |
|---|---|---|
| MAYA_BASIC_199 | NT$199 | item_type=maya、獨立 item_id／product_code |
| MAYA_FULL_499 | NT$499 | item_type=maya、獨立 item_id／product_code |
| MAYA_RELATIONSHIP_699 | NT$699 | item_type=maya、獨立 item_id／product_code |

正式 metadata 使用 `maya_payment_orders`；商品權限使用 `maya_entitlements`，不加入塔羅商品 catalog 或塔羅 unlock。

- ReturnURL：https://api.crystalfield101.com/api/maya/payments/callback
- OrderResultURL：https://api.crystalfield101.com/api/maya/payments/result
- 中文導回：https://www.crystalfield101.com/maya-calendar/member?maya_order={order_id}
- 英文導回：https://www.crystalfield101.com/en/maya-calendar/member?maya_order={order_id}

離線測試確認：

- form-urlencoded 通知、大小／重複欄位限制、CheckMacValue 驗證。
- MerchantID、MerchantTradeNo、TradeNo、TradeAmt、CustomField 商品／訂單、會員關係。
- RtnCode=1、SimulatePaid=0 才可授權；偽造、錯價、錯商店、未知訂單、模擬／失敗通知拒絕。
- D1 batch 更新與單一 entitlement；重複通知冪等，寫入失敗 rollback。
- browser result 只導回，不授權；保存的 locale 決定語言。
- Sandbox／塔羅／Maya 正式訂單不能交叉使用回呼授權。
- 管理員退款記帳／撤權有 audit reference 與冪等保護，不再授權已撤銷權限。

**退款記帳及撤權不是綠界退刷；此次未發起實際退款。**

## 4. 正式 D1

Customer：`64583df1-9f69-4164-8a89-c6dec6b4ac61`。

Cards：`7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7`。

Cloudflare 帳號：`9c7e7a59a9512d771d6e322c6927859b`。

部署前確認目前 Customer Time Travel bookmark：

`000013f1-00000000-00005100-ec54c064311eaeec83d5a4ac8e08cdfa`

此為當時有效還原點，不是永久備份；未執行還原。

| 檢查 | 結果 |
|---|---|
| migration 025 ledger | PASS：已套用，2026-10-10 06:09:45 UTC |
| migration 027 ledger | PASS：已套用，同時間 |
| migration 026／maya_sandbox_orders | PASS：正式庫未套用／不存在 |
| 五張主要表、付款 metadata／adjustment、索引／外鍵 | PASS：schema 唯讀確認 |
| 外鍵檢查 | PASS：0 violations |
| 必要新 migration | 不需要；本次沒有遠端寫入 |
| 公開內容 | PASS：zh-TW 260、en 260，KIN 1–260 |

ledger 自增 ID=26 對應名稱 `027_maya_production_payment_ai.sql`；這不是 migration 026。

部署前／後 aggregate 均為：

- profiles：25。
- orders：388。
- maya_kin_profiles：1。
- maya_payment_orders／maya_entitlements／maya_reports：各 0。
- Customer file_size：15,294,464 bytes；Cards：2,412,544 bytes，未變。

兩庫 schema hash、Customer ledger／內容分布／aggregate／外鍵檢查前後一致。沒有读取其他會員個別生日／報告，沒有對原有資料做逐筆 hash；不將 aggregate 不變誇大為逐筆資料驗證。

## 5. 功能開關與前端

實際遠端 bindings 與匿名 `/api/maya/config` 已核對：

```text
MAYA_PUBLIC_ENABLED=true
MAYA_MEMBER_ENABLED=false
MAYA_PAYMENT_ENABLED=false
MAYA_AI_ENABLED=false
MAYA_SANDBOX_ENABLED=false
ENV=production
ECPAY_ENV=production
MAYA_PAYMENT_API_ORIGIN=https://api.crystalfield101.com
MAYA_PAYMENT_FRONTEND_ORIGIN=https://www.crystalfield101.com
```

既有 `MAYA_ADMIN_PREVIEW_ENABLED=true`、Mock 模式與 Customer content source 保留；這是原先管理者專用、非付款且無 AI 呼叫的預覽，不是對一般會員啟用 member／payment／AI。

[wrangler.toml](../worker/wrangler.toml) 已持久化明確正式環境與預設關閉設定，`keep_vars=true` 保留現有 Dashboard 非 Maya bindings。使用同值的隔離發布 config 部署，不直接把 dirty repo 當發布包。

[MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx) 三商品在公開中英文頁均顯示價格與 disabled「綠界付款：即將開放」／「ECPay checkout: coming soon」。保留既有報告權限按鈕與管理者 Mock 次要操作。

部署後非交易測試：

| Request | 實際結果 |
|---|---|
| POST `/api/maya/checkout`（只送到自家 Worker） | 503、FEATURE_DISABLED；未建立訂單 |
| POST `/api/maya/payments/callback`（無效通知） | 503、`0\|FEATURE_DISABLED` |
| POST `/api/maya/payments/result`（無效通知） | 503、`0\|FEATURE_DISABLED` |

未啟用 callback 在查訂單／更新／授權前拒絕。上述不是送至綠界的 checkout，不會產生交易。

## 6. 技術測試

| 項目 | 結果／範圍 |
|---|---|
| Worker TypeScript／Maya test typecheck | PASS |
| Worker ESLint | PASS |
| Frontend TypeScript／ESLint | PASS，5 個既有 lint warnings、0 errors |
| Frontend Build／45 routes SEO | PASS；既有 bundle-size warning |
| Worker Maya 五組 suite | PASS：39 個不同 tests；首輪 37，再補最新 phase2／admin 14（12 重複＋2 額外） |
| 商品／正式參數／簽章／callback／偽造／重送／退款撤權 | PASS：隔離本地合成憑證／通知 |
| 塔羅 recurring／one-time／冪等／權限回歸 | PASS |
| Human Design locale／付款權限、Vedic／計算 auth | PASS：本地合成或攔截 provider，不產生費用 |
| KIN／外部參考 | PASS：10 tests，296 普通日期對照；5 個閏日既有差異保留 |
| zh/en 路由／numerology 固定樣例 | PASS |
| 管理者 Mock UI／停用付款／價格 | PASS：mocked UI，未冒充真實登入 |
| 塔羅付款導回／雙語 auth | PASS |
| 正式 HTTPS Worker health／catalog／Google config | PASS；Google config 必須使用合法 site Origin |
| 正式 zh/en 390／1440px | PASS：每頁 3 個正確價格 disabled 付款按鈕，無橫向溢出或自動 checkout |
| 首頁＋四大命理 zh/en | PASS：10 個公開頁 HTTP 200、h1；僅基本健康，不是完整真人付費 E2E |
| 正式會員個人登入／真實綠界／Live AI | NOT RUN：本次不授權交易或付費 API |

VS Code test tool 未找到 standalone scripts，改用既有 tsx runner；發布包缺少 admin preview npm script 時直接執行既有 script，後續 PASS。Cloudflare direct read 遇到一次 expired-login 401，使用 Wrangler whoami 刷新後重做 predeploy：部署 ID、schema、ledger、aggregate 均無 drift，才開始部署。

## 7. 回滾與後續限制

1. 保持付款／AI／Sandbox false，不需要資料回滾。
2. Worker 如異常，可經確認使用 Wrangler rollback 到上述部署前 **version ID**；非 deployment ID。之後再次核對 D1 bindings、Secrets 名稱與關閉 flags。
3. Pages 可在既有 `bolt-tarot` 專案 rollback 到上述部署前 deployment。
4. 本次無 migration，不 DROP Maya 表、不重送 seed、不自動還原整庫。Time Travel 還原可能覆盖部署後其他系統合法資料，必須另行確認。
5. 如未來要開啟付款，需要另行授權及會員／實際支付／報告交付與成本前置檢查。本次只是安裝、不開放，不把離線 PASS 換成真實收款 PASS。
6. callback 跟隨 member／payment gate；未來關閉功能前須處理在途訂單，不假設 gate=false 仍會收有效支付。

## 8. 本次檔案與證據

Repository 變更：

- [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx)：三商品停用的付款狀態。
- [maya-admin-preview-ui-check.ts](../app/scripts/maya-admin-preview-ui-check.ts)：新增停用按鈕及三價格斷言。
- [wrangler.toml](../worker/wrangler.toml)：正式 vars、關閉 flags、保留 vars。
- 本報告。

Session artifacts：

- `payment-install-before.json`、`payment-install-predeploy.json`、`payment-install-after.json`。
- `payment-install-artifact-manifest.json`。
- `payment-install-https.json`。
- exact release `app/scripts/maya-payment-install-smoke.ts`。

所有 deployment 與遠端驗證均已完成。停止，不再自行啟用付款或進行交易。
