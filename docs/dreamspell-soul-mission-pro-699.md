# Dreamspell 星際靈魂使命藍圖 Pro：本地開發與驗證

## 商品文案與手機展示優化（2026-10-10，本地未發布）

- 中文名稱保留「星際靈魂使命藍圖 Pro」，副標題改為「探索你的天賦與生命方向，把對自己的理解化為日常行動。」；一般消費者不再看見內部商品 ID、權限實作或自動生成流程說明。
- 開放狀態下呈現 15 大生命解析、個人星際身份圖、五大神諭、13 階段生命波符及 90 天生命實踐計畫。完整報告功能以既有狀態判定；未開放／尚未驗證時不呈現已可使用特色，保留僅購買權限的警告。
- 中文 CTA「解鎖我的星際生命藍圖 · NT$699」／英文「Unlock My Galactic Life Blueprint · NT$699」。金額一律由既有 [商品設定](../app/src/lib/mayaPro.ts) 讀取；管理者／已購／繼續生成狀態文字保留。
- [共用商品文案](../app/src/lib/mayaPremiumCopy.ts) 與 [介紹展示](../app/src/components/maya/MayaPremiumProductIntro.tsx) 同步套用首頁／會員介紹及專用商品頁；手機先展示名稱、核心價值、價格與 CTA，再展示特色。專用頁首屏 CTA 只捲至既有出生資料表單，不付款或生成；表單原操作不變。
- 保留 Dreamspell 非傳統馬雅曆法、非科學預測之簡短說明。付款／權限／歷史訂單／報告生成／快取／D1／AI API 邏輯不變。本輪不自動 commit／push 或部署。
- 新增 [中英文商品文案測試](../app/scripts/maya-premium-copy-check.ts)，並更新直接相關既有介面 selector；下方既有發布記錄保留。
- PASS：TypeScript、相關 ESLint、production Build／45-route SEO；30 個新文案／首屏／未開放與 config 失敗案例、56 個按鈕／商品／AI gate、76 個付費返回／管理者／所有權案例、48 個完整報告閱讀／生成 UI、36 個既有 Pro 模式、24 個雙人付款同意與表單案例。測試付款／生成採本地攔截，真實 AI／付款 0。
- 首次並行 Vite 瀏覽器回歸出現頁面載入／商品狀態等待逾時；改為逐套執行後完整通過。既有 LINE public asset／bundle 大小與部分導頁關閉時 proxy 警告保留，未宣稱真人登入或正式付款驗收。

## 最新更新：單次付費解鎖、自動生成（2026-10-10）

先確認個人出生資料，按「付費解鎖 · NT$699」付款；同分頁返回後，後端確認本人訂單 paid 與同訂單有效權限，即自動完成既有十五篇生成，不再要求第二個生成按鈕。指定管理者按「管理者免費解鎖」直接生成，已購者按「解鎖／查看報告」使用快取／既有授權。未付款、缺少明確請求、生日變更或錯誤訂單不自動生成。需保持返回頁開啟；中斷／未知 provider outcome 不任意重試。

Worker version `b5ff91aa-b922-47b0-9720-f5bc525468b1`、Pages `5fd76a70-b6cb-4179-be4f-c44f4d26c410` 已部署；76 新流程、既有回歸、types／lint／build 與正式 42 UI／匿名隔離 PASS。無 migration、Secrets／金流改動或 commit／push；本輪實際 AI／交易 0，真人正式付款＋生成 NOT RUN。完整實作、測試及限制見 [四方案最新解鎖流程](dreamspell-production-ecpay-installation.md)；下方保留歷史發布紀錄。

## 最新更新：指定管理者免費正式生成（2026-10-10）

`wadehuang77@gmail.com` 經後端有效 Session 與 D1 email 雙重確認，可免 NT$699 商品費使用 Pro；一般會員仍需本人有效付費權限。GET 提供商品獨立虛擬管理者 grant，不建立訂單；驗證出生資料後的明確生成 POST 才建立零金額 `maya_admin`／`complimentary` 訂單。不走綠界，不改歷史訂單。讀取／繼續重驗身分，沿用成本上限、並發防護與 D1 快取。

Worker version `9ff45559-8d8b-411f-bfab-21a762fc076c`、Pages `3536adb0-046f-4b27-9523-3ef6d814868d` 已部署；schema／ledger／資料計數與 bindings 完全不變，無 migration。兩商品完整 Mock、權限撤銷／冒用、付費回歸、36 UI＋4 catalogue、types／相關 lint／build PASS；正式 24 個 synthetic 會員 UI 與匿名隔離 PASS。真人管理者 Live 生成 NOT RUN，本輪 AI／付款 0。程式為未提交 Dreamspell-only overlay，未 commit／push。完整規則及發布證據見 [管理者最新狀態](dreamspell-admin-preview.md)。

## 正式生成直接開通授權（2026-10-10）

### 已部署結果

- **PASS**：程式commit `cda1f7e62b85092ae6d7d5c22aee298de8b11751`已push main；一般CI部署未重複觸發。後續純文件commit不改變此Pages程式SHA。
- **PASS**：正式customer D1只新增030的3表／1索引，031與全部既有ledger／schema保留，026未執行；原aggregate會員／訂單／報告counts不變，foreign-key check空，原Secret bindings不變。唯一新增功能狀態變更為 `MAYA_PREMIUM_LIVE_ENABLED=false→true`。
- **PASS**：Worker deployment `0ec88936-b52c-4252-894a-90ef9fb0397f`，version `12195bfa-646c-4311-a319-092d12bfc3be`，100%；Pages `e14abcde-d901-4ebe-9cf5-6a795e080c8c`。375source／63dist hashes核對一致。
- **PASS**：正式HTTPS Pro `payment=true/liveAi=true`、雙人 `payment=true/reportAvailable=true`，金額699／899。中文／英文390／768／1440px的public介紹及24個未購買／已購買synthetic會員UI檢查通過；已授權會員頁有生成管理介面，沒有生日資料仍阻擋生成。
- **PASS**：正式匿名reports／entitlements GET與reports POST均401；匿名POST測試沒有建立job或觸發AI。Paid會員UI為synthetic瀏覽器資料，不宣称真實登入會員API驗收。
- **NOT RUN**：取消中文下限後的真實中文完整12篇AI重驗與真實會員正式生成。本次部署／smoke新增AI與checkout呼叫0；先前隔離AI驗證及未完成狀態保持原記錄。
- 已啟用既有生成流程：本人有效商品權限、明確生成／繼續操作、成本／並發／重試限制、D1成功JSON儲存、讀取不再生成。沒有修改其他系統、Secrets或舊商品權益。

