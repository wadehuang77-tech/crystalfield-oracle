# 完整生命藍圖 2.0｜Phase 1

後續發布授權（2026-10-10）：開發完成且全部自動檢查通過後，直接正式上線，不再等待人工驗收。詳見 [Phase 1–4 自動正式上線規則](dreamspell-phases-1-4-release-rules.md)。以下是原階段的歷史驗收結果，不代表新的正式功能已完成。

範圍：只設計 NT$499 的內容、型別、Prompt 與本地 Mock 品質驗證。

**結果：新版內容／Prompt／Schema 與本地測試 PASS；正式 API 切換、十二篇 UI、Live AI 品質及部署 NOT RUN。**

沒有修改金流、Google 登入、會員授權、KIN 公式、199／699 內容或其他命理系統。沒有雲端操作、D1 migration、付費 OpenAI、commit／push。既有工作樹變更保留；此次不更新先前正式發布包。

## A. 現有架構稽核

| 項目 | 檔案／現況 |
|---|---|
| 前端顯示 | [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx)：`report.sections` 逐段顯示 heading／body，以 heading 作 React key；三商品共用 |
| 前端 API | [api.ts](../app/src/lib/api.ts)：createReport、adminReport、report、reports；本次未修改 |
| Worker API | [maya.ts](../worker/src/maya.ts)：POST `/api/maya/reports`；管理者 `/api/maya/admin-reports` 共用生成邏輯；GET 報告及歷史均驗證本人／權限 |
| OpenAI | [mayaAi.ts](../worker/src/mayaAi.ts)：每段 system prompt、`gpt-4o-mini`、結構化 `{"body":"..."}` 回應；最多 1,200 output tokens／段，25 秒 timeout |
| 共享報告型別 | [maya.ts](../app/src/lib/maya.ts)：`MayaReport`；199 三段、499 七段、699 七段；699 才有另一人 signature |
| D1 報告 | [025](../d1/migrations/025_maya_dreamspell.sql)：`maya_reports.report_content` 是 JSON TEXT；model、prompt、calculation version、locale、usage、cost 等另有欄位 |
| D1 AI section | [027](../d1/migrations/027_maya_production_payment_ai.sql)：`maya_ai_sections.section_index` CHECK 0～6；不適合直接插入十二篇 |
| 管理者免費報告 | [028](../d1/migrations/028_maya_admin_reports.sql)：獨立 admin reports／AI sections；index 同樣 0～6 |
| 中英文方式 | locale=zh-TW／en，分開 prompt、標題、生成與儲存；不是先生成中文再翻譯 |
| 驗證引擎 | [dreamspell.ts](../app/src/lib/dreamspell.ts)：固定 anchor 1987-07-26=KIN34；既有日期計算、20 圖騰、13 音調 |

現有 499 七篇為生命天賦、潛在優勢、成長課題、波符與城堡編號、事業與創造力、每日實踐、關係互動。舊 Mock body 重複制式段落；舊 Live prompt 傳完整 signature，包含波符與城堡編號，雖限制部分象徵解讀，仍不符合本次「新版只送 KIN／圖騰／音調」的資料最小化要求。

### 相容性決策

不直接改共享 `mockMayaReport`、`MayaReport` 或 Live generator。否則會同時影響 199／699，且舊報告讀取會依新版模板重建驗證而失敗。

新版採獨立版本、獨立內容模組、獨立 Prompt 和版本化 JSON reader。`generateLocalLifeBlueprint` 是 Phase 1 的**本地入口**，沒有 fetch 或 Live provider 路徑。既有正式／本地 API仍走 v1；不是宣稱已完成十二篇正式上線。

## B. 此次檔案

新增：

1. [mayaLifeBlueprint.ts](../app/src/lib/mayaLifeBlueprint.ts)：十二篇固定 ID、型別、canonical evidence、嚴格結構／品質檢查。
2. [mayaLifeBlueprintMock.ts](../app/src/lib/mayaLifeBlueprintMock.ts)：十二篇雙語、不同主題的編輯 Mock，三階段九十天計畫。
3. [mayaLifeBlueprintStorage.ts](../app/src/lib/mayaLifeBlueprintStorage.ts)：v1／v2 JSON reader、v2 serializer、未知版本拒絕。
4. [mayaLifeBlueprintPrompt.ts](../worker/src/mayaLifeBlueprintPrompt.ts)：專用 Prompt、strict JSON Schema、本地 Mock 入口。
5. [maya-blueprint-v2-check.ts](../worker/scripts/maya-blueprint-v2-check.ts)：六 KIN、雙語品質、異常資料與相容性測試。
6. 本報告。

修改：[tsconfig.maya-tests.json](../worker/tsconfig.maya-tests.json)，只把新測試納入型別檢查。

沒有修改前端報告元件、api client、原 Worker 生成 API、Live provider、付款、登入、會員或任何 migration。

## C. 十二篇 Schema

版本：`dreamspell-life-blueprint-v2`，productCode 僅 `MAYA_FULL_499`。

