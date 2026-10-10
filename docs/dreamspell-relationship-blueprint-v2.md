# Dreamspell 雙人星際共振・靈魂關係藍圖 V2

## 商品文案與手機展示優化（2026-10-10，已正式發布）

- 保留中文名稱「雙人星際共振・靈魂關係藍圖」，副標題「看見彼此的特質與需要，探索更理解、更有共鳴的相處方式。」；英文採自然的關係探索文案。一般消費者不顯示商品內部 ID、歷史 699 權益說明或技術流程。
- 完整報告開放時凸顯 12 大關係解析、雙人星際共振圖、五大神諭、生命波符比較、A／B／共同視角及 90 天共振計畫。未開放或 config 失敗時不宣稱功能可交付，保留未開放提示及既有 access-only 同意流程。
- CTA「解鎖雙人關係藍圖 · NT$899」／「Unlock Our Relationship Blueprint · NT$899」，價格從 [既有商品設定](../app/src/lib/mayaRelationship.ts) 讀取；未改商品、綠界金流、D1、AI API、會員權限或歷史訂單／權益。
- 首頁與專用頁重用 [文案](../app/src/lib/mayaPremiumCopy.ts)／[商品介紹](../app/src/components/maya/MayaPremiumProductIntro.tsx)，手機先顯示名稱、價值、價格、CTA。專用頁首屏 CTA 只捲至原出生資料／同意表單，不觸發付款或生成；管理者／既有權限狀態不变。
- 保留簡短自我探索與非科學預測說明；新增 [商品文案測試](../app/scripts/maya-premium-copy-check.ts)。開發當時未發布，後依使用者「PUSH 部署」明確授權正式發布。下方為歷史紀錄。
- PASS：TypeScript、相關 ESLint、production Build／45-route SEO；30 個文案與首屏案例、56 個按鈕／商品／gate、76 個解鎖返回／管理者／所有權、48 個完整報告 UI、36 個既有 Pro 模式、24 個雙人付款同意／表單案例。完整12篇／15篇與快取閱讀以本地 fixture 驗證；真實 AI／付款 0。
- 首次並行 Vite 回歸遇到載入／狀態等待逾時，逐套完整重跑通過；既有 public asset／大型 bundle／部分關閉導頁 proxy 警告仍保留，不將模擬測試稱為真實會員／金流驗收。
- 已 push main；正式程式 commit `355f1aa5f9ccfefbff037213cb15d9451102e225`，Pages deployment `d1dd13b7-dea3-4dc4-a79e-0e53f03f39f1`。隔離來源只更新六個商品展示檔案，未包含無關 GA4／Vedic 變更，以 `[skip ci]` 避免重複部署。
- 正式 30 個雙語／三尺寸首頁及兩商品頁檢查 PASS，實際 config 確認可交付狀態；會員／管理者身分／資料／權益明確 synthetic，驗證新特色、CTA、價格、首屏、隱藏 ID 与無水平溢出，不宣稱真人付款／生成驗收。AI／付款／資料寫入 0。
- 保存 380 source／63 dist hashes 並比對正式 JS SHA256 一致；Worker deployment／bindings、D1 schema／ledger／counts／content／管理者訂單數與發布前相同，未部署 Worker、未 migration 或改 Secrets。

## 最新更新：單次付費解鎖、自動生成（2026-10-10）

付款前確認兩人生日、關係類型及同意，按「付費解鎖 · NT$899」；同分頁返回並取得後端已驗證的同訂單 paid／有效權限後，自動生成十二篇報告與 90 天計畫，不再要求第二個生成按鈕。管理者免費、舊 NT$699 權益、三種視角、中文 500 字上限、成本／快取／所有權防護不變。生日變更、錯誤訂單或未知失敗不自動生成／重試，不重複付款。

Worker version `b5ff91aa-b922-47b0-9720-f5bc525468b1`、Pages `5fd76a70-b6cb-4179-be4f-c44f4d26c410` 已部署；76 新流程、既有回歸、types／lint／build 與正式 42 UI／匿名隔離 PASS。無 migration、Secrets／金流改動或 commit／push；本輪實際 AI／交易 0，真人正式付款＋生成 NOT RUN。須保持返回頁開啟，這不是伺服器背景生成。詳見 [四方案最新解鎖流程](dreamspell-production-ecpay-installation.md)；下方為歷史紀錄。

