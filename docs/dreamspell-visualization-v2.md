# Dreamspell 星際生命藍圖視覺化 2.0

日期：2026-10-10。Phase 2：本地 React＋TypeScript＋SVG＋CSS 開發與驗證。

**結果：視覺化、資料映射、版本 Adapter、既有授權回歸、響應式及本地下載 PASS。AI API 呼叫次數：0。沒有部署。**

## 先行稽核與整合界線

- [dreamspell.ts](../app/src/lib/dreamspell.ts) 已有唯一確定性 KIN 引擎、20 太陽圖騰與 13 音調。重用既有 `mayaSignature`／`mayaForDate`，沒有新引擎或修改公式。
- anchor=1987-07-26→KIN34；日差排除 2 月 29 日；7 月 25 日／26 日既有特殊日期規則不變。日期與時區測試保留。
- 既有外部對照涵蓋全部 260 KIN、20 圖騰、13 音調；296 個普通日期一致，5 個閏日差異仍公開記錄。新公開日期計算同樣拒絕 2 月 29 日出生，不猜測結果。
- [Phase 1 Schema](../app/src/lib/mayaLifeBlueprint.ts) 已完成，版本 `dreamspell-life-blueprint-v2`，有十二篇固定 ID、五層、三階段九十天計畫。
- **正式 Worker 現有 NT$499 生成／儲存仍是舊版七篇。** Phase 2 不切換後端、不重新生成報告。前端現在可以接收合法 v2，但正式 API 尚無 v2 生成／儲存路徑。
- 使用既有 `/maya-calendar`、`/en/maya-calendar` 及對應 `/member`、`/reports/:id`，沒有新增重複路由。
- 公開頁只載入 public config，不請求私人 profile／report。私人報告沿用原後端 Session、本人、付款／有效權限／語言檢查。

## A. 新增與修改檔案

### 新增

| 檔案 | 用途 |
|---|---|
| [GalacticIdentityCard.tsx](../app/src/components/maya/GalacticIdentityCard.tsx) | 個人身份卡、自包含 SVG、本地 SVG／PNG 匯出 |
| [SolarSealIcon.tsx](../app/src/components/maya/SolarSealIcon.tsx) | 全 20 個原創幾何圖示、穩定 ID、可縮放、無障礙 title |
| [GalacticToneSymbol.tsx](../app/src/components/maya/GalacticToneSymbol.tsx) | 1～13 點線表示、名稱與關鍵字 |
| [TzolkinMatrix.tsx](../app/src/components/maya/TzolkinMatrix.tsx) | 260 KIN、出生標示、選取詳情、鍵盤與水平捲動 |
| [LifeBlueprintNavigator.tsx](../app/src/components/maya/LifeBlueprintNavigator.tsx) | 固定十二篇、各自 Lucide 圖示、原內容／空狀態、五層與九十天閱讀 |
| [MayaVisualization.tsx](../app/src/components/maya/MayaVisualization.tsx) | 公開本地免費計算、身份卡與圖示目錄／矩陣整合 |
| [mayaVisualization.css](../app/src/components/maya/mayaVisualization.css) | 深藍／紫／金風格、響應式、focus outline、沒有動畫 |
| [mayaVisualization.ts](../app/src/lib/mayaVisualization.ts) | 已有引擎之視覺投影、顏色、點線、矩陣位置與鍵盤移動 |
| [mayaBlueprintAdapter.ts](../app/src/lib/mayaBlueprintAdapter.ts) | empty／invalid／legacy／v2 顯示分流，不授予權限 |
| [maya-visualization-check.ts](../app/scripts/maya-visualization-check.ts) | 260／20／13 映射、SVG、雙語、Adapter tests |
| [maya-visualization-browser-check.ts](../app/scripts/maya-visualization-browser-check.ts) | 36 組瀏覽器尺寸／身份／資料情境、下載、網路監控 |
| 本報告 | 驗收及整合界線 |

### 修改

- [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx)：接入公開／會員視覺化；499 使用版本化 Navigator；199／699 保留原 renderer。依 user＋locale＋report ID 隔離已載入報告；舊請求不能標記成新身份資料。
- [api.ts](../app/src/lib/api.ts)：僅把現有 GET report 的回應型別擴為 v1／v2 union；endpoint、credentials、checkout、報告 POST 邏輯不變。
- [package.json](../app/package.json)：加入兩個本地視覺化測試 script；沒有新增套件。
- [tsconfig.maya-acceptance.json](../app/tsconfig.maya-acceptance.json)：納入新測試型別檢查。

沒有修改 Worker、計算引擎、登入、付款、Secrets、其他命理系統或 D1 migration。既有無關工作樹修改保留。

## B. 完成元件

### GalacticIdentityCard

顯示 KIN、出生日期、太陽圖騰、音調 number／name、代表色。繁中頁補英文名稱，英文頁不混中文。使用裝飾軌道、細線與漸層，明確標示不是天文運行。

