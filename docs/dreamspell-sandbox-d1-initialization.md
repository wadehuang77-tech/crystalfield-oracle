# Dreamspell Sandbox D1 initialization

後續更新（2026-10-10）：已在新的有限授權下補齊缺少 schema（含 027）與 Cards seed，
最終遠端唯讀驗證 PASS；沒有重跑既有兩 Customer 表。
參見 [最後外部整合驗收](dreamspell-final-external-acceptance.md)。
以下保留原初始化階段的實際 BLOCKED 紀錄，不將當時未執行的項目改為 PASS。

驗收日期：2026-10-10（Asia/Taipei）。

## 結論：BLOCKED，遠端初始化尚未完成

本地完整初始化、雙語 seed、schema／外鍵／索引驗證已通過。遠端第一份 Customer 基礎 SQL 已成功建立兩張空白資料表，但 Wrangler 遠端檔案匯入在 `--json` 結果前輸出進度文字，導致執行器 JSON 解析失敗。

**依使用者要求立即停止後續遠端寫入，不自動重試、不清空、不回滾、不部署。**

後續只做遠端唯讀查詢、正式環境 baseline 比對，以及本地輸出解析修正與全新本地 D1 重跑。不得將本地 PASS 當成遠端初始化完成。

## 授權與安全邊界

唯一允許遠端寫入的目標：

| Binding | 名稱 | UUID |
|---|---|---|
| DB | crystalfield-maya-sandbox-customer | `1ad83812-c5ac-425d-b1bd-fbcd539919fa` |
| DB_CARDS | crystalfield-maya-sandbox-cards | `71cd2302-f5a3-483c-a838-187d7b858e4c` |

已透過 zone API 確認 active `crystalfield101.com` 位於 account `9c7e7a59a9512d771d6e322c6927859b`。遠端執行前另以個別 D1 detail API 核對兩庫的名稱、UUID、`num_tables=0`，不只依賴列表 API 的表數欄位。

兩個測試 UUID 彼此不同，且不等於三個既有正式資料庫 UUID：

- customer：`64583df1-9f69-4164-8a89-c6dec6b4ac61`
- cards：`7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7`
- vibe-coding-business-db：`f4bff00e-b58c-494f-80e0-2b39a9338ab1`

每次 SQL 都明確指定 [測試 Wrangler 設定](../worker/wrangler.maya-test.json) 與資料庫名稱。執行器每次都重新檢查 config 的 UUID、account、binding，遠端 SQL 前再讀取目標 D1 detail。沒有使用預設正式 Wrangler 設定，也沒有執行整個正式 migration 目錄。

## A. Customer 資料表與依賴

### 遠端目前實際存在

| 資料表 | 筆數 | 狀態 |
|---|---:|---|
| profiles | 0 | PASS：基礎會員欄位、Email 唯一約束、索引存在 |
| multi_spread_free_unlocks | 0 | PASS：Google 登入合併匿名使用次數的必要依賴 |

上述兩表尚不足以完成 Google 登入；`token_generation`、member metadata、rate limit 與 Maya 資料表仍未建立。

### 本地完整流程已建立

1. `profiles`
2. `multi_spread_free_unlocks`
3. `rate_limit_events`
4. `orders`
5. `profile_member_metadata`
6. `maya_kin_profiles`
7. `maya_kin_content`
8. `maya_daily_energy`
9. `maya_entitlements`
10. `maya_reports`
11. `maya_rate_limits`
12. `maya_sandbox_orders`

本地上述 12 表全部 0 筆；未匯入會員、訂單、生日、Google subject、session、報告或 entitlement fixtures。

依賴與執行順序：

- `profiles` 基礎欄位取自現有 schema；migration 006 加 `token_generation`，供 session JWT generation 驗證。
- migration 018 的 `profile_member_metadata.user_id` 外鍵指向 `profiles`，Google subject 使用部分唯一索引。
- Google 登入呼叫 `mergeAnonymousOracleUsageIntoProfile`，會查詢 `multi_spread_free_unlocks`；故必須建立這張空白依賴表，但不匯入其他塔羅業務。
- migration 003 提供 Google 登入端點的通用 rate limit schema。
- migration 004 的 `orders` 必須先於 025、026；保留既有欄位與索引，沒有修改正式付款表設計。
- migration 025：會員 profiles → KIN profiles／rate limits；profiles + orders → entitlements；profiles + KIN profiles + orders + entitlements → reports。
- migration 026：profiles + orders → sandbox orders；`trade_no` 與 `(user_id, checkout_key)` 唯一約束存在。
- 現有 session 為 JWT cookie，不需要另造 session 資料表。