## 最新更新：指定管理者免費正式生成（2026-10-10）

`wadehuang77@gmail.com` 經後端有效 Session 與 D1 email 雙重確認，可免 NT$899 商品費使用雙人報告；仍需本人與對方出生資料、關係類型及同意。管理者 grant／零金額訂單按商品獨立，不解鎖其他會員或錯用個人 Pro 權限。普通會員 NT$899 與歷史 NT$699 權益不變；不呼叫綠界。讀取／繼續重驗管理者資格，保留十二篇、雙方／共同視角、90 天計畫、500 字上限與成本／快取防護。

Worker version `9ff45559-8d8b-411f-bfab-21a762fc076c`、Pages `3536adb0-046f-4b27-9523-3ef6d814868d` 已部署；schema／ledger／資料計數與 bindings 完全不變，無 migration。管理者兩商品完整 Mock 與權限撤銷／冒用、既有付費回歸、36 UI＋4 catalogue、types／相關 lint／build PASS；正式 24 個 synthetic 會員 UI 與匿名隔離 PASS。真人管理者 Live 生成 NOT RUN，本輪 AI／付款 0。程式為未提交 Dreamspell-only overlay，未 commit／push。詳見 [管理者最新狀態](dreamspell-admin-preview.md)。

最新發布授權：使用者明確接受現有驗證範圍，要求直接正式開通Pro與雙人生成、套用030、commit／push／部署；不要求再等待真實中文十二篇完整重驗。500字上限與其他內容／成本／權限檢查維持，未完成驗證不改稱PASS。詳見 [正式直接開通授權](dreamspell-soul-mission-pro-699.md)。

已正式開通：程式 `cda1f7e`、Worker version `12195bfa-646c-4311-a319-092d12bfc3be`、Pages `e14abcde-d901-4ebe-9cf5-6a795e080c8c`；030套用成功。正式雙人 `payment=true/reportAvailable=true`，Pro `payment=true/liveAi=true`。中英文三尺寸public與24個synthetic會員UI檢查PASS，匿名GET／POST授權隔離PASS。取消下限後真實完整中文12篇仍NOT RUN，本次部署AI呼叫0，不宣稱此驗收PASS。

## 最新品質規則修訂（2026-10-10）

依使用者指示，取消**雙人中文**章節的350漢字硬性下限：349字可接受，350～500字僅為撰寫目標，500字上限仍保留。Worker逐章驗證、完整報告Schema、初始Prompt與品質重試提示同步調整，不再因中文總字數不足而拒絕或要求補字。完整章節、A／B／共同視角、生活情境／提問／行動、90天計畫、已驗證資料、重複內容與安全檢查維持。英文120～450字及個人Pro字數規則不變。

新增精確349字與300字接受、超過500字／空白視角拒絕、英文／Pro下限不變測試；雙人中文十二篇的本地生成／儲存測試使用第8篇349字內容。這是本地規則變更，不將先前未完成十二篇的真實AI驗證改標PASS，也不重置已blocked的job。本次不呼叫AI、不執行migration030、不自動部署／commit／push；正式開通仍需完成十二篇驗證。

本次驗證：上述3組相關測試PASS（包含十二篇本地生成完成與第8篇349字），Worker測試typecheck／相關ESLint PASS，App typecheck／相關ESLint／production build及45route SEO PASS。既有bundle大小warning不影響建置成功。本輪新增AI呼叫0，正式功能開關未改。

報告全面開通驗證（2026-10-10）：本輪真實雙人英文12篇PASS，但中文第8篇3次嘗試後349漢字，低於350下限，**FAIL／BLOCKED**。使用者授權條件為全部通過才開通，因此正式報告生成仍false、migration030未套用、新包未部署；本輪70次request attempts與保守NT$3.302657預算記錄詳見 [全面開通驗證與限制](dreamspell-soul-mission-pro-699.md)。沒有降低字數要求或以Mock宣稱完成。

最新狀態（2026-10-10）：使用者明確接受只購買權限，授權migration031與部署；NT$699 Pro及NT$899雙人付款均開通，深度報告生成仍關閉。正式Worker version `9cc4240a-d175-42aa-86b4-6dd94e9774e1`、Pages `9ae41ab1-c73b-42d0-b646-5c6c8be570a3`。双人告知／勾選仍保留；本次未操作真實checkout或扣款。詳見 [最新權限付款驗證與限制](dreamspell-soul-mission-pro-699.md)。