SVG 自包含本地幾何／文字／色彩，不使用外部圖片或字型載入；下載不包含 paid report body。PNG 使用 browser Image→Canvas→Blob，1,200×960；失敗明確顯示錯誤。圖片含生日，下載區有隱私提醒，既有不含生日的分享功能維持不變。

### SolarSealIcon／GalacticToneSymbol

圖示可傳 size，手機／矩陣 decorative 模式不重複朗讀；獨立使用有本地化 accessible title，React useId 避免 SVG title 衝突。

### TzolkinMatrix

20 rows×13 columns，每格真實 KIN。cell 至少 52px 寬、62px 高，數字與幾何圖示可閱讀；手機水平捲動而非將格子壓縮到不可讀。出生 KIN 使用金框及文字／`aria-current`，不只依顏色。

每格 accessible label 含 KIN、圖騰、音調及出生狀態。grid／row／gridcell 有列欄索引與 aria-selected；只有目前格子 tabIndex=0。方向鍵依視覺列欄移動，Home／End 到同一列第一／最後欄，Enter／Space 使用原生 button 選取。詳情以 aria-live 通知。

### LifeBlueprintNavigator

12 個 fixed IDs，12 個不同 Lucide icons；原生 details／summary 展開收合、快速導覽會開啟篇章並聚焦 summary。合法 v2 顯示 A～E 原文及九十天三階段。

- legacy：保留原七篇 heading／body，清楚標示未映射至十二篇。
- empty：顯示登入／歷史報告提示，不生成文字。
- invalid：語言／版本／evidence 不相容時明確 alert。
- 不呼叫任何生成 API。元件沒有權限變更工具，也沒有 Mock generator import。

## C. 260 KIN 矩陣驗證