未為完整既有 `/api/profile` 的其他命理 membership／subscription 功能初始化無關 schema。本次範圍是 Google 登入、`/api/auth/me`、Maya 個人資料與 Sandbox 所需資料表，不代表既有 Worker 所有其他端點都能在此最小測試庫使用。

## B. Cards 資料表

遠端 Cards D1 目前仍為 **0 張業務資料表、0 筆 seed**；未進入 Cards 寫入步驟。

本地完整流程：

| 資料表 | 本地筆數 | 用途 |
|---|---:|---|
| decks | 0 | 既有卡牌讀取 schema |
| cards | 0 | 既有卡牌欄位／deck-key 唯一索引 |
| deck_localizations | 0 | 英文讀取依賴 |
| card_localizations | 0 | 英文讀取依賴，複合外鍵指向 cards |
| maya_kin_content | 520 | 已驗證的 Dreamspell 雙語內容 |

沒有匯入正式牌庫、私人解讀 payload 或合成卡牌 fixtures。

### 內容位置的明確決策

本次詢問後，使用者選擇：

> Cards 匯入完整 520 筆；Customer 保留 migration 025 的空白內容表。現有 API 的 Cards 內容串接留待下一階段。

現有 [Maya API](../worker/src/maya.ts) 的 `freeContent` 仍使用 Customer `DB.maya_kin_content` 並按需產生免費摘要。本次沒有改寫該行為。

所以 **Cards 的 seed 尚未被現有 Maya API 直接讀取**；不得將「本地 Cards 520 筆」宣稱為完成 API 串接。

## C. 實際 SQL 與 migration

| 順序 | SQL | 本地 | 遠端 |
|---:|---|---|---|
| C1 | [customer-base.sql](../d1/maya-sandbox/customer-base.sql) | PASS | PASS：已執行，兩表皆空白 |
| C2 | [003-rate-limit-events.sql](../d1/migrations/003-rate-limit-events.sql) | PASS | NOT RUN |
| C3 | [004-orders.sql](../d1/migrations/004-orders.sql) | PASS | NOT RUN |
| C4 | [006-token-generation.sql](../d1/migrations/006-token-generation.sql) | PASS | NOT RUN |
| C5 | [018_profile_member_metadata.sql](../d1/migrations/018_profile_member_metadata.sql) | PASS | NOT RUN |
| C6 | [025_maya_dreamspell.sql](../d1/migrations/025_maya_dreamspell.sql) | PASS | NOT RUN |
| C7 | [026_maya_sandbox_checkout.sql](../d1/migrations/026_maya_sandbox_checkout.sql) | PASS | NOT RUN |
| K1 | [cards-base.sql](../d1/maya-sandbox/cards-base.sql) | PASS | NOT RUN |
| K2 | [001_card_localizations.sql](../d1/cards-migrations/001_card_localizations.sql) | PASS | NOT RUN |
| K3 | [cards-maya-content.sql](../d1/maya-sandbox/cards-maya-content.sql) | PASS | NOT RUN |
| K4 | [maya-kin-content-seed.sql](../d1/maya-kin-content-seed.sql) | PASS | NOT RUN |

採用 `wrangler d1 execute --file` 精確執行上述檔案，不是 `d1 migrations apply`。**沒有建立或填寫 Wrangler `d1_migrations` ledger，也沒有宣稱其他 migration 已套用。** 後續不得直接對此最小測試庫套用正式全目錄；006 是一次性的 ALTER，需要以已核對狀態管理執行紀錄。

本地另重跑 018、025、026 及 Cards seed，驗證可重複 subset 不產生額外資料。006 沒有重複執行。

### 破壞性 SQL 稽核