使用者在要求commit／push／部署後，另行明確選擇「直接開通，接受目前驗證範圍」：接受取消雙人中文350字下限後，本地十二篇測試PASS，但真實中文完整十二篇尚未重新驗證。授權正式migration030、Worker／Pages部署與NT$699／899 Live生成。此授權取代先前必須四份真實報告全部PASS才開通的發布條件，不把未完成驗證改稱PASS。

- 正式保留雙人中文500字上限／結構／依據檢查與個人Pro、英文原規則；付款／會員／所有權、最多3次品質嘗試、未知AI結果阻擋、每份NT$2／同訂單雙語NT$4規劃成本上限不變。
- 僅套用030至現有正式customer D1；031已安裝，不執行026，不重設會員／訂單／報告，不修改Secret。正式開通後生成需本人商品權限與明確操作，讀取不自動生成，成功JSON存D1。
- 新正式包由目前version `9cc4240a-d175-42aa-86b4-6dd94e9774e1` 的隔離包overlay建立，保留其他系统正式程式；375source hashes與dist hashes另存，commit本身不是歷史overlay全量重建的唯一依據。
- 發布前Worker／App typecheck、相關ESLint、Worker dry-run、frontend build／45route SEO PASS；前次3個字數／十二篇本地生成測試及相關型別檢查PASS。此次不再呼叫AI或執行正式付款。
- 發布前schema／ledger／原bindings唯讀核對，TimeTravel bookmark `00001410-00000000-00005100-6ba15d5dc76c7f6c8b50b240cba25c4b`；先前Worker／Pages IDs保留作rollback參照。若須暫停premium，保留030／031與付款callback相容，關閉生成不刪資料；不自動restore正式D1。
- 只提交Dreamspell修改（含先前699開通修補與測試）；其他印度占星／GA4等修改不提交、不部署。commit使用 `[skip ci]`，以免重複一般部署；發布結果部署後補記。

最新規格修訂：使用者取消雙人中文每篇350漢字硬性下限，349字可接受；500字上限、結構及資料依據檢查保留。個人Pro原本字數規格不變。詳見 [雙人品質規則修訂](dreamspell-relationship-blueprint-v2.md)。本地修改未部署，不表示先前未完成的真實十二篇驗證已通過。

## 報告全面開通請求：本輪驗證未通過（2026-10-10）

使用者要求報告生成全開，並授權「最多80次隔離AI驗證、預估成本上限NT$4，全部通過才套用030／部署／開通；未通過保持關閉」。

- **PASS**：修正品質重試的字數計量，僅計算讀者可見文字，不計JSON欄位與計畫ID；短稿明確提供缺少字數與需增加的具體內容，長稿提供刪減幅度。仍維持350～500漢字、最多3次品質嘗試及成本上限，沒有補字或降低驗收門檻。
- **PASS**：本輪真實Pro英文15篇、中文15篇、雙人英文12篇均完成Schema驗證與D1本地儲存／讀取cache驗證；成功報告再次讀取／create不呼叫AI。各完成報告規劃成本約NT$0.124992／0.30360225／0.12406275。
- **FAIL**：本輪雙人中文第8篇（金錢與共享資源）3次品質嘗試後仍只有349個漢字，低於350硬性下限。前次第11篇不足問題不能視為整體已解決。此限制仍正常阻止不合格付費JSON完成。
- **BLOCKED**：第8篇已耗盡3次嘗試，測試job不得直接重置為成功；剩下授權10次呼叫不足以重新完整驗證12篇中文報告。按使用者「全部通過才開通」條件停止，不套用030、不發布本輪新包、不啟用premium。
- 本輪實際OpenAI request attempts共70（47＋23），包含一次preview工具中斷後的未知結果。第一輪Wrangler4.105中断，新版4.149續驗時previewhealth计數重置；因此修正測試runner為每次網路請求前持久化campaignledger，以client端跨preview重啟的總帳為準，不採preview計數冒稱總數。
- NT$4規劃上限內保守campaign reserve為NT$3.302657：已完成三份報告費用合計NT$0.552657，剩餘25次請求全部按NT$0.11保留（含未知／拒絕／未完成章節）。這是保守計畫預算，不是OpenAI實際帳單。兩個隔離preview已停止，沒有正式DB／金流bindings。
- **PASS**：本地premium6測試、48組中英文390／768／1440px UI、24組付款按鈕及4組public商品介紹狀態、13個KIN／外部參考／視覺映射測試；Worker與acceptance測試typecheck、相關lint、隔離發布包App／Worker typecheck與45route build／SEO通過。
- **PASS**：主商品頁新增讀取Pro／雙人config的可用性說明，未開通時保留只買權限告知；開通後才顯示完整篇章生成說明，載入錯誤明確提示、不呼叫AI。此修改尚未部署。
- 本輪發布前記錄正式Worker `9cc4240a-d175-42aa-86b4-6dd94e9774e1`、Pages `9ae41ab1-c73b-42d0-b646-5c6c8be570a3`、TimeTravel bookmark `0000140e-0000006a-00005100-41438385347d79ee24426ab7c1637dbe`；没有restore或migration030。
- 最終正式HTTPS config核對：Pro付款true／liveAi false，雙人付款true／reportAvailable false。既有199／499不改動。本輪沒有真實付款、未使用真實會員資料、未commit／push。