```typescript
interface LifeBlueprintV2 {
  reportVersion: 'dreamspell-life-blueprint-v2';
  productCode: 'MAYA_FULL_499';
  kinNumber: number;
  solarSeal: { number: number; name: string };
  galacticTone: { number: number; name: string };
  locale: 'zh-TW' | 'en';
  evidence: BlueprintEvidence;
  unsupportedFields: readonly string[];
  sections: BlueprintSection[];
  ninetyDayPlan: NinetyDayStage[];
}
interface BlueprintEvidence {
  kinNumber: number;
  solarSeal: { number: number; name: string };
  galacticTone: { number: number; name: string };
  calculationVersion: string;
}
interface BlueprintSection {
  id: BlueprintSectionId;
  evidence: BlueprintEvidence;
  interpretation: string;
  lifeExamples: string[];
  reflectionQuestions: string[]; // 1–3
  actionSteps: string[];
}
interface NinetyDayStage {
  id: 'awareness' | 'action-adjustment' | 'integration';
  startDay: number;
  endDay: number;
  actionSteps: string[]; // 至少 3
  reflectionQuestions: string[]; // 至少 3
}
```

| 順序／固定 ID | 篇章 | 獨立分析重點 |
|---|---|---|
| 01 soul-identity | 你的星際靈魂身份 | 象徵身份、自我敘事與價值；不是來自某星球的事實 |
| 02 tone-and-realization | 銀河音調與人生實現方式 | 行動步驟、協作、回饋與節奏 |
| 03 mission-and-direction | 生命使命與人生方向 | 動機、價值、責任與低風險方向實驗 |
| 04 hidden-talents | 隱藏天賦與未開發潛能 | 學習條件、創造與能力回饋 |
| 05 shadows-and-lessons | 內在陰影與反覆出現的課題 | 壓力、過度使用優勢及替代回應 |
| 06 love-and-intimacy | 愛情與親密關係 | 表達需要、同意、界線與修復；不做合盤評分 |
| 07 career-and-work | 事業與工作天賦 | 工作條件、角色與團隊流程 |
| 08 money-and-resources | 金錢與豐盛模式 | 資源記錄、價值與決策；不預言收入或投資結果 |
| 09 relationships-and-support | 人際關係與支持系統 | 社交界線、互惠、多元支持 |
| 10 rhythm-and-growth | 生命節奏與當下成長 | 自己觀察的生活安排；不推算運勢週期 |
| 11 care-and-balance | 自我療癒與能量平衡 | 可選書寫、情緒覺察、休息及求助；不診斷／療效宣稱 |
| 12 ninety-day-practice | 90 天生命實踐計畫 | 整合前十一篇的價值、學習、壓力、界線、工作、關係、資源、支持與照顧 |

每篇五層：A evidence、B interpretation、C lifeExamples、D reflectionQuestions、E actionSteps。

90 天固定範圍：1～30 自我覺察、31～60 行動調整、61～90 整合實踐。這是可調整的成長計畫，不是運勢時間表。

### 資料依據

`blueprintEvidence` 重新核對 caller signature 的 KIN、圖騰／音調 number＋name 及計算版本，只投影上述欄位。不傳生日、partner、波符、城堡或其他衍生配置到新版 Prompt。

`unsupportedFields` 明確列出 oracle、wavespell、castle、personalFortuneCycles、leapDayBirth。這是「不支援」狀態，不是解讀資料；不得補值。

圖騰／音調名稱是驗證識別，編輯象徵聯想不是經驗證的心理特質。Mock 明確用可選擇的探索方式說明，不聲稱了解真實經歷。KIN 公式與 2 月 29 日 API 422 限制完全不變。

## D. 新版 Prompt

三層設計：

1. **system**：固定產品／版本、語言、五層內容、長度、反覆套話限制；禁止 AI 計算 KIN、編造配置、命定預言、實際經歷推定、醫療診斷與財富保證。
2. **user**：最小化 canonical evidence、十二個 ID／對應語言標題／獨立 focus、unsupported 狀態。不得將資料缺口補為配置。
3. **responseSchema**：所有 object `additionalProperties=false`、必填欄位、十二篇／三階段數量、ID 枚舉、精確 evidence 值及問題／行動數量。

Schema 約束數量與型別；runtime validator 另核對順序、精確欄位、canonical evidence、固定天數、重複 ID／段落、語言與字數。JSON Schema 本身不保證唯一篇章 ID或語意正確，不能只靠 schema 宣告內容品質 PASS。

篇章 12 Prompt 明確要求整合**前十一篇實際內容**。未來若逐篇生成，必須先取得前十一篇，再傳入經篩選的主題摘要；不能僅以 KIN 重複生成計畫。

本階段 Mock 從預先撰寫的十二個獨立主題產生對應九十天行動，沒有真實 AI 輸出；Prompt 的模型遵從率／繁體中文自然度／深度仍需未來受控品質測試。

## E–F. 六 KIN 與雙語測試

樣例涵蓋六種圖騰、六種音調：