後續 commit／push／部署授權：使用者選擇只發布Dreamspell程式，保持未通過功能關閉，不開放十二篇報告。NT$899維持既有「僅購買權限」狀態，migration030／031本次不執行。詳見 [Pro關閉功能發布記錄](dreamspell-soul-mission-pro-699.md)。

關閉功能版本已正式部署：Worker `f88d83dd-b8a4-466b-aadc-2216f0b9ef2b`、Pages `24ad6f94-de88-41a2-8e8d-e9dd205dbd95`。正式中英文390px／1440px測試PASS，後端價格899／付款true／報告false，匿名報告與權限API 401。正式schema與ledger沒有變動。本次未建立真實交易、未呼叫AI；中文Live品質仍BLOCKED，不宣稱十二篇已正式交付。

## 最新續作：十二篇與雙人視覺已實作，繁中Live品質驗證未通過

新增固定十二篇：

1. `shared-identity`：雙人星際身份與相遇。
2. `communication`：溝通與理解。
3. `emotional-needs`：情感需要與安全感。
4. `support-and-talents`：互補天賦與支持。
5. `tension-and-repair`：差異、張力與修復。
6. `boundaries`：親密與個人界線。
7. `cooperation`：共同目標與合作。
8. `shared-resources`：金錢與共享資源。
9. `oracle-dialogue`：五大神諭的雙人對話。
10. `wavespell-comparison`：生命波符與成長步調。
11. `shared-care`：共同照顧與關係整合。
12. `ninety-day-resonance`：90天雙人共振計畫。

這是基於已提供功能要求新增的設計，不宣稱找到了不存在的先前完整規格。每篇有伺服器驗證兩人依據、深層解析、不同A／B／共同視角、情境、提問、行動；計畫三階段各三個行動與三個問題。關係類型為伴侶／朋友／家人／同事，Worker要求明確consent；生日與資料保存沿用原本人profile API。

新增／修改主要檔案：

- `app/src/lib/mayaRelationship.ts`：版本、十二篇ID、關係類型、雙人證據與嚴格雙語Schema／品質驗證。
- `app/src/components/maya/MayaRelationshipReportView.tsx`：雙身份卡及本地SVG／PNG下載、雙標記260矩陣、同位置五大神諭SVG比較、13階段波符對照、章節圖表、三視角切換與90天計畫。
- `app/src/components/maya/MayaPremiumReportManager.tsx`：出生資料／同意／關係表單、明確生成、進度、歷史與已儲存內容。
- `app/src/pages/MayaRelationshipPage.tsx`、`MayaProPage.tsx`、`app/src/lib/api.ts`：以後端正式交付flag控制介紹、付款提示與閱讀介面，flag關閉保留先前權限付款說明。
- `worker/src/mayaPremiumLive.ts`、`mayaRelationship.ts`、`mayaPro.ts`：正式生成、儲存、權限重查、成本預留與有限品質修訂。
- `d1/migrations/030_maya_premium_live_reports.sql`／`031_maya_pro_payment.sql`：additive計畫，本次未正式套用。
- `worker/scripts/maya-premium-live-check.ts`、`maya-premium-provider-check.ts`、`app/scripts/maya-premium-live-browser-check.ts`：離線、明確opt-in真實provider、48組瀏覽器驗證。
- `app/src/lib/mayaRelationshipFixture.ts`：只供離線測試的合成文字，沒有被正式頁面或生成器import；日期與KIN仍用真實引擎。

五大神諭「交互」只比較兩人已驗證相同位置，不新增合盤KIN、相容分數或配對公式。波符比較也不是歲數或關係發展預測。公開未授權頁面不取得完整JSON。

**本地實作及離線驗證PASS；完整正式發布BLOCKED。**真實OpenAI英文十二篇已成功，但繁中最後一次第十一章三次修訂後仍340中文字，未達350字門檻，因此沒有發布新Worker／Pages或執行030／031。詳細成本、生成防護及全部驗證見 [Pro最新續作](dreamspell-soul-mission-pro-699.md)。

