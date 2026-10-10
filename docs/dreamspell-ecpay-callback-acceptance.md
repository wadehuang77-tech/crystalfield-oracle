# Dreamspell ECPay Callback 驗收

日期：2026-10-10，Asia/Taipei。

## 結論

**隔離本地測試 PASS；真實 HTTPS 拒絕結果已確認；官方 Sandbox 三商品 BLOCKED／NOT RUN。正式 Maya 付款尚不具備啟用條件。**

本次只做唯讀雲端查核、無效通知 HTTP 探測及本地 Miniflare 測試。沒有部署、遠端 migration／seed／訂單寫入、Secrets 修改、付款開關變更、實際扣款、付費 AI、commit 或 push。

## A. 介接版本、端點及 ReturnURL

使用 [buildAioCheckOutForm](../worker/src/ecpay.ts) 的 **AioCheckOut V5** 表單，`PaymentType=aio`、`EncryptType=1`。Dreamspell [付款路由](../worker/src/mayaPayments.ts) 指定 stage／production，不以舊 helper 的預設正式環境猜測模式。

| 欄位 | Sandbox | 正式程式預期值 |
|---|---|---|
| Checkout endpoint | https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5 | https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5 |
| ReturnURL | https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/callback | https://api.crystalfield101.com/api/maya/payments/callback |
| OrderResultURL | https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev/api/maya/sandbox/result | https://api.crystalfield101.com/api/maya/payments/result |
| 中文 ClientBackURL | https://crystalfield-maya-sandbox.pages.dev/maya-calendar/member?maya_order={order_id} | https://www.crystalfield101.com/maya-calendar/member?maya_order={order_id} |
| 英文 ClientBackURL | https://crystalfield-maya-sandbox.pages.dev/en/maya-calendar/member?maya_order={order_id} | https://www.crystalfield101.com/en/maya-calendar/member?maya_order={order_id} |
| MerchantID | 測試設定 `3002607`；尚無有效 checkout | 既有 Secret binding 存在；未讀值，NOT RUN |

ClientBackURL 的 `{order_id}` 是後端建立的訂單 ID；此次沒有遠端測試訂單，因此沒有實際可付款表單／完整特定訂單網址。OrderResultURL 收到已驗證 form 後 303 到依儲存語言產生的會員網址，**不自行開通權限**。

正式 `MAYA_PAYMENT_API_ORIGIN`／`MAYA_PAYMENT_FRONTEND_ORIGIN` binding 目前不存在；表中正式值是程式明確要求值，不是此次實際發出的付款表單。正式 ENV／ECPAY_ENV 未在此次 metadata 顯示；付款 gate false，不能宣稱正式支付設定已通過。

### 切換與隔離

- Sandbox：member／sandbox gate true、payment false、ENV=dev、MAYA_AI_MODE=mock 或 live、獨立官方 Sandbox MerchantID／Key／IV、HTTPS 測試 origins。
- 正式：member／payment gate true、sandbox false、ENV=production、ECPAY_ENV=production、非測試商店憑證、固定正式 origins。
- payment 與 sandbox 同時 true 時拒絕兩種付款模式。
- 測試 Worker entry 拒絕 `/api/maya/payments/*`；只允許 Sandbox 路徑。
- Sandbox orders 使用 `maya_sandbox_orders`／item_type=maya_sandbox；正式使用 `maya_payment_orders`／item_type=maya。
- 正式 migration 026 未執行，本次没有重跑任何遠端 migration。
- 不輸出、不讀取 HashKey／HashIV；僅檢查 binding 名稱與存在性。

## B. 真實 Worker HTTP 接收

匿名、沒有 Cookie／Authorization／Origin 的 HTTPS POST，Content-Type 為 `application/x-www-form-urlencoded`，送入刻意無效且沒有訂單識別或簽章的 `RtnCode=0&SimulatePaid=1`。

| URL | HTTP／內容 | 結果 |
|---|---|---|
| 測試 `/api/maya/sandbox/callback` | 503，`0|FEATURE_DISABLED` | PASS：可到達 Worker；BLOCKED：有效付款接收 |
| 測試 `/api/maya/sandbox/result` | 503，`0|FEATURE_DISABLED` | PASS：可到達 Worker；BLOCKED：導回驗收 |
| 正式 `/api/maya/payments/callback` | 503，`0|FEATURE_DISABLED` | PASS：未啟用付款、拒絕通知 |
| 正式 `/api/maya/payments/result` | 503，`0|FEATURE_DISABLED` | PASS：未啟用付款、拒絕通知 |