## 最新正式狀態：NT$699／899 權限付款開通（2026-10-10）

使用者另行明確授權：「授權開通兩個付款按鈕，接受目前僅購買權限」，包含正式 additive migration031與部署。以下狀態取代先前Pro付款關閉狀態，**不取代報告品質BLOCKED**。

- **PASS**：正式 `MAYA_PRO_PAYMENT_ENABLED=true`、`MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED=true`；獨立商品金額分別699與899。
- **PASS**：`MAYA_PREMIUM_LIVE_ENABLED=false`、`MAYA_PRO_LOCAL_ENABLED=false`；付款前中英文保留只取得權限、尚無新版報告交付的告知，雙人仍需勾選理解扣款。
- **PASS**：仅購買Pro權限不要求先存出生資料；已取得權限者按鈕顯示「已取得商品權限」並停用。Pro報告關閉時清單回應空清單與明確reason，不查詢未建的local報告表；直接報告／生成仍503，不交付Mock。
- **PASS**：正式只套用 `031_maya_pro_payment.sql`，新增3表／1索引；025／027／028／029與所有既有schema／ledger row保留，沒有026／030。正式既有會員／訂單／報告aggregate counts不變，foreign-key check空，既有Secret bindings不變，唯一vars變更為Pro付款false→true。
- **PASS**：發布前Time Travel bookmark `0000140a-00000000-00005100-8d69d0bc4da46f89e53e80a099a2114c`。舊Worker version `f88d83dd-b8a4-466b-aadc-2216f0b9ef2b`、Pages `24ad6f94-de88-41a2-8e8d-e9dd205dbd95`記錄為開通前目標；一旦有新Pro真實訂單，不可直接回退至不認識Pro callback的舊關閉版本或restore D1，應用保持031與callback相容的前向修補。
- **PASS**：Worker deployment `a2bc6c3f-76c0-4354-abd3-83cb678ebd84`，version `9cc4240a-d175-42aa-86b4-6dd94e9774e1`；Pages deployment `9ae41ab1-c73b-42d0-b646-5c6c8be570a3`。此為上一正式包的Dreamspell隔離overlay，373d206是Git base而非完整新程式commit；本次未另行commit／push。
- **PASS**：374 source／63 dist hashes、隔離Worker typecheck／lint／dry-run、App typecheck／lint／build／45 SEO routes。既有完整payment suite的15個測試通過；新增031測試初次因共用測試DB已有local表而FAIL，調整執行順序後3個相關金流／歷史權益測試全PASS，原Pro5測試PASS，test typecheck PASS。
- **PASS**：`app/scripts/maya-payment-buttons-check.ts` 的24個中英文390／768／1440px、未購買／已購買、無出生profile UI測試；取消真實付款確認後不送checkout。正式HTTPS config、public付款links、匿名API401／登入導回，以及12組正式頁面搭配synthetic會員狀態的付款按鈕／告知／無overflow測試PASS。
- **NOT RUN**：真实已登入會員的正式checkout／付款／有效正式callback驗收。本次未使用真實會員登入或偽造正式session，synthetic會員UI不可冒稱真實會員端到端驗收；後端授權與回調以隔離D1離線測試驗證。
- **NOT RUN**：本次付費AI與checkout呼叫皆0，沒有真實扣款。其他系統與Google OAuth沒有修改。
- **BLOCKED**：完整premium Live文字品質／報告正式交付仍未開放；699／899按鈕開通不代表報告完成。

## 後續提交與關閉功能發布授權

2026-10-10，使用者要求 commit／push／部署，並明確選擇「只提交 Dreamspell，部署但維持未通過功能關閉」。此為發布程式碼而非開啟未通過的付費內容：

- 保持正式 `MAYA_PRO_PAYMENT_ENABLED=false`、`MAYA_PRO_LOCAL_ENABLED=false`、`MAYA_PREMIUM_LIVE_ENABLED=false`。
- 保持現有雙人 NT$899 權限付款開啟，`reportAvailable=false`，付款前維持「僅買權限」說明；不宣稱十二篇可交付。
- 本次不套用 migration030／031、不呼叫付費AI、不操作真實付款，不修改既有金流Secrets。
- 只提交經檢查的 Dreamspell 程式、測試、依賴、路由、SEO、SQL方案及文件；其他印度占星／GA4修改留在未提交工作樹。
- 使用 `[skip ci]` 避免push觸發一般工作樹部署；手動發布由前次正式包建立的Dreamspell隔離overlay，保留正式其他系統。Git SHA標記與完整source／dist hashes分別記錄，不假設HEAD單獨能重建歷史overlay。
- 发布前正式schema／ledger／bindings唯讀已核對；rollback Worker version `94f56401-ba2e-4672-ae9a-3332a77eaa87`，Pages `2efa8c68-2d18-4034-b484-60239ce7fa23`；D1bookmark `00001406-00000000-00005100-3fbac3dd36e14860802eba0b5904404c`，沒有restore。
- Exact发布包 App／Worker typecheck、相關lint、frontend build／45 route SEO及Worker dry-run PASS；Pro關閉功能與全260規則回歸、既有塔羅付款回歸PASS。最終deployment IDs與HTTPS驗證於部署後補記。

### 關閉功能正式發布結果

