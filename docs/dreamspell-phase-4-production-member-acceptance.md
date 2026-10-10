# Dreamspell Phase 4 正式會員驗收

日期：2026-10-10，Asia/Taipei。

## 目前結果：BLOCKED，使用者選擇保持關閉並停止

本階段完成唯讀正式環境查核，使用者人工回報兩個帳號的中文／英文 Google 登入、導回與登出成功；這不是 agent 直接觀察的瀏覽器 E2E 證據。後續授權受控 allowlist 本地開發，但未取得兩個測試會員 ID；使用者明確選擇「無法取得 ID，保持關閉並停止」。沒有部署、migration、seed、Secrets／OAuth 修改、付款、付費 OpenAI、commit 或 push。

## 正式環境確認

| 項目 | 結果 |
|---|---|
| Worker deployment | PASS：`b8a2d6c2-74bb-40ed-9e42-d25b17d088e5` |
| Pages deployment | PASS：`284f65fc-33d2-44ce-99fb-7c438c481ccb` |
| 發布基底 SHA | 前階段為 `64d62ee55c8c8b4715c6dcc01410242975455f51`，加未提交 Dreamspell overlay；不是新 commit |
| Customer binding | PASS：正式 `64583df1-9f69-4164-8a89-c6dec6b4ac61` |
| Cards binding | PASS：正式 `7e74927a-0213-4ad5-bd4a-87cf4ea5c1a7` |
| 025／027 ledger 與 Maya schema | PASS：唯讀確認；沒有重跑 |
| Sandbox 026 | NOT RUN；正式 ledger 沒有 026 |
| 公開內容 | PASS：zh-TW 260、en 260 |
| 既有會員／訂單 | 25／388，與上階段 aggregate 相同；本次不讀個別資料 |
| Maya profiles／reports | 各 0 筆 |

唯讀證據保存於 session files 的 `phase4-readonly-result.json`。本次只讀 schema、migration 名称、aggregate counts、binding 名稱與 D1 UUID；不讀其他會員生日、個別會員／訂單內容、Secrets 或 Session 值。

## A. Google 登入

- 正式 allowed Origin 下 `/api/auth/google/config`：PASS，HTTP 200，client_id／csrf_token 存在；值不保留、不輸出。
- 共用現有 AuthContext、AuthPage 與 `/api/auth/google`，沒有第二套會員系統。
- 後端既有 Google 驗證檢查 JWKS、RS256、audience、issuer、expiry 與 CSRF，並使用現有 session。
- 真實 Google 中文／英文登入、原頁導回與登出：**人工回報成功**，未由 agent 直接驗證；Session Cookie 屬性與後端 session 交叉驗證 NOT RUN。
- Browser CDP 連線逾時，不能宣稱已觀察真人登入或自行借用其他瀏覽器的 Session。

### 人工操作

只使用兩個已授權測試 Google 帳號，不操作其他會員。

1. 帳號 A 打開：
   https://www.crystalfield101.com/login?redirect=%2Fmaya-calendar%2Fmember
2. 按 Google 登入，在 Google 視窗中自行授權；不要提供密碼、Cookie、Token。
3. 確認返回 `/maya-calendar/member`，記錄頁面是否顯示已登入／登出選單；會員頁仍應顯示尚未開放。
4. 登出，確認帳戶選單轉為登入。
5. 帳號 B 使用獨立瀏覽器 profile 或無痕視窗：
   https://www.crystalfield101.com/en/login?redirect=%2Fen%2Fmaya-calendar%2Fmember
6. Google 登入後確認英文路由／介面、登入選單；完成後登出。
7. 只回報成功／失敗、最後頁面路徑與已遮蔽個資的錯誤文字，不提供 Email、JWT 或其他憑證。

以上只驗證現有登入與導回，不等同 Dreamspell 資料儲存、會員隔離通過。

## B–D. 會員結果、KIN／生日與隔離