四個回應皆是 Worker text/plain，沒有 `cf-mitigated` 或 HTML challenge。**只代表本次測試來源沒有遭 challenge，不保證綠界來源 IP／WAF 一定可通過**；未稽核全部 Cloudflare WAF 規則，官方 ServerPost 尚 NOT RUN。

Callback 程式不讀 browser Session，且 dispatcher 排除 callback／result 的瀏覽器 Origin 檢查；有效離線 callback 用沒有登入 Cookie 的 Request 通過。仍受功能開關與憑證設定 gate 限制。

### 介接確認內容

[綠界官方付款結果通知文件](https://developers.ecpay.com.tw/2878/) 說明綠界 ServerPost 至 ReturnURL，特店回應 `1|OK`。

程式有效通知處理後回 HTTP 200，純文字 `1|OK`。本次新增離線測試逐字核對有效／重複成功通知的回應。無效通知回非成功狀態及 `0|錯誤碼`。目前公開站是 503，不可標示「官方回呼成功」。

## C. 官方 Sandbox 三商品

| 商品 | 建立遠端訂單 | 官方付款頁操作 | 官方 callback | D1 paid／權限／報告／雙語導回 |
|---|---|---|---|---|
| MAYA_BASIC_199，NT$199 | NOT RUN | BLOCKED | NOT RUN | NOT RUN |
| MAYA_FULL_499，NT$499 | NOT RUN | BLOCKED | NOT RUN | NOT RUN |
| MAYA_RELATIONSHIP_699，NT$699 | NOT RUN | BLOCKED | NOT RUN | NOT RUN |

阻塞：隔離 Worker 沒有 `JWT_SECRET`、測試 `GOOGLE_CLIENT_ID`、`MAYA_SANDBOX_HASH_KEY`、`MAYA_SANDBOX_HASH_IV` bindings。member／Sandbox／AI 均 false。不能借用正式 Secrets、合成登入或合成支付 callback 冒充官方交易。

### 待設定／人工步驟（本次未執行）

1. 在測試 Worker 安全設定獨立 JWT、測試 Google Web Client 與官方 Sandbox Key／IV；不要貼到聊天或 repository。
2. Google 測試允許來源：https://crystalfield-maya-sandbox.pages.dev 。GIS credential popup 不是 authorization-code redirect，不猜測 Redirect URI。
3. 經明確授權，在測試 Worker 啟用 member／sandbox；報告使用 ENV=dev＋MAYA_AI_MODE=mock，若開啟測試 AI gate，不綁 OpenAI Key、不呼叫 Live。
4. 驗證跨站 Cookie、CORS 與 callback。若 pages.dev／workers.dev Cookie 被瀏覽器限制，另行確認同站域名／DNS／OAuth 設定。
5. 兩個經授權測試會員登入：
   https://crystalfield-maya-sandbox.pages.dev/maya-calendar/member
   https://crystalfield-maya-sandbox.pages.dev/en/maya-calendar/member
6. 儲存測試生日，699 先儲存經同意的 partner profile；依序點三種方案的官方 Sandbox checkout。表單應提交到上方 stage V5 endpoint，不是 production。
7. 使用官方測試頁規定的測試資料人工完成；不使用真實消費者卡號或憑證，不在聊天分享 Token。
8. 等官方 ReturnURL，唯讀確認該測試會員 order、trade、amount、product、status、單一 entitlement；生成 Mock 報告，確認另一會員無法读取。
9. 中文／英文各核對儲存 locale 導回；再安排異常／重送與撤權驗收。不要對正式訂單送出偽造／重播通知。

目前不提供虛假的已建立 checkout URL；缺少憑證尚無訂單可供操作。

## D. 簽章與異常測試

本次 runner：[maya-sandbox-check.ts](../worker/scripts/maya-sandbox-check.ts)（10 tests）與 [maya-production-check.ts](../worker/scripts/maya-production-check.ts)（12 tests）。全部用全新本地 Miniflare D1／測試 Session／合成簽章，不是官方外部交易。

| 檢查 | 本地結果 | 官方 Sandbox |
|---|---|---|
| form-urlencoded、16KiB 限制、重複欄位拒絕 | PASS | NOT RUN |
| CheckMacValue SHA256 與 constant-time compare | PASS | NOT RUN |
| MerchantID／MerchantTradeNo／TradeNo／訂單存在 | PASS | NOT RUN |
| TradeAmt／商品／CustomField／訂單會員一致 | PASS | NOT RUN |
| RtnCode=1 才 paid＋對應商品 grant | PASS | NOT RUN |
| SimulatePaid=1 | PASS：不開通 | NOT RUN |
| 偽造簽章／錯誤金額／商店／不存在訂單 | PASS：不開通 | NOT RUN |
| 失敗付款 | PASS：failed，不授權 | NOT RUN |
| 重複 callback | PASS：單一 entitlement，`1|OK` | NOT RUN |
| D1 write failure | PASS：batch rollback，重試不重複 grant | NOT RUN |
| 晚到通知，pending order | PASS：舊 created_at 仍可驗證授權 | NOT RUN |
| cancelled／failed order 晚到成功 | PASS：409，不恢復權限 | NOT RUN |
| 只有瀏覽器 result 無有效 callback | PASS：303 導回，不 paid／grant | NOT RUN |
| 另一會員讀取訂單／報告 | PASS：拒絕 | NOT RUN |
| 已撤銷權限＋重播成功通知 | PASS：不重新啟用 | NOT RUN |
| 退款記帳／撤權 | PASS：本地正式形狀管理操作 | NOT RUN |

退款調整 endpoint 是記錄已由外部核實的退款／撤銷並撤權，**不是綠界退刷 API**；此次沒有發起實際退款。

### 需注意的營運限制

- 關閉 member 或 payment／sandbox gate 也會讓該模式的在途 callback 拒絕。未來開通或關閉付款時必須規劃在途訂單接收／人工核對，不能假設停 checkout 仍自動收 callback。
- pending 舊訂單沒有以 created_at 自動過期；晚到仍接受有效簽章。failed／cancelled 終態不重開，需人工 reconcile，不應直接把 failed 改 paid。
- 無官方通知／交易查詢結果時，不能用前端付款成功頁或管理者 Mock 權限當成已付款。

## E–F. D1 與權限現況

測試 Customer UUID：`1ad83812-c5ac-425d-b1bd-fbcd539919fa`，metadata name `crystalfield-maya-sandbox-customer`，16 tables。

唯讀 aggregate：會員 0、orders 0、maya_sandbox_orders 0、entitlements 0、reports 0。**沒有任何官方三商品訂單或有效購買權限。**

正式資料不讀個別會員／訂單；不執行任何正式寫入。管理者 Mock 預覽是非付款功能，不建立付費報告權限。

## G. 測試總結與部署保持

- 22 tests：PASS 22、FAIL 0。
- 新增晚到通知／ack 測試：PASS。
- 相關 ESLint、Problems、git diff --check：PASS。
- Cloud callback HTTPS reachable：PASS；本次來源無 challenge：PASS（範圍有限）。
- Cloud callback 可接受官方付款：BLOCKED，gate 503。
- 官方三商品／真實會員隔離／正式帳單：NOT RUN。

唯讀時部署：

- 正式 Worker：`1fc4d5e9-7f14-4456-b957-7f14d4f0a91c`。
- 隔離 Worker：`2c08cc9a-9989-4abd-8650-cd9d3f91f644`。
- 本次未修改部署，新增內容只有本地測試与本報告。

證據：session files `callback-readonly-result.json`；runner output `1791616441734-copilot-tool-output-40620-3cf82df0-0d3b-4275-a20f-50d55f22b79c.txt`。只保存安全 metadata／aggregate／HTTP 拒絕，不保存 Secrets 或私人資料。

## H. 正式金流啟用條件

**BLOCKED：尚不能啟用。** 需完成專用測試憑證、真實 Google／Session、官方 Sandbox 199／499／699 全流程、實際 callback/WAF、報告交付與正式支付設定核對。`MAYA_PAYMENT_ENABLED=false` 保持不變，AI／Sandbox 對正式站均 false。

停止於憑證與外部測試前置条件，等待安全設定與後續授權，不宣告官方 Sandbox PASS。
