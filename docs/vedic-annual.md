# Vedic annual release ? 2026-10-27

This release supersedes the preparation-only notes below.

- Product: `vedic_annual`, server-fixed NT$599; one immutable birth-chart snapshot and one calendar year. Chinese/English share payment access.
- New dedicated checkout uses the existing ECPay signing utility and callback signature verification, then validates merchant, case owner, amount, trade number and product. Pending orders are reused; revoked/refunded access is not restored by duplicate callbacks. No real card payment was performed.
- Administrator `wadehuang77@gmail.com` may generate owned cases without payment.
- `036_vedic_annual_release.sql` adds checkout mappings, bounded generation jobs and saved report facts. It does not modify birth snapshots or existing plan grants. Production 033/034 were applied on 2026-10-24; 036 was applied on 2026-10-27.
- `VEDIC_ANNUAL_GENERATION_ENABLED` and `VEDIC_ANNUAL_PAYMENT_ENABLED` gate reports and checkout separately. Prokerala collection retains `VEDIC_ANNUAL_TRANSITS_ENABLED`. No new API keys.
- `VedicAnnualReportWorkflow` resumes saved Prokerala samples, validates annual coverage, generates ten structured chapters via the existing OpenAI Responses endpoint and saves validated content. Reloads only read stored status/content.
- Exact adjacent Dasha gaps of up to one second are treated as source timestamp precision for readiness only, explicitly disclosed. Original times remain unchanged; larger gaps still block checkout/generation. No invented transition dates.
- One active annual job per owner; one active job per report. AI calls are checkpointed with retries disabled. A pre-call reservation prevents replaying the same job. A manual retry creates a separate bounded attempt; an interrupted remote response may still have incurred provider cost. At most three AI reservations per language and NT$90 conservative reservation total per case across both languages. A reservation is NT$15, using input <=80,000 UTF-8 bytes, output <=9,000 tokens, gpt-5.4 pricing and conservative USD/TWD 35. Unrecognized model pricing disables this release rather than guessing.
- UI uses labeled stages, not fabricated percentage. 100% appears only after complete validated content is saved. Failed work retains entitlement. Private API calls recheck ownership and paid/admin access; refund checks occur before each provider/AI phase and final save.
- Reports retain source Dasha and observed transit event references per chapter. Sampling limits, unknown house/node method names, and second precision are disclosed.
- Backend isolated tests cover fixed price, callback signatures/merchant/amount, duplicate callbacks and checkout, refunds, ownership, bilingual access, cache, interrupted AI/manual retry, administrator access and precision handling. Browser fixtures cover ten chapters, stages, reload, retry, revoked content and 390/1440px layout. These do not represent a real payment test.
- GitHub main has automatic Worker/Pages deployment. Annual workflow exports and bindings must be committed together; an isolated manual deployment alone can later be overwritten by CI.

Official OpenAI references used for the structured response and reservation limits:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-5.4

## Historical preparation notes (not current release status)

# 印度占星流年：全年行運取樣實作（2026-10-24）

## 目前已完成與開放範圍

`/vedic-astrology/annual` 與 `/en/vedic-astrology/annual`：登入、沿用已存出生盤、指定曆年、保存不可變年度快照、列出全年內所有有來源的大運及小運、資料限制與十章報告範圍。

商品 `vedic_annual`，使用者已指定 **NT$599**。後端 `VEDIC_ANNUAL_PRICE_TWD` 預設 599；設定無效時回傳 null，絕不從前端讀價格。購買與完整生成皆硬性關閉，設定價格不會啟用付款。

`wadehuang77@gmail.com` 經簽章登入狀態及 profiles.email 雙重核對後，免購買與解鎖；仍只能讀取自己的資料，不能繞過行運資料未就緒的限制。管理員目前可免費整理年度資料，不代表完整 AI 報告已上線。

新增全年行運資料收集 API 與中英文介面，採用現有 Prokerala adapter 的 OAuth、星位 endpoint、ID 與解析器。程式可收集並保存全年資料；正式開關仍關閉，尚未以真實 provider 驗收，不代表正式環境已存在全年星位。完整 AI 生成與付款仍未啟用。

本次沒有正式 migration、部署、扣款、付費 provider 或 OpenAI 呼叫。舊 provider 不在本次工作範圍。

## 已確認的現有能力

