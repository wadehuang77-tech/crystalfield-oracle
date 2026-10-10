# CrystalField101 Dreamspell Phase 2.5 acceptance

驗收日期：2026-10-10。範圍僅限本地驗收與修正，**未進入 Phase 3**。

結論：一般日期的外部規則比對及本地自動驗收 PASS；真實 Google
登入 NOT RUN、Maya 綠界測試付款 BLOCKED、特殊規則仍 BLOCKED。
目前**不具備完整 Phase 3 上線條件**。

## A. Dreamspell 外部來源驗證

### 來源與方法

| 來源 | 實際證據 | 用途 |
| --- | --- | --- |
| [Foundation for the Law of Time decoder](https://lawoftime.org/decode/) | 原頁內建解碼器，2002-07-26 KIN 49 基準，以年/月/日逐步調整；程式署名 Ash Mystic，2017 | 日期、KIN、完整英文銀河印記 |
| [Galactic Ark calculator](https://galacticark.org/dreamspell-kin-calculator) | 獨立 WordPress 計算器，2025-12-10 KIN 1 基準，整數 Julian-day 與閏日計數 | 日期、KIN、20 圖騰、13 音調、20 波符 |
| [LifeMoment calculator explanation](https://lifemomentcalc.com/galactic-signature-calculator/) | 明載 1987-07-26 KIN 34、tone/seal/wavespell 公式、5 個各 52 KIN 的城堡與 0.0 閏日說明 | 第三來源規格佐證；**不計作第二份日期計算資料集** |
| [Law of Time tutorial](https://lawoftime.org/thirteenmoon/tutorial.html) | 13×28、7 月 26 日新年及圖騰/音調介紹 | 日期標記佐證；與第一來源同出版者，不算獨立來源 |

前兩者出版者、程式結構與基準不同；未發現直接複製同一程式的證據。
這是**獨立實作交叉驗證**，不是宣稱兩者有完全獨立的歷史學傳承。
沒有以本專案演算法另產兩份資料冒充外部驗證。

取得原始公開 HTML/JS 後，在隔離的本機 Chrome 重播原計算器：
Law of Time 使用原日期欄位與送出按鈕讀取畫面簽名；
Galactic Ark 執行原 `onCalculate` 並確認畫面的 KIN，讀取其原資料與波符函式。
重播時阻擋所有外連資源。原始網站腳本及依賴僅保留於 session artifacts；
專案只保存衍生日期、數字及名稱事實，不保存圖片、mantra 或解讀全文。
這不是直接操作線上網站、也不是另外重寫其演算法。

資料：[maya-external-reference.json](../app/scripts/maya-external-reference.json)；
回歸：[maya-reference-check.ts](../app/scripts/maya-reference-check.ts)。
蒐集時間 `2026-10-10T03:40:17.387Z`。

來源快照 SHA-256：

- Law of Time HTML：
  `85e60823b9b21978c2fc3b748bafddc5383f05af043f9d4b495d2e4b090823a9`
- Galactic Ark 原 JS：
  `6a95c4fa842f4d56b1f888870f47c64cc28a17ad933d6750e0cda11125fcd7cb`
- Galactic Ark 腳本 URL：
  <https://galacticark.org/wp-content/plugins/dreamspell_KIN_calculator_v1.3/dreamspell-calculator.js?ver=1.0.0>

### 外部案例與差異

共 **301 個不同日期**，包含下面 44 個跨年代案例及從
2025-12-10 起選取的連續 260 個 Gregorian 日期；重複日期去重。
均為虛構測試輸入，非會員生日。
兩外部計算器 301/301 一致；引擎在 **296 個一般日期全部一致**。
一般日期涵蓋完整 260 KIN、20 圖騰、13 音調、20 波符。
名稱只忽略大小寫、空白與連字號差異，例如 World-Bridger/Worldbridger。

表中兩來源欄為各自實際輸出；一般日期的引擎結果與其相同。
BLOCKED 表示不可將該輸出當作已核准的 2 月 29 日生日印記。

| 日期 | Law of Time KIN | Galactic Ark KIN | 一般日期比對／生日規則 |
| --- | ---: | ---: | --- |
| 1900-01-01 | 53 | 53 | PASS |
| 1900-02-28 | 111 | 111 | PASS |
| 1900-03-01 | 112 | 112 | PASS |
| 1900-07-25 | 258 | 258 | PASS |
| 1900-07-26 | 259 | 259 | PASS |
| 1912-02-28 | 71 | 71 | PASS |
| 1912-02-29 | 71 | 71 | BLOCKED；引擎 72 |
| 1912-03-01 | 72 | 72 | PASS |
| 1920-12-31 | 177 | 177 | PASS |
| 1921-01-01 | 178 | 178 | PASS |
| 1939-07-25 | 193 | 193 | PASS |
| 1939-07-26 | 194 | 194 | PASS |
| 1945-08-15 | 64 | 64 | PASS |
| 1950-01-01 | 103 | 103 | PASS |
| 1960-02-28 | 171 | 171 | PASS |
| 1960-02-29 | 171 | 171 | BLOCKED；引擎 172 |
| 1960-03-01 | 172 | 172 | PASS |
| 1969-07-20 | 218 | 218 | PASS |
| 1970-01-01 | 123 | 123 | PASS |
| 1976-07-25 | 178 | 178 | PASS |
| 1976-07-26 | 179 | 179 | PASS |
| 1987-07-25 | 33 | 33 | PASS |
| 1987-07-26 | 34 | 34 | PASS |
| 1987-07-27 | 35 | 35 | PASS |
| 1988-02-28 | 251 | 251 | PASS |
| 1988-02-29 | 251 | 251 | BLOCKED；引擎 252 |
| 1988-03-01 | 252 | 252 | PASS |
| 1999-12-31 | 152 | 152 | PASS |
| 2000-01-01 | 153 | 153 | PASS |
| 2000-02-28 | 211 | 211 | PASS |
| 2000-02-29 | 211 | 211 | BLOCKED；引擎 212 |
| 2000-03-01 | 212 | 212 | PASS |
| 2002-07-25 | 48 | 48 | PASS |
| 2002-07-26 | 49 | 49 | PASS |
| 2012-12-21 | 207 | 207 | PASS |
| 2024-02-28 | 131 | 131 | PASS |
| 2024-02-29 | 131 | 131 | BLOCKED；引擎 132 |
| 2024-03-01 | 132 | 132 | PASS |
| 2025-07-25 | 123 | 123 | PASS |
| 2025-07-26 | 124 | 124 | PASS |
| 2025-12-10 | 1 | 1 | PASS |
| 2026-07-25 | 228 | 228 | PASS |
| 2026-07-26 | 229 | 229 | PASS |
| 2026-10-10 | 45 | 45 | PASS |

1987-07-26 兩者均為 **White Galactic Wizard，KIN 34**。
城堡數字依第三來源公開規格，固定範圍為
1–52、53–104、105–156、157–208、209–260；
各組起訖邊界均通過測試。這是分組規格驗證，不冒稱第三份外部日期輸出。
7 月 25 日時間之外日與 7 月 26 日新年標記符合公開資料；
沒有啟用舊 moon-date 輸出。

**閏日差異沒有修成猜測結果：**Law of Time 文字說明為
0.0 Hunab Ku，生日中午前使用 2 月 28 日、中午後使用 3 月 1 日，
但畫面計算器一律回傳前一天；正午邊界未確定。
Galactic Ark 也回傳前一天；LifeMoment 說明不指派一般 KIN。
保留 dreamspell-2026.2 與既有演算法，出生日期 API 的
`LEAP_DAY_BLOCKED` 422 及雙語明確錯誤繼續有效。
「成功捕捉差異」的回歸測試 PASS **不代表閏日生日規則 PASS**。

## B. 瀏覽器連線問題與替代驗收

| 檢查 | 實測結果 |
| --- | --- |
| Vite host / port | `127.0.0.1:5199`，使用 `--strictPort`，IPv4 listener 已確認 |
| IPv4 `127.0.0.1` | PowerShell HTTP 200；同主機 Chrome HTTP 200，React 真正渲染 PASS |
| `localhost` | 本機 HTTP 200；整合瀏覽器仍逾時 |
| IPv6 `[::1]` | 連線失敗；符合伺服器只綁 IPv4，沒有 IPv6 listener |
| VS Code 整合瀏覽器 | localhost/127.0.0.1 逾時，舊 navigation 顯示 `net::ERR_ABORTED`；驗收 FAIL |
| Proxy | 未設定 HTTP_PROXY、HTTPS_PROXY、NO_PROXY；替代 Chrome 使用 direct proxy |
| 容器／遠端 loopback 隔離 | **未能直接證明**；整合工具與同主機結果不同，不能據此斷言確切隔離機制 |
| 系統 proxy／防火牆完整稽核 | NOT RUN；沒有修改系統、防火牆或公開綁定 |
| 替代瀏覽器 Console / Network | 6 個情境均無未處理 pageerror 或本地 requestfailed；預期未設定登入的 503、未授權 403、閏日 422 分開測試 |

無法宣稱整合瀏覽器已修好。已建立**可重現的同主機 Playwright +
已安裝 Chrome**驗收，使用獨立 context，不讀取個人的 browser profile。
未安裝下載瀏覽器，也未部署網站。
阻擋第三方 analytics、Google、付款或 AI 網路要求；
API 明確採 route Mock，不能當作真實 OAuth／Worker E2E。
本地 Worker 的真實資料庫與授權由獨立 Miniflare/D1 測試覆蓋。

操作方式（兩個本地 PowerShell 視窗；不啟動正式 Worker）：

```powershell
npm.cmd --prefix app run dev -- --host 127.0.0.1 --port 5199 --strictPort
```

```powershell
$env:MAYA_ACCEPTANCE_OUTPUT = Join-Path $env:TEMP 'crystalfield-maya-acceptance'
npm.cmd --prefix app run test:maya-browser
npm.cmd --prefix app run test:maya-references
npm.cmd --prefix app run typecheck:maya-acceptance
```

測試有意固定上述 host/port，避免不小心對正式站執行。
Chrome 須已安裝；截圖與 JSON 寫入指定本地 artifact 路徑，不進 repository。
本次使用的暫時 Vite 在驗收後停止。

## C. Google 登入實測

使用者確認「尚未準備測試環境；完成可自動驗證部分並列人工步驟」。
未要求密碼、Cookie 或 Token，也未借用正式帳號。

| 項目 | 結果 |
| --- | --- |
| 中文／英文登入入口與原頁 redirect | PASS：真實頁面導航＋Mock config failure，以及既有 auth 回歸 |
| 外部／跨語言不安全 redirect 拒絕 | PASS：既有自動 auth / route tests |
| 真實中文 Google OAuth | NOT RUN |
| 真實英文 Google OAuth | NOT RUN |
| 真實 OAuth 後免費計算、生日持久化 | NOT RUN |
| 真實 OAuth 登出與兩帳號資料隔離 | NOT RUN |
| Mock 登入、計算、語言切換、登出後私人頁拒絕 | PASS：Chrome；不是 Google OAuth |
| 簽署測試 session、錯誤／過期／撤銷 session、兩會員隔離 | PASS：Worker＋隔離 D1 |

本地缺少 Google client 測試設定及可授權操作環境。
Vite `/api` proxy 指向 8787，而本次未開真實 OAuth Worker；
現有 allowed origins 包含 5173，不包含 5199。
不得把這個 Mock 預覽當作可操作真實 OAuth 的環境，
也沒有為此變更正式 origins 或會員資料。

**待人工驗收：**

1. 建立隔離本地 D1 與測試 Worker 設定，安全地注入測試 OAuth client、
   session secret，選定 5173 或明確加入測試 5199 origin；不得套用正式 D1。
2. 在 Google Console 登記相符的測試 JavaScript origin，使用者自行登入
   授權測試帳號 A，從中文 Dreamspell 按計算，確認回中文會員原頁。
3. 用虛構生日計算，重新整理確認自己的資料仍在；登出，
   私人 API 應 401，私人頁不能顯示資料。
4. 用不同測試帳號 B 重複，自己的列表不能看到 A；
   以 A 的測試 profile/report ID 嘗試存取應拒絕，不分享 credential。
5. 從英文入口重做，Google 完成後留在英文；英文結果及報告不混中文。
6. 只記錄 PASS/FAIL、狀態碼及去識別化結果；不把登入憑證放入報告或聊天。

## D. 手機、平板、桌面

**PASS：42 個 viewport/語言/流程檢查**，390、768、1440px × zh-TW/en。

每個情境涵蓋：

- 首頁、20 圖騰、13 音調與方案；
- Google 登入入口／原語言 return path，未設定服務錯誤；
- 真實日期輸入、儲存計算、KIN 34／Wizard 與每日內容（API Mock）；
- 所有未購買方案按鈕 disabled；閏日錯誤不覆寫舊資料；
- 未開放 premium 的 403 顯示；
- 本地 Mock entitlement 的 NT$199 報告閱讀及歷史；
- 切換語言重取對應姓名資料、保留 Mock 會員；
- Mock signout 後私人報告頁返回登入、不顯示報告。

每個適用頁檢查 document scrollWidth 不超過 viewport，
並以 elementFromPoint 檢查可見可用的 main buttons/inputs 沒被其他元素遮擋。
沒有發現需修補的水平溢出或按鈕遮擋，因此未重寫已驗證頁面。
6 張 full-page 截圖與 42 筆結果保存在 session artifact
`files/maya-browser`；已目視檢查英文 390px 報告。
固定 viewport 不是實體手機、iOS Safari、Android Chrome 或真實 Google widget
驗收；這些實機項目 **NOT RUN**。不宣稱完成所有文字截斷的視覺斷言。

## E. ECPay 測試環境與付款權限

已檢查 [ecpay.ts](../worker/src/ecpay.ts) 與
[checkout.ts](../worker/src/checkout.ts)。既有 catalog **沒有 Maya 商品**，
既有 checkout/callback **尚未串接 Maya entitlement 開通**。
未把 Maya 商品直接放進正式 catalog，以免暴露未授權付款入口。
已有共用 CheckMac、safe/localized return helpers 可於後續 sandbox 整合重用。

本地未具備可用測試商店設定、可授權測試付款環境及外部 callback 網址。
本次沒有讀取或輸出正式金鑰、沒有發送綠界付款請求。

| 項目 | 結果／範圍 |
| --- | --- |
| NT$199／499／699 商品資料及 local Mock 授權報告 | PASS：三商品、兩語言、金額匹配、持久化 |
| 未付款／偽造 paid 參數不能解鎖 | PASS：Maya Worker/D1；無正常 sandbox callback |
| 失敗訂單、已撤銷／過期權限、其他會員禁止報告 | PASS：Maya Worker/D1 |
| 重複 local fixtures／idempotent report 不重複開通／生成 | PASS：本地唯一約束及報告重播；**不是 Maya callback 驗收** |
| 共用既有 ECPay 簽章、recurring/idempotency/one-time 回歸 | PASS：既有離線測試；不是 Maya 線上付款 |
| 中文／英文 safe return helpers | PASS：既有離線付款回歸；不是 Maya 實際付款導回 |
| Maya sandbox checkout 199／499／699 | BLOCKED：缺整合與可用 sandbox 設定 |
| Maya 正確簽章 callback 成功開通、失敗拒絕、重複 callback | BLOCKED：尚未接線，不能把 local seed 當付款成功 |
| Maya sandbox 偽造 callback／實際中文英文付款導回 | BLOCKED：尚未接線與可達 callback |
| 真實扣款／正式金流／自動續扣 | NOT RUN：禁止 |

後續需先授權 sandbox-only checkout/callback 開發；gate 必須同時確認測試環境、
測試 endpoint、會員 session、後端 catalog/amount、merchant/trade/checkmac、
付款狀態與 atomic unique grant。不得接受前端成功參數或沿用 admin bypass 開通
Maya。完成三金額的失敗、偽造、重複 callback、語言導回 E2E 後才能解除 BLOCKED。

## F. 本次重新執行的完整驗收

所有 PASS 為本次執行，非引用上一階段結果。

| 驗收 | 結果 |
| --- | --- |
| App TypeScript | PASS：既有 build task |
| Worker TypeScript | PASS：既有 build task |
| Maya Worker test TypeScript | PASS |
| 新增 browser/reference scripts TypeScript | PASS |
| App ESLint | PASS：0 errors，5 個既有 warnings |
| Worker ESLint | PASS |
| Frontend build | PASS；1600 modules；既有大 bundle 警告 |
| Prerender／SEO／sitemap／robots | PASS：45 routes |
| Hydration structure | PASS：45 routes＋404 |
| Dreamspell/Mock unit | PASS：7 tests，含 260 KIN、時區、特殊日期、全商品雙語 schema |
| 外部參考回歸 | PASS：3 tests；296 一般日、5 閏日差異捕捉、城堡起訖；閏日規則仍 BLOCKED |
| Worker＋真實隔離 D1 | PASS：12 tests |
| Migration 025 重跑、FK／unique、520 雙語內容 rows | PASS：Miniflare 本地 D1，未用 remote migration |
| 六個主要 API＋history/entitlement/deletion | PASS：登入、owner、驗證、私密 no-store、拒絕付費洩漏 |
| calculate/daily/report rate limit、失敗 fail-closed、retry/idempotency | PASS |
| Auth／雙語 Maya routes | PASS |
| Chrome 手機／平板／桌面 Mock 流程 | PASS：42 checks |
| Google 真實 OAuth E2E | NOT RUN |
| Maya ECPay sandbox E2E | BLOCKED |
| 既有 auth / payment-return / GA4 | PASS |
| 既有 Worker health / calculation-auth | PASS |
| 塔羅方案與深度推薦回歸 | PASS：tarot-subscription、tarot-deep-analysis |
| 人類圖報告雙語／權限回歸 | PASS：human-design-report-locale，模型 Mock |
| 印度占星雙語／存檔／方案回歸 | PASS：vedic-locale；無占星外部請求 |
| 生命靈數／既有付款導航回歸 | PASS：既有 payment-return 與 ECPay one-time 範圍；不是完整靈數核心 E2E |
| 四系統完整真實會員／付款／AI／核心計算 E2E | NOT RUN；本次不變更核心，也不進行真實付款／付費 AI |
| 五大神諭／城堡象徵／舊月亮日期輸出 | BLOCKED；持續停用 |
| 每日付費會員 | BLOCKED；未啟用，不包含在三份報告商品權限 |
| 正式 migration／commit／push／deploy／付費 AI | NOT RUN：禁止且未執行 |

測試命令均使用各 package 現有 runner。新增：
`test:maya-browser`、`test:maya-references`、`typecheck:maya-acceptance`。
本地測試未提供完整獨立滲透測試、所有 DB 歷史 migrations、實機驗收或完整網站
E2E 證明。App install 報告 18 個既有依賴 advisories（4 moderate、14 high）；
未執行無關的 audit fix；嚴重度與可利用性需要另外稽核。

## G. 保留成果、變更與未完成項目

### 本次新增

- [maya-browser-check.ts](../app/scripts/maya-browser-check.ts)：同主機 Chrome、
  明確 Mock API、雙語多尺寸版面與私密流程驗收。
- [maya-external-reference.json](../app/scripts/maya-external-reference.json)：
  301 筆衍生外部日期／名稱事實。
- [maya-reference-check.ts](../app/scripts/maya-reference-check.ts)：可重跑的差異回歸。
- [tsconfig.maya-acceptance.json](../app/tsconfig.maya-acceptance.json)：
  嚴格檢查上述測試程式。
- 本驗收報告。

### 本次修改

- [package.json](../app/package.json)、
  [package-lock.json](../app/package-lock.json)：Playwright devDependency 與測試命令。
- [dreamspell-spec.md](dreamspell-spec.md)：一般日期獨立驗證的新結果，
  保留特殊日期限制。

未重寫 dreamspell-2026.2、頁面、Google 系統、API、D1 migration 025、
商品／Mock 報告或會員權限。先前 Phase 2 的未提交檔案保留；
工作樹另有既存 Vedastro/SEO 等變更，不由本次覆寫或歸入本次成果。

### 尚未完成

1. 真實 Google 測試帳號 E2E（NOT RUN；依 C 節人工步驟）。
2. Maya sandbox checkout/callback 接線與真實測試環境 E2E（BLOCKED）。
3. 閏日生日中午規則、五大神諭、城堡象徵與修正後 moon-date 規格（BLOCKED）。
4. 整合瀏覽器的確切遠端／proxy 邊界原因；目前只有同主機替代方案 PASS。
5. 實體裝置及完整四系統 E2E（NOT RUN）。
6. 正式 AI adapter、成本與內容品質驗收（未授權，僅 Mock）。

## H. Phase 3 前置條件與停止點

**不能宣告 ready for production。**一般日期計算、雙語本地 UI、
私密 D1/API、Mock AI 與權限已具備測試基礎，但正式登入、Maya sandbox
金流及端到端驗收仍缺。

建議使用者確認後，先獨立授權測試環境補驗：

- 完成 C 節真實 Google 雙帳號及雙語驗收；
- 用 ECPay 測試設定接通三商品 callback，補足失敗／偽造／重複回呼；
- 審核未確認規則，維持未確認功能停用；
- 做實機／完整回歸及依賴風險評估；
- 另行批准正式 secret、D1 backup/migration、部署與付款切換方案。

本次無 commit、push、正式部署、正式 D1 migration、正式會員變更、
真實付款或付費 AI。完成本地驗收後停止，等待使用者確認。