正式 `reportAvailable=false`保持不變，舊權限付款狀態仍存在；不可把「本地視覺／Schema完整」宣稱為繁中完整報告正式上線。沒有真人扣款、實際退款、正式訂單修改、commit／push。以下初始功能表的「尚未實作」為歷史，已由本節取代；正式交付尚未開啟。

最新發布授權（2026-10-10）：補齊完整雙人報告與正式生成、全部自動檢查通過後，自動 migration／部署／對外開放，不再等待人工驗收。詳見 [Phase 1–4 自動正式上線規則](dreamspell-phases-1-4-release-rules.md)。以下權限付款部署狀態不等於十二篇報告交付完成。

## 後續正式授權更新：NT$899 權限付款已開啟

2026-10-10 18:34（Asia/Taipei）。使用者另行確認授權：新增獨立三表、部署 Worker / Pages，向全部登入會員開啟 NT$899 真實付款；接受目前**僅買商品權限，沒有十二篇報告交付**。以下更新取代初始驗收中「未部署／未 migration／付款關閉」的現況；初始記錄保留為歷史。

| 項目 | 實際結果 |
|---|---|
| Worker deployment | `a56c764a-630a-44d0-a1bd-b128b5c9ec8c` |
| Worker version | `94f56401-ba2e-4672-ae9a-3332a77eaa87` |
| Pages deployment | `2efa8c68-2d18-4034-b484-60239ce7fa23` |
| Pages URL | https://2efa8c68.bolt-tarot-5ek.pages.dev |
| `MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED` | true |
| 個人 Pro payment / local Mock | false / false |
| Sandbox | false |
| 新雙人 `reportAvailable` | false，仍無十二篇報告 |
| 正式 D1 | 只新增 `029_maya_relationship_v2_payment.sql`；025/027/028未重跑，沒有026 |

正式操作入口：

- 中文：https://www.crystalfield101.com/maya-calendar/relationship
- 英文：https://www.crystalfield101.com/en/maya-calendar/relationship

首頁「綠界付款 · NT$899」進入專屬頁；未登入先回現有登入，登入後返回原語言頁。會員需勾選了解「真實扣款／權限而已／報告未交付」，再按付款按鈕，另一次 confirm 才請求 checkout 並提交綠界表單。權限讀取未成功時按鈕維持停用，不以錯誤預設值開放。已有權限時不能從頁面重複購買。沒有自動續扣。

正式 ReturnURL：`https://api.crystalfield101.com/api/maya/payments/callback`。OrderResultURL：`https://api.crystalfield101.com/api/maya/payments/result`。ClientBackURL / result 依訂單語言導回專屬頁，`maya_order`僅用於本人後端狀態查詢，不能授權。十二篇生成 API 仍明確503，不提供Mock付費替代。

正式變更驗證：

- 獨立發布包 App / Worker typecheck、Build、45 route SEO PASS；基底為前次正式 isolated release，未發布其他工作樹 Vedic / provider 變更。
- checkout UI 本地24 cases PASS：中英文 × 390/768/1440 × 匿名/未購買/已購買/關閉；6次表單完全攔截，沒有送往綠界。
- migration029同一檔案本地付款/舊699/Pro隔離測試 PASS。
- 正式HTTPS4 cases PASS：中英文 × 390/1440，NT$899按鈕可用、既有登入導回與限制說明正確；**真人登入後付款、官方有效callback、實際扣款 NOT RUN**。
- 正式config確認899 / payment=true / reportAvailable=false；Pro payment=false / liveAi=false。
- 匿名 relationship entitlements/reports、profile、checkout config 均401。
- migration ledger只有029新增；既有兩庫schema逐筆不變，cards schema hash不變，既有binding名稱/類型與安全功能變數不變。
- 正式外鍵檢查空；既有會員／訂單／Maya報告aggregate與部署前相同；新899訂單、權限、退款調整筆數全部0。
- Exact release塔羅recurring / one-time / idempotency / entitlement及subscription回歸 PASS。
- Agent沒有建立正式checkout、提交信用卡、支付、實際退款或付費AI；真實綠界與AI呼叫0。正式開关是「允許會員自行付款」，不是付款驗收已成功。

來源與回滾：