- 現有 `createVedicChart` 呼叫 `calculateProkeralaChart`，再經 `normalizeProkeralaVedic` 保存 `calculationData`。
- 現有 adapter 使用 `/v2/astrology/planet-position`、`birth-details`、`divisional-planet-position` 及 `dasha-periods`。流年準備只讀既有 adapter 正規化後的資料，不呼叫新 endpoint。
- 大運資料包含 periods 及每段 antardasha 的實際起訖，既有設定 `year_length=1`（365.25 日）。不只取目前大運，也不按年初狀態外推全年。
- 沿用 Lahiri (`ayanamsa=1`)、出生地座標、tz-lookup 與既有 `timezoneOffsetAtLocal`，核對出生時間及 offset。模糊或不存在的當地時間不補成中午。
- D1 宮位由 provider 給定，現有 adapter 未明確保存宮位系統名稱及 Rahu/Ketu 使用 true/mean 的設定。年度快照如實記為 `provider-d1-unverified`、`provider-default-unverified`，不擅自標成 Whole Sign 或 mean node。
- Prokerala 官網列有大運與行星位置功能，但尚未以本帳戶確認全年取樣授權、費用、節點與宮位設定；不能以官網功能清單宣稱本帳戶已驗證。

來源（僅查閱文件，未呼叫計費 API）：
- https://api.prokerala.com/docs
- https://api.prokerala.com/demo/dasha-periods.php
- https://api.prokerala.com/api-credits

## 年度計算與快照

- 指定年份出生地時區的 1/1 00:00 至下一年 1/1 00:00（終點不包含）；畫面日期顯示 1/1–12/31。
- 半開區間與 provider 所有大運／小運求交集。原始起訖也保存；時間軸標示年內切換，不用生日流年、不重算大運。
- 日期必須帶 offset/Z；拒絕無效日期、重疊或子期間越界。缺口如實標示，不補足、不假裝涵蓋全年。
- 快照與 fingerprint 包含擁有者、整份原始已存出生盤、年份、時區、計算設定及版本。語言不參與購買識別。相同請求原子去重；不同出生資料、年份或擁有者隔離。
- 既有訪客出生盤可用原 chart_token 在登入後認領，不能拿別人的出生盤，也不接受過期或其他用途 token；token 不放 URL。

## 已實作的全年行運資料

- 官方 SDK `src/Api/Astrology/Service/PlanetPosition.php` 確認使用日期、座標、ayanamsa、planets 與 la；`Ayanamsa.php` 確認 Lahiri = 1。沿用 `/v2/astrology/planet-position`，不使用 Western Transit 或未核實 endpoint。
- 以年度起始瞬間，每隔 8 個 24 小時取樣，到下一年起點前一秒，平年與閏年皆為 47 個基礎樣本。UTC 表示傳輸瞬間，年度邊界與顯示維持出生地歷史時區。
- 四顆目標為 Jupiter、Saturn、Rahu、Ketu；沿用現有完整行星集合請求與解析，再取所需四顆。驗證星座與經度一致、四顆唯一且完整、順逆行布林，以及 Rahu/Ketu 對向關係。
- 相鄰樣本換座或順逆行不同時，優先二分最寬區間，細分至最多一天，或達總上限停止。每份 case **最多 64 次請求預留，失敗也計入**。OAuth 不算星位樣本，沒有隱藏的星位自動重試。
- 事件區間為「前次觀測之後、後次觀測之時或之前」，絕不以中點冒充精確日期。只有完成所有基礎樣本才可儲存 completed；達上限且缺基礎樣本時回報 TRANSIT_BUDGET。
- **非完整事件枚舉**：同星座／同順逆行的兩端可能存在短暫往返，取樣無法排除；畫面與提示詞明示此限制。沒有觀測到轉換不等於沒有事件。不產生月份吉凶、精確過宮或回歸盤。
- signFromMoon／signFromAscendant 是從本命星座起算的 1–12 序距，不冒稱 provider D1 宮位。未指定新的節點或宮位算法，保留現有 provider 預設及未知細節標籤。
- 新增 `vedic_annual_transits`，綁定不可變 case（內含擁有者、出生資料、年份、座標與設定）。中英文共用，不跨使用者或不同出生盤共用快取。已完成資料直接讀取。
- 逐請求原子鎖／90 秒 lease（大於 OAuth＋星位 timeout）、預留呼叫額度與 token 條件寫入；分頁與語言不會建立平行的相同任務。每次只發一個星位請求。429 保存 Retry-After，伺服器拒絕提前再抓。
- 前端每完成一筆才繼續，離開後目前請求可完成儲存，下次登入手動繼續。進度條表示真實「基礎取樣筆數」，不代表 AI 報告或細分完成。失敗保留樣本；重試不需重新購買。
- 服務在回應成功、但資料庫寫入前若中斷，該次額度仍已扣除；恢復可能需重抓此缺失樣本。不能保證跨外部 API 與 D1 的 exactly-once，總上限不會重設。
- `AnnualTransitStore.facts()` 將已保存取樣驗證後合併成 AI 輸入，不修改原年度／購買快照。提示詞重新驗證取樣衍生事件，輸出驗證拒絕無來源 evidenceIds、漏章、完全重複正文、遺漏年度大運或觀測轉換。