排列依 [Law of Time 13 Moon Calendar Tutorial](https://www.lawoftime.org/thirteenmoon/tutorial.html) 的 Harmonic Module 說明：「top to bottom, left to right；20 之後 21 在下一欄頂部」。

位置公式只計算畫面格子：`KIN = column * 20 + row + 1`，row／column 是零起算。**這不是第二套日期引擎。** 每格圖騰／音調使用既有 `mayaSignature(KIN, locale)`。

- 第一列：1、21、41……241。
- 最後列：20、40、60……260。
- 第一欄：1～20。
- 260 個唯一 KIN；260 個唯一 seal／tone 組合；逐格等於原引擎輸出：PASS。
- 欄位不是固定音調，例如 KIN1 tone1、KIN21 tone8，不能把第2欄標為 tone2。
- 不加入未驗證的 portal、神諭或天文標記；明確稱為 Dreamspell 現代矩陣，不冒稱傳統馬雅曆日期計算。

## D. 20 圖騰及 13 音調

### 圖騰來源與代表色

未找到專案內可確認來源／授權的完整二十圖騰資產。本次全部為新寫的抽象 SVG path，穩定 ID `solar-seal-1`～`solar-seal-20`；**不是傳統馬雅符號或官方 Dreamspell glyph 複製品**。各頁與身份卡有清楚說明。

名稱直接使用既有 `DREAMSPELL_SOLAR_TOTEMS`。代表色按既有名稱 Red／White／Blue／Yellow 循環投影；測試逐一確認 number 與英文名稱的顏色一致。

### 點線規則

原資料已有 1～13 number／中英 name，但沒有 SVG 規則。點=1、橫線=5，number1～13 使用 `dots=number%5`、`bars=floor(number/5)`，點在橫線上方。

數字點線表對照：[The 13 Numbers of the Tzolk'in and Dreamspell aliases](https://mayanastrologycalculator.com/galactic-tones)。這裡只引用數字表示／Dreamspell 名稱對照，**沒有使用該網站傳統曆法計算替代本專案引擎**。Law of Time 教材的最初五 KIN亦顯示對應 1～5 音調。

1=1點、5=1線、10=2線、13=3點＋2線；全13項 `dots+5*bars=number`：PASS。

關鍵字保留既有 tone.keyword，繁中新增對應翻譯；明示為既有編輯反思標籤，不宣稱是官方完整三關鍵字組或心理診斷，沒有改寫原資料。

所有 20 圖騰、13 音調各於 24／96px、兩語言 SSR 測試名稱、unique path、SVG尺寸、點線數量：PASS。

## E–F. 中英文與尺寸測試

|  | 390px 手機 | 768px 平板 | 1440px 桌面 |
|---|---|---|---|
| zh-TW：public／unpaid／legacy／v2／forbidden／anonymous | 6 PASS | 6 PASS | 6 PASS |
| en：public／unpaid／legacy／v2／forbidden／anonymous | 6 PASS | 6 PASS | 6 PASS |

共 36 case PASS：

- 完整 260 cells、唯一 roving tab stop、選取詳情、Arrow／End／Enter。
- matrix cells ≥44×44px，元件邊界不超 viewport。初版 Grid auto min-width 造成裁切，已改 minmax(0,1fr)／min-width:0，重跑通過；沒有以 body overflow:hidden 掩蓋檢查。
- 公開日期1987-07-26→KIN34、2/29明確拒絕、不發 profile／report request。
- 12章 fixed IDs、快速導覽、聚焦、Enter收合、3計畫階段。
- 英文 main 不含中文敘述（既有語言切換按鈕「繁體中文」除外）。
- 每語言390px實際下載SVG／PNG，檔名、SVG KIN／日期、不含付費欄位、PNG signature均PASS。
- 瀏覽器沒有未處理 pageerror。使用本機 Chrome headless；人工 screen-reader 實測 NOT RUN，沒有宣稱取得完整 WCAG 認證。

截圖／JSON 結果放在 session artifacts，不寫入正式資料庫／repo付費內容。可用 `MAYA_VISUAL_ARTIFACT_DIR` 指定測試輸出位置。

## G. 付費權限隔離

| 驗證 | 結果與證據 |
|---|---|
| 公開訪客 | PASS：不讀取私人 profile／report，十二篇僅空狀態 |
| 未登入私人頁 | PASS：導往既有本地化 login，不讀私人 API，不顯示報告 |
| 已登入未購買 | PASS：無完整報告內容；不是 CSS 隱藏 paid JSON |
| 合法舊499 | PASS：只讀既有七篇、無重生成，十二篇明確尚無新版內容 |
| 合法v2展示 | PASS：retrieval fixture顯示原十二篇／計畫；不發生成request |
| 跨會員／拒絕回應 | PASS：403不顯示付費文本；由已讀v2路由切到另一人ID亦清除舊內容 |
| 真實後端本地D1隔離 | PASS：5個既有Miniflare tests驗證匿名／偽造／expired Session、本人profile、未付款／錯商品／偽造授權、三商品Mock儲存、另一會員／撤權／退款／過期／語言拒絕 |
| 正式Google登入／正式已付款v2 | NOT RUN：本輪沒有正式操作；後端未產生v2，不能宣稱正式v2端到端已通過 |

UI測試使用明確本地 auth／retrieval fixtures，不是 Mock登入冒充真人Google驗收。v2 fixture使用Phase1編輯Mock，只在測試script，不內嵌公開頁或正式bundle作付費解讀。

購買、正式AI生成及管理者免費生成原功能不變；測試沒有點擊其按鈕。199／699原商品／權限／顯示流程不變，後端三商品回歸PASS。

## H. AI 次數與效能

**本次 AI API 呼叫：0。**

所有瀏覽器測試攔截外部網路；任何非analytics POST將測試失敗，OpenAI／admin generation等路徑另外計數。36 cases：非analytics API POST=0、AI calls=0。

既有登入頁 `/api/track` analytics 由測試攔截並本地回覆，未寫正式資料；不把analytics誤認為AI。Miniflare回歸使用Mock provider與全新本地D1，費用0。

公開KIN計算、SVG、點線、矩陣、下載全部本地執行。展開導航不重計AI文字、不POST、不fetch新報告；報告只在原路由／身份／語言變動時由既有API讀取。

矩陣模組保留260格canonical lookup，無260次網路請求；圖示共用React元件，不載入外部圖片，不增加依賴。

## I. DB 變更

**本階段不需要 DB 變更。** 沒有新D1表、migration檔、正式讀寫、會員或訂單修改。測試D1為一次性Miniflare。

未來若要讓Worker正式生成／儲存十二篇，仍須依Phase1提案另行審核v2 section store與成本／重試／版本分流；本次沒有執行或繞過原0～6 section限制。

## J. 驗證總表與部署條件

| 命令／範圍 | 結果 |
|---|---|
| Frontend／Worker TypeScript | PASS |
| `typecheck:maya-acceptance` | PASS |
| 修改Dreamspell檔案與新測試 scoped ESLint | PASS |
| Production Build | PASS；45路由prerender／SEO／sitemap／noindex PASS |
| 新視覺化＋引擎＋兩參考測試 | 13 tests PASS |
| `test:maya-visualization-browser` | 36 cases PASS |
| 既有本地D1權限／報告回歸 | 5 tests PASS |
| `test:maya-routes` | PASS；含四大命理入口及生命靈數固定回歸 |
| VS Code Problems | 無相關錯誤 |
| 正式部署／真人交易／付費AI | NOT RUN |

Build保留既有大型bundle warning（約1.44MB未壓縮／547.5KB gzip）；本輪未改全站切包。Dev test亦遇到既有LINE圖檔public import警告；Production Build正常。沒有為解決無關警告修改其他命理或全站配置。

### 部署準備判定

- **僅視覺化與舊版相容前端：本地技術驗證通過，可交由使用者確認是否部署。**
- **正式完整十二篇交付：尚未具備端到端條件。** Worker v2生成／儲存與真人已授權報告驗收尚未完成，不得把這個前端版本宣稱為正式十二篇生成已上線。
- 工作樹包含先前未提交且已部署過的變更，不能直接push main或盲目部署整個工作樹；後續須以已核對的release allowlist／版本及回滾流程處理。
- 本輪沒有commit、push、Cloudflare部署、正式D1操作、Secrets修改、真實扣款或付費AI。

開發驗證已完成；等待部署確認。