- Git HEAD仍 `305119fa6c94b2a50ac1e58551b0ca2c8c578fe5`；未commit/push。Pages附帶此SHA作基底標記，**不代表SHA包含所有發布內容**。
- Session artifact `relationship-release-final-manifest.json`記錄365 source/config hashes、63 dist files；不可直接以dirty工作樹或僅HEAD取代此發布包。
- 回滾 Worker version：`5e9a89b7-19b5-4d0f-ba7f-4b44d7914317`，Pages：`664af20c-df2a-4f6f-bc13-ee16c5ba2342`。
- migration前Time Travel bookmark：`00001403-00000000-00005100-34eba5b6d855ed818a7a1479561f7f0c`，只作事故還原參考，本次沒有restore。
- 一般回滾保留新增表與付款紀錄；不能drop表、刪單或自動還原整個D1。若已有在途付款，關閉開關也會阻擋callback，須先核對交易與通知、安排停用與補處理，不能直接退回不支援899的版本。

新增/修改：正式migration029、MayaRelationshipPage知情勾選/確認/付款/狀態、首頁899付款入口、api client語言、wrangler明確獨立flag、離線relationship checkout瀏覽器測試。Secrets / OAuth / 既有訂單金額沒有更改。

**可以由使用者本人進行 NT$899 商品權限付款測試；完整雙人報告仍未完成，不宣稱可交付十二篇內容。**

## 本次確認範圍

使用者本次選擇：**先完成獨立 NT$899 商品、價格與權限相容；如實列出十二篇及雙人視覺尚未完成，待提供原始規格再開發。**

稽核沒有找到所稱「上一份完整雙人開發規格」、十二篇雙人章節定義、關係類型或 V2 Schema。既有雙人產品是七段舊報告，不能冒稱十二篇新版已完成。沒有刪除既有功能；尚不存在的功能列為待開發。

本次全程本地；沒有真實付款、正式 Secrets 變更、正式功能開關變更、正式 D1 migration、部署、付費 AI、commit 或 push。稽核與 SQL 均針對工作樹及獨立 Miniflare，未讀寫其他正式會員資料。

## A. NT$899 商品 ID 與商品區隔

| 商品 | 代碼 | 價格 | 狀態 |
|---|---|---|---|
| 個人完整生命藍圖 | `MAYA_FULL_499` | NT$499 | 原內容、訂單及權限不變 |
| 個人星際靈魂使命藍圖 Pro | `MAYA_SOUL_MISSION_PRO_699` | NT$699 | 原獨立定義、Mock / 本地權限及 gated checkout 保留 |
| 雙人星際共振・靈魂關係藍圖 | `MAYA_RELATIONSHIP_899` | NT$899 | 新獨立商品；購買與十二篇報告未開放 |
| 歷史雙人報告 | `MAYA_RELATIONSHIP_699` | NT$699 | 舊訂單 / 七段報告 / 有效權益保留；不建立新的正式舊商品訂單 |

新英文商品名稱：**Galactic Relationship Blueprint**。

前一次尚未部署的工作樹曾讓 `MAYA_RELATIONSHIP_699` 建立 NT$899 新訂單。本次改為真正獨立 ID：舊代碼恢復 NT$699，只有新代碼接受 NT$899，不再讓兩個金額共用舊商品。未將任何正式歷史金額覆寫為 NT$899。

## B. 價格修改與串接位置