官方來源：
- https://github.com/prokerala/astrology-sdk/blob/master/src/Api/Astrology/Service/PlanetPosition.php
- https://github.com/prokerala/astrology-sdk/blob/master/src/Api/Astrology/Ayanamsa.php
- https://api.prokerala.com/demo/planet-position.php
- https://api.prokerala.com/tos

## 尚未實作／尚未啟用的完整報告部分

1. **真實全年資料驗收**：adapter 與保存流程已實作，但未呼叫帳戶的真實 API。需確認指定年份查詢權限、點數費用與資料品質；合成測試不能證明星曆精度。
2. 未核實的 true/mean node、D1 宮位系統名稱仍保留限制，不能以取樣成功宣稱這些細節已核實。
3. 正式開關預設關閉。需套用 033、034 migration 並取得付費 provider 呼叫授權後才能進行正式資料驗收。
4. **十章 AI 生成工作**：提示詞、結構化輸出合約與驗證已備妥；缺完整取樣或全年大運時拒絕。未接 OpenAI、未建立生成 job，不顯示虛假的 100%。
5. 現有報告 workflow 固定九章，不能直接拿來充當十章流年。完成行運驗證後才沿用現有 OpenAI provider、workflow checkpoint、並行／重試機制，新增流年專用工作與成本預留；本次未聲稱這些已完成。
6. **綠界付款**：本商品不加入 SPREAD_CATALOG，因此既有通用 checkout 無法售出。專屬 checkout/generate/retry API 均關閉。沒有新增 callback 授權分支。下一階段須將 case_id 與固定 599 寫入後端訂單，串接現有簽章／商店／金額／交易／退款驗證後才能開放。
7. 新的 report/entitlement tables 是保存及授權介面的準備，不代表有已完成內容。查詢權限檢查擁有者、active、verified_payment、訂單 paid、商品、金額、trade_no 與 case 綁定；退款或撤權拒絕存取。管理員免購買仍顯示資料待就緒。

## Migration 與環境

- 新增 `d1/migrations/033_vedic_annual.sql` 與 `034_vedic_annual_transits.sql`；後者獨立新增行運收集表，不修改 033 或其他舊 migration。皆未正式套用。
- 需要既有 profiles、orders、vedic_charts。沒有 schema 時 API 回傳雙語 STORAGE_NOT_READY，不在請求內自動建表。
- `VEDIC_ANNUAL_PRICE_TWD="599"`。無新 API Key；既有 PROKERALA_CLIENT_ID／SECRET 與 OPENAI_API_KEY 仍只在後端。本階段不讀取或呼叫付費服務。
- `VEDIC_ANNUAL_TRANSITS_ENABLED="false"`：僅控制星位收集；須同時有既有 Prokerala 憑證才可呼叫。開啟此值不會開啟付款、AI 或跳過擁有者／授權驗證。

## 驗證範圍

`worker/scripts/vedic-annual-check.ts` 使用隔離 Miniflare D1 與明確標示的 synthetic fixture，禁止外部 fetch。涵蓋曆年／閏年／時區、大運及小運年中切換、缺漏及重疊、出生時間缺失、出生 offset、快取隔離、重複請求、不可變快照、語言共用、登入／擁有者／退款、管理員免費、訪客 token 認領，以及購買／生成關閉。

新增合成全年樣本、閏年／跨年、換座與順逆行細分、星位矛盾與節點對向檢查、預算上限、完整資料保存／恢復、中英文共用、並發鎖、429 等待與重試、退款授權及官方 endpoint 請求格式測試。共 7 組後端測試通過。前端 browser 測試以攔截 API 的合成資料驗證失敗重試、重新整理與切換語言不重抓、390／1440px 排版。

不以此測試宣稱星曆精度、正式 Prokerala 行運、真實付款 callback 或 AI 報告品質驗收通過。完整 AI 生成與儲存恢復仍待實作。