| 項目 | 狀態 |
|---|---|
| 中文／英文真實登入導回 | 人工回報成功；agent 自動驗收 NOT RUN |
| 登入後 KIN 計算 | NOT RUN／BLOCKED：member gate false |
| 生日與個人 KIN 儲存 | NOT RUN／BLOCKED |
| 每日免費會員能量 | NOT RUN／BLOCKED |
| A／B 會員資料隔離 | NOT RUN：尚無授權測試登入與資料 |
| 登出後私人 API 授權 | NOT RUN：尚未完成登入／登出對照 |
| gate 關閉時 profile／daily／reports | PASS：實際 HTTP 503 |

HTTP 503 是功能封鎖證據，不是 Session 401／會員隔離驗收。前階段本地測試不能替代此次真實會員驗收。

### 前置限制

正式部署的現有程式沒有「只允許兩個指定測試會員」的受控驗收入口。`MAYA_MEMBER_ENABLED=false` 會在 session／KIN 處理之前拒絕所有會員，所以不能在這個 gate 下完成生日儲存與 A／B 隔離。

依本次「全部 PASS 才開啟」要求，不可先暫時開放一般會員。使用者後續授權 session-bound 的兩會員 allowlist，已完成本地實作，但沒有部署：

- 新增可選 `MAYA_MEMBER_TEST_USER_IDS`，只接受兩個不同、有效的會員 ID。
- 從正式驗證 Session 取得身分，不接受前端 user_id 指定測試資格。
- 個人化 config 不返回 allowlist；前端登入／登出時重新驗證設定。
- 測試資格只開放免費會員操作，不繼承 payment／AI／Sandbox 權限。
- malformed allowlist fail closed。
- TypeScript／ESLint：PASS；前端 5 個既有 warnings。
- Worker 25 tests：首次 24 PASS、1 FAIL；新增測試先建立每日能量造成後續既有 cache count 測試污染，已移除該新測試的 daily 呼叫。**修正後 rerun NOT RUN**，使用者要求停止，不將整套測試宣告 PASS。
- 未取得指定測試會員 ID，本機 `phase4-test-members.json` 保持空 allowlist。

本地修改：worker/src/utils.ts、mayaFeatures.ts、maya.ts、mayaPayments.ts、worker/scripts/maya-phase2-check.ts、app/src/pages/MayaCalendarPage.tsx。全部未提交、未部署；正式服務仍維持原版本／開關。

## E. 正式 D1 變更範圍

Agent 本次 0 D1 寫入，未新增／修改／刪除生日、會員、訂單或報告。使用者人工登入可能依既有登入流程產生正常帳號／使用紀錄；人工操作後未再次查核 aggregate，不宣稱人工操作完全沒有資料變更。

## F. 實際開關

| 開關 | 值 |
|---|---|
| MAYA_PUBLIC_ENABLED | true |
| MAYA_MEMBER_ENABLED | false |
| MAYA_PAYMENT_ENABLED | false |
| MAYA_AI_ENABLED | false |
| MAYA_SANDBOX_ENABLED | false |

## G. 既有系統

- 正式部署未變，既有 Google config 可用，會員／訂單 aggregate 未變。
- 本次沒有修改現有四大系統或登入程式。
- 四大系統真實登入後操作：NOT RUN；前次基本 HTTPS／本地 regression PASS 不是此次完整會員驗收。

## H. 是否可開始正式付款驗收

**否。** 真實會員驗收尚未全部通過，官方 Sandbox 三商品與正式金流安全檢查也尚未完成。付款、AI、Sandbox 必須保持關閉；沒有付費 AI 或實際扣款授權。

目前停止點：兩帳號登入由使用者人工回報成功，但無法取得 allowlist ID，使用者要求保持關閉並停止。正式會員資料儲存／隔離驗收 BLOCKED；不宣告 Phase 4 PASS，也不執行任何後續部署。