| 檔案 | 修改 |
|---|---|
| [mayaRelationship.ts frontend](../app/src/lib/mayaRelationship.ts) | 唯一新商品常數：代碼、899、中英文名稱 |
| [maya.ts frontend](../app/src/lib/maya.ts) | 歷史商品維持699；歷史訂單金額映射不接受899 |
| [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx) | 首頁新增899商品；舊699卡僅向有效購買者 / 原管理者顯示，不提供新付款；499與Pro699保留 |
| [MayaRelationshipPage.tsx](../app/src/pages/MayaRelationshipPage.tsx) | 中文 / 英文獨立介紹、899價格、開發限制與停用購買按鈕 |
| [App.tsx](../app/src/App.tsx) | `/maya-calendar/relationship` 與既有機制產生的 `/en/maya-calendar/relationship` |
| [_headers](../app/public/_headers) | 新頁 noindex |
| [api.ts](../app/src/lib/api.ts) | 新 config / entitlements client；checkout product union 支援獨立899 |
| [mayaCheckout.ts](../app/src/lib/mayaCheckout.ts) | 綠界 form：899代碼只能899、歷史699只能699、個人Pro699只能699 |
| [mayaPayments.ts](../worker/src/mayaPayments.ts) | 新商品白名單、金額、獨立 metadata / grant / adjustment tables、雙語導回、冪等及退款撤權 |
| [mayaRelationship.ts Worker](../worker/src/mayaRelationship.ts) | 商品 config、本人有效899權限查詢；新版報告明確拒絕生成 / 讀取 |
| [maya.ts Worker](../worker/src/maya.ts) | 新 relationship route delegation；舊報告與授權維持 |
| [utils.ts](../worker/src/utils.ts) | 可選 `MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED` 型別，未設定為關閉 |
| [local SQL plan](../d1/maya-relationship-v2-local-schema.sql) | 獨立899資料表及 CHECK，僅本地測試 |
| [payment tests](../worker/scripts/maya-production-check.ts) | 新899、舊699及商品隔離案例；歷史 fixtures 不由 public API 建立 |
| [Pro tests](../worker/scripts/maya-pro-check.ts) | 歷史商品常數699相容 |
| [Pro browser tests](../app/scripts/maya-pro-browser-check.ts) | 商品金額互換必須拒絕，Pro付款表單本地攔截 |
| [visualization browser tests](../app/scripts/maya-visualization-browser-check.ts) | 新899首頁價格 / 中英文名稱 / 介绍頁 / disabled購買，既有視覺回歸 |

後端新商品金額由程式控制，沒有接受前端傳入金額。Callback 的 `TradeAmt` 必須同時吻合原訂單與商品定價。不是僅改顯示。

## C. 舊 NT$699 訂單與 D1 相容性

稽核發現：

- 原 `MAYA_PRODUCTS`、`MayaProductCode`、報告 type、舊 entitlement CHECK 都包含 `MAYA_RELATIONSHIP_699`。
- 原 migration 025 / 027 限定三種舊商品；直接把899塞入原 entitlement / metadata 表會違反 CHECK。
- 原雙人報告需要本人 personal profile 與 relationship profile；D1 / JSON 仍為舊七段報告，不是十二篇 V2。

策略：

1. 保留原三商品 Schema 與 IDs，不重建、覆寫或重新套用025 / 027。
2. 新商品只使用獨立 additive：
   - `maya_relationship_payment_orders`
   - `maya_relationship_entitlements`
   - `maya_relationship_payment_adjustments`
3. 新表 CHECK 只允許 `MAYA_RELATIONSHIP_899`；使用原 orders / profiles 外鍵，現有會員身份不變。
4. 原699新 checkout 回409 `LEGACY_PRODUCT_RETIRED`；若有本人既有 pending order + idempotency key，仍返回原699表單並驗證回呼。有效 paid 權益仍可生成 / 讀取舊報告。
5. 歷史 fixture 驗證：原金額699未變、wrong amount899拒絕、正確699 callback成功、舊七段生成成功、本人可讀、其他會員不可讀。
6. 新899 callback只授予新表權限，不增加499、Pro或舊699 grants。退款 / 撤權沿用驗證與記帳模式，**不執行實際退款**。

正式 D1 計畫尚未套用：

- SQL 位於 auto migration 目錄之外，僅 fresh local Miniflare 執行。
- 正式作業前須審核 additive migration、D1 ledger / schema、Time Travel 與 rollback；預設新 flag 關閉。
- 開啟新 flag 前必須先完成表格與報告交付；缺少資料表會明確失敗，沒有退回舊商品表的替代授權。
- 依原規格補齊十二篇與關係類型後，另提 report schema / tables，不預先猜測付費 JSON。

## D. 十二篇報告與視覺化完成度