- **PASS**：程式commit `b5c5e99fb2ed8b3bec3d97b264a778dd55a1e1b3` 已push到main；`[skip ci]`未觸發另一套自動部署。
- **PASS**：Worker deployment `e3e4673c-2a56-49e8-a645-aba409f2c0b2`，version `f88d83dd-b8a4-466b-aadc-2216f0b9ef2b`，100%。
- **PASS**：Pages deployment `24ad6f94-de88-41a2-8e8d-e9dd205dbd95`，正式網域已更新。Pages commit metadata為上述程式SHA；後續純文件commit不改變部署程式。
- **PASS**：373份source與63份dist hash驗證一致；正式D1 schema、migration ledger、既有aggregate counts與所有原bindings完全不變，僅新增plain-text `MAYA_PREMIUM_LIVE_ENABLED=false`。
- **PASS**：正式HTTPS Pro config顯示 `enabled=false/payment=false/liveAi=false`；雙人config為NT$899、`payment=true/reportAvailable=false`。
- **PASS**：中文／英文390px與1440px正式頁，NT$899按鈕、權限限定說明、未登入導回同語系登入頁與水平溢出檢查。匿名entitlements／reports／profile／checkout-config皆401。
- **NOT RUN**：本次正式checkout、實際扣款、付費AI呼叫、D1 migration030／031皆未執行；瀏覽器驗證阻擋付款與生成POST，本次AI與checkout呼叫為0。
- **BLOCKED**：雙人中文Live第11篇三次嘗試後340字，仍未達350～500字規格。先前真實AI驗證不改稱全通過；Pro付款／新premium正式生成持續關閉。
- 完整before／after audits、source／dist manifest、HTTPS smoke及screenshots存於本次私有session artifacts，未提交會員資料或Secret。

## 最新實作：正式生成程式已整合，整體發布仍 BLOCKED

2026-10-10，續作正式 Pro／雙人報告：

- 新增 `worker/src/mayaPremiumLive.ts`：逐章 OpenAI Structured JSON 生成、伺服器附加確定性依據、版本驗證、D1 儲存與讀取。
- Pro 十二篇沿用生命藍圖契約，加三篇神諭／波符／使命整合；第十五篇取得實際先前章節摘要，不虛構已生成內容。
- `provider=openai` 與 `mock-local` 明確區分；正式權限不交付 Mock。
- 新增 `maya_premium_reports`、AI section ledger、order budget 三表的 additive migration030；Pro付款三表 migration031。**尚未正式套用**；沒有重建原本受 CHECK 限制的 Mock 表。
- 每個 advance 請求只處理一章；頁面載入／GET／已完成報告重送不呼叫 AI。生成按鈕才啟動有上限的流程，中斷後可由使用者明確繼續。
- 並行 D1 batch claim 保證同一章只有一個 provider 請求；每次呼叫前、完成後、回傳前重新檢查 Session 與本人有效付款權限。
- 單次輸入序列化限制10,000 bytes、provider input 11,000 tokens、output 2,200 tokens；60秒 timeout；每次預留 NT$0.11、單報告 NT$2、單訂單雙語合計 NT$4。使用既有 `gpt-4o-mini` 費率與35 TWD/USD規劃換算，並非保證供應商帳單匯率。
- 完整有效 usage 的已知回應可結算實際 Token 計價並釋出差額；未知／超時／provider失敗保留預留金額並阻擋自動重試。
- 已知 JSON 品質不合格可修訂原草稿，同一章最多三次，所有嘗試記帳；超限 BLOCKED，不降低字數或語言門檻、不填補制式文字。

驗證結果：

| 項目 | 結果 |
|---|---|
| App／Worker TypeScript與測試型別、相關ESLint | PASS |
| Frontend Production Build／45 route SEO、Worker dry-run | PASS；準備包未部署 |
| 新 live adapter、Schema、Session／商品隔離、快取、並行、錯誤、成本與三次修訂限制 | PASS：5項離線測試 |
| 六組出生配對 × 中英文契約／修改配置拒絕 | PASS：合成文字，KIN為真實引擎 |
| 新Pro／雙人UI，兩語言×390/768/1440×四狀態 | PASS：48組；174次合成生成請求，真實付款0 |
| 舊Pro／全260神諭波符／雙語十五篇Mock | PASS：5項回歸 |
| 既有付款 Callback、舊699、199／499／Pro商品隔離 | PASS：15項；曾有一次admin回歸500，單獨及完整重跑均PASS，沒有忽略失敗 |
| 原日期、外部參考、SVG | PASS：7＋3＋3項 |
| 既有塔羅付款及subscription、人類圖語言／授權、印度占星 | PASS |
| 真實OpenAI Pro英文十五篇生成＋儲存＋重讀零呼叫 | PASS；usage規劃換算約NT$0.1478295 |
| 真實OpenAI Pro繁中十五篇生成＋儲存＋重讀零呼叫 | PASS；含品質修訂約NT$0.29378475 |
| 真實OpenAI雙人英文十二篇 | PASS；約NT$0.116319 |
| 真實OpenAI雙人繁中完整十二篇 | FAIL：最後驗證第十一章三次後仍340中文字，低於350字門檻；未交付不完整內容 |
| 正式D1 migration030／031、Worker／Pages部署、新開關 | NOT RUN，整體發布BLOCKED |

真實 provider 驗證使用既有正式 OpenAI Secret 的暫時 Cloudflare **remote preview**，沒有D1 bindings；資料、會員與訂單均為本地 Miniflare 合成測試。這不是正式會員報告，也不是真實付款驗收。所有測試輪次共發出121次 OpenAI請求嘗試（含未知／品質拒絕），**本次AI不是0**。取得usage的計價是規劃估算，不宣稱未知結果未收費。暫時preview已停止。

完整發布門檻仍未全數通過，未以通過的英文版本取代繁中驗證。正式 Pro `payment=false/liveAi=false`，雙人仍 `payment=true/reportAvailable=false`，沒有新正式交易、migration、部署、Secrets修改或commit/push。下方「Live尚未實作」為歷史，本節取代本地程式現況，但不取代正式功能狀態。