- 既有 [customer-schema.sql](../d1/customer-schema.sql) 與 [cards-schema.sql](../d1/cards-schema.sql) 含 `DROP TABLE`，**均未執行**。
- 本次選定 SQL 沒有 `DROP`、`TRUNCATE`、`DELETE FROM`、`UPDATE` 或 `REPLACE` 陳述式。
- migration 006 僅 `ALTER TABLE ... ADD COLUMN`。
- seed 僅 `INSERT OR IGNORE INTO maya_kin_content`，不是會覆寫資料的 `INSERT OR REPLACE`。
- `ON DELETE CASCADE` 是保留的外鍵定義，不是初始化時執行資料刪除；沒有關閉外鍵。
- Cards 的 decks／cards schema 保留現有結構；沒有擅自替既有 cards 表增加新的 deck 外鍵。

## D. Seed 筆數、語言與版本

| 位置 | zh-TW | en | 合計 | 結果 |
|---|---:|---:|---:|---|
| 本地 Cards | 260 | 260 | 520 | PASS |
| 本地 Customer | 0 | 0 | 0 | PASS：依使用者選擇 |
| 遠端 Cards | 0 | 0 | 0 | NOT RUN：匯入被停止 |
| 遠端 Customer | 0 | 0 | 0 | Maya 內容表尚未建立 |

本地逐筆核對 KIN 1–260 的兩語言組合、solar seal、tone、summary 與 `maya-reflection-1` content version，並核對英文資料沒有中文字元。資料與既有確定性引擎／免費摘要 helper 一致；沒有呼叫 AI、沒有重新生成外部參考資料。

## E. 本地與遠端結果

| 項目 | 結果 | 證據／限制 |
|---|---|---|
| Account／zone、UUID、初始空白狀態 | PASS | 個別 D1 detail API 核對 |
| SQL 最小依賴與破壞性指令稽核 | PASS | 拒絕正式 DROP schema；固定 SQL allowlist |
| 全新本地 D1 初始化 | PASS | Wrangler `--local`、全新獨立 persistence directory |
| 本地 migration subset 重跑 | PASS | 018／025／026；不重複 ALTER 006 |
| 本地外鍵、欄位、索引 | PASS | table_info、foreign_key_list、index_list、foreign_key_check |
| 本地 520 筆內容與重复 seed | PASS | 各語言 260；重跑仍為 520 |
| TypeScript | PASS | `npm.cmd --prefix worker run typecheck:maya-tests` |
| 初始化 runner ESLint | PASS | 精確檢查新增 runner |
| Maya Worker／D1／授權／付款回歸 | PASS | 12 Maya + 8 Sandbox，20 passed、0 failed |
| 初次本地 integrity_check | FAIL（已修正） | D1 回傳 `SQLITE_AUTH`；移除不支援 pragma 後從空白庫完整重跑 |
| 遠端第一份 SQL 的輸出解析 | FAIL | `--json` 前混入 `├ Checking...`，不是有效 JSON 起點 |
| 遠端 Customer 基礎表 | PASS | 唯讀確認兩表及索引，兩表均 0 筆 |
| 遠端完整登入／Maya／Sandbox schema | BLOCKED | 後續 migration 未執行 |
| 遠端 Cards／520 seed | BLOCKED | 尚未開始写入 |
| 真實 Google／ECPay E2E | NOT RUN | 本次不部署，不設 Secrets，不付款 |
| Frontend build／瀏覽器流程 | NOT RUN | 本次為 D1 初始化，不改前端或公開入口 |

本地測試中的 Mock／合成付款結果不代表真實 Google 或綠界外部驗收通過。遠端沒有匯入測試會員、生日或付款 fixtures。

### 執行器行為與故障修正

[初始化 runner](../worker/scripts/maya-d1-initialization.ts) 固定兩個 UUID，只接受固定模式；每次 SQL 明確傳入 config。遠端初始化要求本地 PASS receipt、config／SQL／runner 的 SHA-256 fingerprint 一致，並要求兩個目標仍空白。

輸出解析已在本地修正為：先定位獨立 JSON array 起點，再嚴格 JSON.parse 並檢查每項 `success`。沒有把解析錯誤轉成成功、沒有吞掉失敗、沒有自動遠端重試。修正後再次在全新本地 D1 完整跑過，結果 PASS。

**目前不要重跑 `initialize-remote`：Customer 已非空白，程式會拒絕。** 現有 `verify-remote` 模式也要求完整 schema，因此不是部分狀態接續工具。