| KIN | 圖騰 number | 音調 number | 十二篇 zh-TW／en | 繁中字數範圍 |
|---|---|---|---|---|
| 1 | 1 | 1 | PASS／PASS | 354～404 |
| 34 | 14 | 8 | PASS／PASS | 355～405 |
| 87 | 7 | 9 | PASS／PASS | 356～406 |
| 142 | 2 | 12 | PASS／PASS | 354～404 |
| 199 | 19 | 4 | PASS／PASS | 355～405 |
| 260 | 20 | 13 | PASS／PASS | 355～405 |

72 篇繁中均在 350～500 字；英文 72 篇均通過 120～450 words、無中文敘述。繁中字數只計 CJK 漢字，忽略標點、數字與 JSON keys；第十二篇包含 ninetyDayPlan 行動／問題，計畫不重複計入其他篇。

各樣例均有五層、不同固定主題與情境、正確 evidence、一至三個問題；九十天各階段至少三行動＋三問題。

負向測試拒絕：

- 缺篇、重複 ID、改 KIN、虛構圖騰、額外 oracle 欄位。
- 複製 interpretation、過短內容、unsupported 規則文字、財富保證、部分簡體字／英文混中文。
- 計畫行動／問題不足、錯誤日期邊界、過多 section 問題。
- 非 canonical signature、未知 reportVersion。

品質檢查是規則式工具：可抓完全重複段落、字數與部分風險詞，**不等於全面語意查重、完整簡繁辨識或真實 AI 品質保證**。不同 KIN 的 Mock 是編輯樣例加各自圖騰／音調線索，不宣稱已用模型驗證深度個人化。

### 實際執行

| 項目 | 結果 |
|---|---|
| 新版六 KIN／雙語／異常／相容性 | 3 tests PASS；其中第一項含 12 份完整報告 |
| 既有 KIN／外部參考 | 10 tests PASS；296 普通日期相符、5 個閏日既有差異保留 |
| 現有 Worker 計算／全商品 Mock 持久化／報告讀取 | 3 targeted tests PASS；含 2/29 422、跨會員與撤權 |
| Worker TypeScript／test types | PASS |
| Frontend TypeScript | PASS |
| 新檔案 targeted ESLint／Problems | PASS |
| 付費 AI、雲端 D1／部署／真人 E2E | NOT RUN，範圍外 |

使用既有 tsx／node:test runner。新 Mock 測試將 fetch 設為立即失敗，確保不會意外呼叫外部 AI。

## G. 舊版相容與 migration 方案

v2 未覆寫原 `MayaReport`。版本化 reader 能依傳入的可信 signature／locale：

- 接受合法的 legacy 499 Mock／Live JSON，不修改原 fields 或內容。
- 接受合法 `dreamspell-life-blueprint-v2` JSON。
- 拒絕未知版本／錯誤 evidence／不合法 legacy 模板。

v2 serializer 寫出純 JSON。**這是可用的獨立 codec，不是已接管正式 D1 reader。** 現有 API 的讀取繼續用既有 storedReport，已用本地 D1 回歸證明原報告可讀；NT199／699 的原生成輸出亦逐字相符。

### 提案，未建立或執行 migration

現有 report_content TEXT 足以容納新版 JSON，不需覆寫舊 JSON。建議下一階段：

1. 使用現有 prompt_version 分流，或 additive 新增 `report_version` nullable 欄位／以應用程式推定舊資料為 v1；不得將舊報告重生或回填成 v2。
2. 新建獨立 v2 section table，固定 section_id／index0～11與 JSON payload、state／usage／cost／retry 欄位，對應普通／管理者 report FK；保留原七段表，避免直接改 CHECK 或重建舊表。
3. 對十二篇制定 per-section 輸出／費用預留，評估九十天 payload 大小；若沿用現有每段 NT$0.0567 預留，十二段為 NT$0.6804，僅是預留公式而非實際成本測量。正式每訂單 NT$1 限制仍須檢查重試／內容長度影響。此輪不修改任何成本政策。
4. 第十二篇在前十一篇完成後生成，並只傳入經驗證的摘要與原 evidence；失敗保留可核對狀態，已完成篇不重複計費。
5. 先在全新本地 D1 驗證 additive 相容、舊報告、一般／管理者隔離，再取得獨立 migration／Live 測試／部署授權。

不執行 migration、不更動原 025／027／028 或付費權限。

## H. 第二階段前端建議

- 加 `reportVersion` adapter，v1 繼續 heading／body，v2 使用 fixed ID，禁止靠標題辨識。
- 桌面十二篇目錄＋閱讀進度；手機可折疊篇章。先做視覺化，不一次載入大量分頁状态。
- A 層獨立「程式計算依據」卡，B～E 分層排版，醒目區分客觀識別與象徵解讀。
- unsupported 配置集中顯示未支援，不顯示虛構圖示或配置。
- 90 天以三階段卡呈現行動／問題；勾選僅視為練習紀錄，不混入新的授權或命定評分。
- 驗證中英文十二篇、鍵盤／手機可讀性、私人 noindex、v1／v2 可讀及 stale-version處理；不改登入或付款。

本階段結束；等待第二階段確認。