最新發布授權（2026-10-10）：完成正式生成與交付、全部自動檢查通過後，自動 migration／部署／開放，不需人工驗收。詳見 [Phase 1–4 自動正式上線規則](dreamspell-phases-1-4-release-rules.md)。這項授權不代表目前 Pro Live AI 已完成或開啟。

後續正式部署補充：使用者另行授權只開啟新版雙人 `MAYA_RELATIONSHIP_899` 權限付款；正式 `MAYA_PRO_PAYMENT_ENABLED=false`、`MAYA_PRO_LOCAL_ENABLED=false`，沒有開啟個人Pro付款或Live AI。部署與migration029詳見 [雙人 V2 正式更新](dreamspell-relationship-blueprint-v2.md)。

最新商品區隔更新：雙人新商品改為獨立 `MAYA_RELATIONSHIP_899` / NT$899；`MAYA_RELATIONSHIP_699` 恢復歷史 NT$699 定義，只接受既有訂單重試，不建立新的正式舊商品訂單。下方前次「使用舊代碼建立899訂單」說明保留作歷史，已由 [雙人 V2 報告](dreamspell-relationship-blueprint-v2.md) 取代。個人 Pro `MAYA_SOUL_MISSION_PRO_699` / NT$699 與個人 `MAYA_FULL_499` / NT$499 不變。

## 後續更新：雙人合盤 NT$899 與 Pro NT$699 付款入口

本節取代下方初始驗收記錄中「未串接 Pro checkout」與「雙人新訂單價格 699」的現況說明；初始記錄保留作為歷史。

- 雙人合盤**新訂單 NT$899**；保留 `MAYA_RELATIONSHIP_699` 商品代碼以相容既有資料庫 CHECK、訂單及報告。歷史 NT$699 訂單不重寫；舊 pending 訂單重試仍組裝 NT$699，Callback 必須吻合實際儲存金額。舊 paid 權限仍可讀取與生成原報告。
- 馬雅首頁新增「綠界付款 · NT$699」Pro 入口；Pro 頁面有實際付款按鈕，登入、本人出生資料及後端獨立開關通過後才可用。取得有效 Pro 權限後不再顯示可重複購買的可用按鈕。
- 重用現有正式 AioCheckOut V5 簽章與 Callback；Pro 寫入獨立 `maya_pro_payment_orders`、`maya_pro_entitlements`、`maya_pro_payment_adjustments`，不擴寫原三商品資料表 CHECK。
- 獨立 `MAYA_PRO_PAYMENT_ENABLED=true` 才允許 Pro checkout；預設關閉，且仍需所有既有正式金流設定。**本次沒有改任何正式開關。**
- Pro ReturnURL 仍為 `/api/maya/payments/callback`，付款結果與 ClientBackURL 依語言返回 `/maya-calendar/pro` 或 `/en/maya-calendar/pro`。瀏覽器返回不授權；僅驗證成功的 Callback 授權，重複通知冪等。錯金額、錯簽章、SimulatePaid 不授權。
- 訂單冪等鍵跨原商品與 Pro 查核，避免共用 key 建立不同商品訂單。退款 / 撤權只記帳與撤權，不操作實際退款。
- **Pro Live AI 生成仍未實作或啟用**。正式權限可查詢，但不得生成 / 交付 Mock 作為付費報告；正式生成回 503。付款前明確提醒「僅取得權限，尚無法交付付費解讀」。正式開放收費仍應等待報告交付流程完成。
- additive SQL 計畫仍是本地測試用途，不可重跑舊 schema 檔就認為既有資料庫已更新；正式 migration、部署及還原點需要另一次審核。本次未執行正式 D1、部署、真實交易、付費 AI、commit 或 push。

後續驗證：App / Worker / 測試 TypeScript、相關 ESLint、production build 與 45 route SEO PASS；完整離線 payment / AI 回歸 15 tests PASS；Pro 規則 / Schema / 本地權限 5 tests PASS。Pro 瀏覽器 36 cases PASS（含 6 個完全攔截的付款表單，真實綠界請求 0、付費 AI 0）；原視覺頁 36 cases 及原路由回歸 PASS。離線 provider 回歸使用攔截回應，不宣稱是真 AI 或真付款驗收。

## 範圍與結論

本次完成獨立 Pro 商品的計算、十五篇資料契約、Prompt、Mock、本地 Worker 授權與儲存，以及 React / SVG 報告頁。本地測試 PASS；**不代表正式付款、真人 Google 登入或 Live AI 驗收成功**。

沒有呼叫 OpenAI、圖片生成或付費 AI；沒有發送綠界 checkout、建立真實交易、修改正式 Secrets、執行正式 D1 SQL、部署、commit 或 push。既有日期公式與 2 月 29 日出生限制不變。正式環境原有商品的功能開關未修改。

## A. 新增商品及相容策略

| 項目 | 定義 |
|---|---|
| 商品 ID | `MAYA_SOUL_MISSION_PRO_699` |
| 中文名稱 | 星際靈魂使命藍圖 Pro |
| 英文名稱 | Galactic Soul Mission Blueprint Pro |
| 售價 | NT$699 |
| 報告版本 | `dreamspell-soul-mission-pro-v1` |
| 本階段 provider | `mock-local` |

原有 `MAYA_BASIC_199`、`MAYA_FULL_499`、`MAYA_RELATIONSHIP_699` 保留。原 NT$699 確實是雙人關係報告；沒有更名或覆蓋。既有 `MAYA_PRODUCTS`、付款商品 allowlist 及三種商品的權限沒有加入 Pro，同價不等於相同權限。

既有 D1 CHECK 只接受原三種商品，因此採用使用者已確認的**獨立 additive Pro 資料表方案**。SQL 位於 [maya-pro-local-schema.sql](../d1/maya-pro-local-schema.sql)，不在自動 migration 目錄，本次只套用到全新 Miniflare 本地 D1。正式執行仍須另行審核與授權。