診斷與 local PASS receipt 留在本次 session artifacts，沒有將 token、OAuth Cookie 或 Secret 寫入報告。

## F. 正式環境隔離

失敗停止後，以唯讀 API 對照遠端執行前 baseline：

| 檢查 | 結果 |
|---|---|
| 三個既有正式 D1 detail metadata | PASS：逐項一致 |
| 正式 Worker deployment／version IDs | PASS：一致 |
| 三個既有 Worker script modified_on | PASS：一致 |
| 既有 Pages latest／canonical deployment IDs | PASS：一致 |
| 測試 Pages 無 deployment | PASS |
| 測試 Worker 無 code version／deployment，workers.dev／preview 關閉 | PASS |
| Worker domains／zone routes | PASS：一致 |
| GitHub Actions 最近 5 個 run ID／狀態 | PASS：一致，未觸發 workflow |
| 未新增 DNS | PASS：沒有任何 DNS 寫入操作；未將此聲明當成完整 DNS 後台稽核 |
| 未設定正式或測試付款 Secrets | PASS：沒有 Secret 設定操作 |
| 未複製正式會員、訂單、生日或報告 | PASS：遠端只有兩張空白基礎表 |
| 未 commit／push／deploy／真實付款／付費 AI | PASS：未執行 |

正式 baseline：

- bolt-tarot-customer：39 tables、14,966,784 bytes。
- bolt-tarot-cards：4 tables、2,412,544 bytes。
- vibe-coding-business-db：12 tables、217,088 bytes。
- bolt-tarot-api deployment：`173bfc94-152c-4669-aa6e-6a29acae1beb`。
- bolt-tarot-api active version：`df02072a-56a5-4f4f-97f5-b5760517272d`。
- bolt-tarot Pages latest／canonical：`9ade0032-3248-43e3-b8dc-6565bf6b8142`。
- vibe-coding-business Pages latest／canonical：`3c437faf-51ed-404a-9eb1-4acfeb88eaec`。
- 最近 CI and Deploy run：`37910055137`，2026-10-09T09:15:04Z，completed。

Metadata 一致及操作紀錄不是正式每筆資料的全量內容稽核；沒有讀取或匯出正式會員內容。

## G. 變更檔案

新增：

- [customer-base.sql](../d1/maya-sandbox/customer-base.sql)
- [cards-base.sql](../d1/maya-sandbox/cards-base.sql)
- [cards-maya-content.sql](../d1/maya-sandbox/cards-maya-content.sql)
- [maya-d1-initialization.ts](../worker/scripts/maya-d1-initialization.ts)
- 本報告

修改：

- [tsconfig.maya-tests.json](../worker/tsconfig.maya-tests.json)：納入新增 runner 的型別檢查。

沒有修改正式 Wrangler、Dreamspell 引擎、原有 migration／seed 或四大命理核心。測試 Wrangler 的兩個 UUID 保持原值。

## H. 下一階段條件

首先需要使用者明確授權**接續部分初始化**，不是刪除資料庫或重建：

1. 唯讀重新確認 Customer 恰有已核對的兩張空白基礎表、Cards 仍空白。
2. 建立／驗證僅對此精確部分狀態接續的流程；不重跑 Customer base，不自動猜測已套用 migration。
3. 本地模擬相同部分狀態，驗證剩餘 C2–C7、K1–K4。
4. 明確指定原兩個 UUID 後執行剩餘 SQL。
5. 完整比對本地與遠端 schema、外鍵、索引、520 筆內容，重新比對正式 baseline。

測試 Worker 部署仍需另一份獨立授權，前置條件包括：

- 遠端初始化及本次驗收全部通過。
- 再次核對僅綁定兩個測試 D1。
- 決定並實作 Cards Dreamspell seed 的讀取方式，或明確接受现有 Customer 按需摘要行為。
- 另授權設定專用測試 JWT／Google OAuth Client；不得使用正式 Secrets。
- ECPay Sandbox callback、測試金鑰、DNS／TLS 與公開入口都必須分別取得授權。
- Mock AI 保持啟用；checkout 維持關閉直到測試付款設定與驗收授權齊備。
- 不透過正式 CI/CD、不執行正式 migration。

**本次停止於 BLOCKED。未部署測試 Worker／Pages，等待下一次確認。**