| 功能 | 本次狀態 | 事實 |
|---|---|---|
| 雙人生日與關係類型表單 | PARTIAL / BLOCKED | 舊會員頁可儲存兩人生日與同意提醒；新版關係類型及專屬表單尚無規格 |
| 雙人 KIN 身份卡 | BLOCKED | 單人卡 / 引擎可重用，尚未建立新版雙人呈現 |
| 雙人260矩陣 | BLOCKED | 單人260矩陣已驗證，雙標記尚未整合 |
| 五大神諭交互圖 | BLOCKED | 單人 oracle 全260已驗證；兩人交互規則與視覺尚未定義 |
| 13階段波符比較 | BLOCKED | 單人20波符已驗證；雙人比較尚未整合 |
| 十二篇雙人解說 | BLOCKED | 舊版只有七段，尚無十二篇固定ID / 主題 / Schema |
| 各章圖表與解說整合 | BLOCKED | 無新版十二篇契約，未造假內容 |
| 90天雙人共振計畫 | BLOCKED | 個人版計畫存在；雙人方案需原規格 |
| A / B / 共同關係視角 | BLOCKED | 尚未實作，不以交換姓名模擬完成 |
| 中英文 | PARTIAL | 新商品介绍 / 價格 / 錯誤與舊報告雙語；新版深度內容未完成 |
| React / SVG | PARTIAL | 既有單人元件可重用；新版配對圖未完成 |
| 付費權限隔離 | PASS（本地） | 新舊商品授權不互通；完整報告未開放 |
| Prompt / Schema / 成本控制 | BLOCKED | 個人版可參考，但不冒用其Prompt作雙人V2；本次0真AI |

這些項目未刪減，只因原始完整規格未提供而保留待開發。NT$899不是將七段舊報告重新貼價；不存在的完整內容不交付、不隱藏於CSS。

## E. 商品權限與付款測試

本地 Miniflare + synthetic Session / merchant / callback，不是真Google、官方付款或正式會員驗收。所有外部 provider 以本地 intercept 處理；沒有真實AI或綠界交易。

- 新899、歷史699、499、Pro699商品及金額一致性。
- 原699禁止新正式訂單，但歷史pending retry與paid reports可讀。
- 新899 / Pro / 原商品共用冪等 key 不應建不同商品訂單；原保護沿用。
- 同會員已買499及Pro仍沒有899權限；899 grant不能提交499、Pro或舊699報告。
- 未登入899私人端點401；另一會員不取得本人899 grant。
- 到期 / 撤權 / 退款後不返回active權限，晚到callback不可重新授權。
- 瀏覽器result只是303返回，不授權；只有正確amount / signature / merchant / order Callback授權；重複通知只有一筆grant。
- 新版完整報告所有讀取 / 生成回503 `RELATIONSHIP_REPORT_UNAVAILABLE`，不提供假內容。
- NT$499原十二篇Schema、Pro699原十五篇Mock與所有260配置回歸。

功能開關：`MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED` 默認未設定即關閉。測試只在合成 production Env 使用true，**沒有改正式 Worker 設定**。前端新商品始終停用購買，因尚無報告交付。

## F. 中英文與驗證

| 檢查 | 結果 |
|---|---|
| App / Worker TypeScript、測試型別 | PASS |
| 相關 ESLint | PASS |
| Production Build / 45 route SEO | PASS |
| 新899 + Pro付款離線測試 | PASS |
| 完整離線payment / provider回歸 | PASS：15 tests；provider回應均攔截，未呼叫付費AI |
| 原499十二篇Schema | PASS：3 tests，六組KIN × 雙語 |
| KIN / SVG / 日期來源回歸 | PASS：13 tests |
| Pro規則 / Schema / 本地D1回歸 | PASS：5 tests，260 KIN × 2語言 |
| 新899介紹與原視覺頁面 | PASS：36 cases，zh-TW/en × 390/768/1440px × 6狀態 |
| Pro頁 / checkout表單映射 | PASS：36 cases，6個表單完全本地攔截 |
| 真實AI / 圖片生成 / 綠界交易 | 呼叫數0 |
| 十二篇雙人內容 / 雙人圖表 | BLOCKED：待原始完整規格 |

英文新商品頁沒有中文正文（語言切換名稱除外）；中文名稱與899顯示均驗證。新版「即將開放」按鈕停用；原視覺全260 mapping、鍵盤、下載與原入口沒有破壞。既有bundle大小與LINEasset警告未擴大本次範圍修改。

## G. 是否具備部署條件

**不能把新版雙人商品當作完整付費產品部署或開啟收費。**

價格、獨立ID、付款/授權本地整合與舊699相容已完成；十二篇雙人規格 / Prompt / 圖表 / 90天方案與真實報告交付仍缺少。待使用者提供原始完整規格，再完成設計與測試，之後另行審核正式additive migration及部署。

本次停止，等待確認；沒有正式付款、AI、正式D1 migration或部署。