## B. 十二篇深度解說

PART A 重用 Phase 1 的十二篇五層內容契約與 90 天計畫，不改寫現有 NT$499 生成 API：

| 篇章 | 固定 ID | 主題 |
|---|---|---|
| 01 | `soul-identity` | 星際靈魂身份 |
| 02 | `tone-and-realization` | 銀河音調與人生實現方式 |
| 03 | `mission-and-direction` | 生命使命與人生方向 |
| 04 | `hidden-talents` | 隱藏天賦 |
| 05 | `shadows-and-lessons` | 內在陰影與反覆課題 |
| 06 | `love-and-intimacy` | 愛情與親密關係 |
| 07 | `career-and-work` | 事業與工作天賦 |
| 08 | `money-and-resources` | 金錢與豐盛模式 |
| 09 | `relationships-and-support` | 人際關係與支持 |
| 10 | `rhythm-and-growth` | 生命節奏與成長 |
| 11 | `care-and-balance` | 自我照顧與能量平衡 |
| 12 | `ninety-day-practice` | 90 天實踐 |

每篇具有 `evidence`、`interpretation`、`lifeExamples`、`reflectionQuestions`、`actionSteps`。中文驗證 350～500 漢字；英文 120～450 words，禁止中文混入。90 天分成 1～30、31～60、61～90 天，各至少三項行動、三個反思問題。

為保持 Phase 1 向後相容，PART A 子文件仍使用原 `dreamspell-life-blueprint-v2` / `MAYA_FULL_499` 內容契約。這只是資料結構重用，**不是授予 NT$499 商品權限**；外層商品與 Worker 授權全部是 Pro。PART A 保留原 `unsupportedFields`，畫面說明這只適用於該十二篇內容；已驗證神諭與波符在 PART C / D 獨立提供。

## C. 視覺化與頁面

| 元件 | 完成內容 |
|---|---|
| GalacticIdentityCard | 出生 KIN、生日、圖騰、音調、宇宙配色；本地 SVG / PNG 下載 |
| SolarSealIcon | 全部 20 圖騰，原創抽象幾何 SVG、穩定 seal number、無障礙名稱 |
| GalacticToneSymbol | 全部 13 音調；點 = 1、線 = 5；中英文名稱與既有編輯關鍵字 |
| TzolkinMatrix | 260 格、出生標示、選取詳情、鍵盤、手機橫向捲動 |
| LifeBlueprintNavigator | 十二篇快速導覽、展開收合、五層文字、90 天計畫 |
| DreamspellOracleCross | 五位置 SVG、鍵盤 Enter / Space、選取詳情、文字替代清單 |
| DreamspellWavespellChart | 所屬波符、起訖、出生位置與十三階段圖騰 / 音調 |
| MayaProReportView | 四部分報告與三篇 Pro 深度章節，清楚標示 Mock |

圖示明確標示「現代幾何設計」，不是傳統馬雅文字；裝飾軌道不是天文運行。波符成長關鍵字沿用既有編輯資料，不宣稱為官方完整關鍵字或個人運勢。

沿用既有路由機制：

- `/maya-calendar/pro`
- `/maya-calendar/pro/reports/:id`
- `/en/maya-calendar/pro`
- `/en/maya-calendar/pro/reports/:id`

報告有 noindex / 私人頁設定；切換會員、語言或 report ID 時清除舊資料，避免殘留另一份私人內容。既有馬雅首頁增加獨立 Pro 介紹入口，不接入原三商品 checkout。

## D. 五大神諭公式與來源

輸入必須為整數 KIN 1～260。20 seal number 沿用既有圖騰編號；完整 KIN 由既有 260 KIN 資料中的「seal + tone」唯一對應取得。

| 位置 | 規則 |
|---|---|
| Destiny | 出生 KIN |
| Guide | seal 位移：tone 1/6/11 → 0；2/7/12 → +12；3/8/13 → +4；4/9 → -4；5/10 → +8；保留出生 tone |
| Analog | `positiveModulo(18 - seal, 20) + 1`；保留出生 tone |
| Antipode | `positiveModulo(seal - 1 + 10, 20) + 1`；保留出生 tone |
| Occult | `261 - kin`；與出生 tone 合計 14 |

Guide seal：`positiveModulo(seal - 1 + offset, 20) + 1`。十字方向：Guide 上、Destiny 中、Analog 右、Antipode 左、Occult 下。

交叉來源：

