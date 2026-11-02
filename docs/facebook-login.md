# Facebook 與出生資料登入入口

四個公開工具首頁仍可閱讀；開始填寫出生資料前導向登入頁，成功後返回原工具。登入頁提供既有 Google、電子郵件密碼，以及可設定的 Facebook 串接。中英文共用相同帳號。

## 啟用 Facebook 前

1. 建立 Meta 應用程式並設定 Facebook Login 網站網域、正式網站 URL、隱私政策及資料刪除指引；完成 Meta 要求的上線與權限設定。網站採 JavaScript SDK token 流程。
2. 檢查並套用新增的 `d1/migrations/035_facebook_identities.sql`。此變更僅新增身分對應表，不改既有會員。
3. Worker 設定 `FACEBOOK_APP_ID`、`FACEBOOK_GRAPH_VERSION`（使用該應用程式目前支援的版本，例如格式 `vNN.N`）；透過 secret 設定 `FACEBOOK_APP_SECRET`，不可放前端、版本庫或日誌。
4. 維持既有允許來源設定，部署 Worker 與前端後，以 Meta 測試帳號完成真實登入驗證，再開放一般會員。

未設定完整參數或缺少資料表時，介面顯示 Facebook 尚未啟用。此輪沒有執行正式 migration、部署或真實 OAuth 登入。

## 安全與帳號關聯

後端驗證 Origin、CSRF、Meta token 所屬 App、有效期限與使用者 ID，再取得個人資料。Facebook token 不儲存；使用既有網站 session。穩定身分以 App ID + Facebook user ID 識別。

首次登入需要 Facebook 提供電子郵件。如果信箱已屬於既有 Google／密碼會員，不會自動合併；會提示使用原登入方式。尚未實作登入後連結 Facebook 帳號功能。

## 本機驗證

- Worker：`npx tsx --test scripts/facebook-auth-check.ts`（模擬 Meta，驗證 CSRF、來源、App、期限、身分、信箱衝突及 provider 失敗）。
- App：`npx tsx scripts/birth-login-browser-check.ts`（模擬 session 與 Google UI，禁止對外請求；四工具中英文入口、返回、手機桌面排版）。
- 真實 Google／Facebook OAuth、郵件寄送及正式帳號驗證需另行執行；模擬測試不能代替正式驗收。