1. [Foundation for the Law of Time：13 Moon tutorial](https://www.lawoftime.org/thirteenmoon/tutorial.html)：Guide 音調分組、Dreamspell 260 格及波符背景。
2. [Law of Time 官方 destiny oracle diagram](https://www.lawoftime.org/images/destinyoracle-guide.png)：左右位置、同音調關係與 Occult 音調合計 14。
3. [Galactic Ark calculator](https://galacticark.org/dreamspell-kin-calculator)：獨立執行已取得的原計算器函式，產生 260 筆 oracle / wavespell 數字預期值。

原計算器來源為 `dreamspell_KIN_calculator_v1.3/dreamspell-calculator.js?ver=1.0.0`；SHA-256：
`6a95c4fa842f4d56b1f888870f47c64cc28a17ad933d6750e0cda11125fcd7cb`。

[reference builder](../app/scripts/maya-pro-reference-build.mjs) 在 Node VM 執行外部原函式，不引入專案引擎、不執行頁面初始化、不發網路請求；只保存 [260 筆數字 fixture](../app/scripts/maya-pro-reference.json) 與來源資訊，未複製其圖像或完整原始碼。測試預期值不是用本專案公式產生。沒有採用其他網站不同的閏日規則。

KIN 34 範例：Destiny 34、Guide 138、Analog 125、Antipode 164、Occult 227。全 260 筆完整 KIN 與 seal / tone 關係均 PASS，不需用假 KIN 補缺。

## E. 波符公式與來源

重用既有 `mayaSignature`，沒有第二套生日引擎：

- 波符：`floor((kin - 1) / 13) + 1`
- 起點：`(wavespell - 1) * 13 + 1`
- 終點：`startKin + 12`
- 位置：既有 tone number，1～13
- 每階段 KIN：`startKin + index`，圖騰 / 音調來自既有 signature。

以 D 節獨立 Galactic Ark fixture 逐筆驗證，並檢查 20 波符各 13 KIN、共 260 筆且不重複，音調順序 1～13。這是 Dreamspell 分組，不是出生年齡、職涯年份或未來運勢週期。

矩陣沿用 Phase 2 已驗證的「每欄向下 20 格、再向右」：`kin = column * 20 + row + 1`；不是把每欄稱為單一音調。

## F. 十五篇 Schema 與 Prompt

```text
reportVersion: dreamspell-soul-mission-pro-v1
productCode: MAYA_SOUL_MISSION_PRO_699
locale: zh-TW | en
kinNumber: 1..260
provider: mock-local
parts:
  a: id=deep-life-explanations, blueprint=LifeBlueprintV2
  b: id=galactic-visualization, birthDate, kinNumber,
     iconStyle=original-modern-geometry
  c: id=oracle-and-wavespell, oracle, wavespell
  d: id=soul-mission-integration, sections[3]
```

| 篇章 | 固定 ID | 新增分析重點 |
|---|---|---|
| 13 | `oracle-integration` | 五個象徵角色之間的資源、界線、支持與張力 |
| 14 | `wavespell-journey` | 十三階段作為反思學習框架；不用來預言年齡運勢 |
| 15 | `soul-mission-synthesis` | 前十四篇的取捨、優先順序與 90 天整合重點 |

Pro 三篇同樣有五層欄位；`evidence` 包含程式驗證的 oracle / wavespell。中文 250～500 漢字，英文 120～450 words。驗證器限制固定 ID / 順序 / 欄位、生日與 KIN 對應、全部 evidence、語言、長度、問題數量、重複段落與部分明確危險宣稱。這是格式與已知風險防線，**不是證明任何自然語言內容都沒有問題**。

Prompt 以程式提供資料，禁止模型推算、虛構真實經歷、醫療診斷、疾病療效、保證財富、命定預言與科學心理診斷宣稱。PART A 重用既有 JSON Schema，PART D 有嚴格 JSON Schema。第 15 篇明確要求先提供已驗證的 1～14 篇摘要；未來 Live orchestrator 必須實作此先後順序。本次只建立契約與 Mock，未實作或執行 Live 呼叫。

Mock 文字是固定編輯測試資料加上真實程式配置，所有畫面標示 Mock；不同 KIN 間可共用測試主題，不代表已取得個人化付費 AI 深度解讀。

## G / H. 測試結果與全量 KIN 驗證

| 檢查 | 結果 | 實際範圍 |
|---|---|---|
| App / Worker TypeScript | PASS | 原有 typecheck |
| Worker 測試 TypeScript | PASS | `typecheck:maya-tests` |
| App 驗收 TypeScript | PASS | `typecheck:maya-acceptance` |
| 相關檔案 ESLint | PASS | 0 errors；既有 App fast-refresh warning 保留 |
| Production Build / SEO | PASS | Vite、prerender、45 routes / sitemap / noindex 檢查 |
| Pro 規則 / Schema / 本地 API | PASS | 5 tests；包含完整 oracle / wave、權限及資料刪除 |
| 全量 oracle / wavespell | PASS | 260 筆外部 fixture，20 × 13 分組及 tone invariants |
| 十五篇雙語 Mock | PASS | 260 KIN × 2 locales = 520 份 |
| 無效 Schema | PASS | 缺章、錯 ID、重複敘述、錯 evidence、錯生日、混語言、危險宣稱等拒絕 |
| 原十二篇 Schema 回歸 | PASS | 3 tests，六組 KIN × 雙語、舊版與其他商品 |
| 引擎 / 視覺映射 / 日期來源 | PASS | 13 tests；含 20 圖騰、13 音調、260 matrix |
| 原三商品 Worker 授權回歸 | PASS | 5 selected Miniflare tests |
| 路由 / 舊入口 / 靈數回歸 | PASS | 現有本地 route script |
| Pro 瀏覽器 | PASS | 30 cases：2 locales × 390/768/1440px × 5 states |
| 原視覺頁瀏覽器回歸 | PASS | 36 cases：2 locales × 3 widths × 6 states |
| 鍵盤 / 可見標籤 / 下載 | PASS | oracle Enter、章節鍵盤、SVG下載；Analog 在右；標籤不裁切 |
| 付費 AI / 圖片生成 | PASS | 呼叫數 0；實際 provider token 0 |
| 真 Google / 真支付 / Live AI | NOT RUN | 未授權且不在本階段範圍 |

瀏覽器使用本地 API / Session fixtures，禁止非本地資源與 AI 流量；不是正式 Google 登入或真實購買驗收。KIN 資料由真實既有引擎產生，不以假的 KIN 結果取代計算。檢查個別視覺面板實際邊界，而非只看 body scrollWidth。

保留的既有警告：LINE public asset 引用、主 bundle 大於 500 kB；未在本次順便改動其他系統。

## I. 會員權限與儲存隔離

API：

- `GET /api/maya/pro/config`
- `GET /api/maya/pro/entitlements`
- `GET /api/maya/pro/reports`
- `GET /api/maya/pro/reports/:id`
- `POST /api/maya/pro/reports`：只生成本地 Mock，需既有登入與本人 Pro grant。

使用原 Session，不新增登入身份系統。後端驗證會員、CSRF origin、Pro product code、訂單 owner / amount / paid status、有效開始與到期時間、撤權狀態、personal profile owner、已驗證生日與計算版本。另一會員、原關係 NT$699 或偽造輸入不能取得 Pro JSON。GET 內容每次重新授權；退單 / 撤權 / 到期後不可讀取。

本地 synthetic paid orders 只存在測試 fixtures，來源必須 `local_mock` / `maya_mock`，不冒稱真付款。本次沒有建立付款或退款交易 API。

唯一 cache key 為 member + order + locale + reportVersion；fingerprint 包含 profile 與出生資料，輸入改變回 409。報告成功存入本地 D1，重看讀取既有 JSON，不重新生成；重試與並行 INSERT 有唯一鍵防重複。儲存前與讀取時均檢查 Schema。

報告 FK 使用 `ON DELETE CASCADE`：既有本人 Dreamspell profile 刪除會連帶移除 Pro 私人 JSON；測試確認保留訂單、不刪除其他會員資料。未修改原刪除 API 或既有金流。

必須明確設定 `MAYA_PRO_LOCAL_ENABLED=true`，並同時滿足 `ENV=dev`、`MAYA_AI_MODE=mock`、PUBLIC / MEMBER=true。預設未設定即關閉。即使正式環境原 MAYA AI / PAYMENT 為 true，Pro 私人 API 仍回 503 `PRO_LOCAL_ONLY`。公開 config 永遠 `payment=false`、`liveAi=false`。沒有正式 checkout 路徑。

## J. Token 成本規劃

| 設定 | 規劃值 |
|---|---|
| 模型名稱 | gpt-4o-mini（規劃用，未呼叫） |
| 預估輸入 / 輸出 | 24,000 / 14,000 tokens |
| 假設每百萬 input / output | US$0.15 / US$0.60 |
| 規劃匯率 | NT$35 / US$1 |
| 合計預估 | NT$0.42 |
| 每份上限 | NT$1 |

價格與匯率是**成本試算假設，不是當日供應商報價**；未使用 tokenizer 實測十五篇 Prompt。本地 `MAYA_PRO_REPORT_CAP_TWD` 只可收緊上限，無效設定明確失敗。超限時記錄 `PRO_COST_LIMIT`、blocked 狀態、空報告、實際成本 0，不生成內容。

所有計算與 SVG：0 AI Token。Mock 的實際 AI 成本：0。本階段沒有 Live provider，因此此上限不等於已驗證的正式帳單 hard cap。正式 AI 前需要確認價格、tokenizer、原子預算預留、並行、重試 / timeout 成本與 generation orchestrator。

## K. 新增 / 修改檔案與尚未完成項目

新增：

- [dreamspellOracle.ts](../app/src/lib/dreamspellOracle.ts)
- [dreamspellWavespell.ts](../app/src/lib/dreamspellWavespell.ts)
- [mayaPro.ts frontend contract](../app/src/lib/mayaPro.ts)
- [DreamspellOracleCross.tsx](../app/src/components/maya/DreamspellOracleCross.tsx)
- [DreamspellWavespellChart.tsx](../app/src/components/maya/DreamspellWavespellChart.tsx)
- [MayaProReportView.tsx](../app/src/components/maya/MayaProReportView.tsx)
- [MayaProPage.tsx](../app/src/pages/MayaProPage.tsx)
- [mayaPro.ts Worker API](../worker/src/mayaPro.ts)
- [mayaProPrompt.ts](../worker/src/mayaProPrompt.ts)
- [local schema review plan](../d1/maya-pro-local-schema.sql)
- [reference builder](../app/scripts/maya-pro-reference-build.mjs)
- [numeric reference fixture](../app/scripts/maya-pro-reference.json)
- [Pro browser tests](../app/scripts/maya-pro-browser-check.ts)
- [Pro data / Schema tests](../worker/scripts/maya-pro-check.ts)
- [Pro local D1 / API tests](../worker/scripts/maya-pro-api-check.ts)
- 本報告。

修改：

- [App.tsx](../app/src/App.tsx)：Pro 路由。
- [api.ts](../app/src/lib/api.ts)：獨立 Pro API client。
- [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx)：獨立 Pro 入口。
- [mayaVisualization.css](../app/src/components/maya/mayaVisualization.css)：Pro / oracle / wavespell 樣式。
- [_headers](../app/public/_headers)：Pro 私人頁 noindex。
- [app package.json](../app/package.json)、[acceptance tsconfig](../app/tsconfig.maya-acceptance.json)：測試入口。
- [worker maya.ts](../worker/src/maya.ts)：只新增 Pro 前綴 route delegation。
- [utils.ts](../worker/src/utils.ts)：可選本地開關與成本上限型別。
- [worker package.json](../worker/package.json)、[test tsconfig](../worker/tsconfig.maya-tests.json)：測試入口。

重用 Phase 1 / 2 元件、引擎與內容契約，不改 KIN 日期公式、Google OAuth、綠界介接或其他命理系統。本工作樹含先前多階段未提交變更；本清單不是全部 git status，也不得將整個 dirty worktree 直接部署。

尚未完成：

1. 正式 Pro 訂單 / callback / verified_payment grant 流程：本次刻意不接正式付款。
2. 正式 additive migration 審核、還原點與部署：只提供本地 SQL。
3. Live AI、前十四篇摘要到第十五篇的真實生成順序、實際文字品質驗收。
4. 正式 tokenizer / provider pricing / atomic cost accounting。
5. 真人 Google 與正式購買、退款、跨會員端到端驗收。
6. 新商品的營運、售後與正式隱私生命週期審核。

## L. 是否具備正式部署條件

**本地開發與整合測試完成；完整付費 Pro 商品尚不具備正式上線條件。**

神諭、波符及視覺規則已完成來源交叉驗證，不再列為未確認；但正式支付與 Live AI 尚未接入，不可讓一般會員付款購買後只得到 Mock。必須先確認上述正式串接與資料庫計畫，再取得另一次授權。到此停止，等待確認；本次未自動部署或 push。
