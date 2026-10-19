# 生命靈數 SEO 本機實作紀錄

更新日期：2026-10-19。未 commit、push 或部署；未呼叫正式付費 AI、付款或資料庫變更。

## 既有設定與範圍

- 已檢查 Git 狀態，以及專案與此次使用目錄的父層 AGENTS.md；未找到適用檔案。
- 既有未提交的 GA4、印度占星、文件與其他未追蹤內容未修改。
- 正式站 `/numerology/`、`/en/numerology/` 回傳 200，已有獨立 title、canonical、index/follow、雙向 zh-Hant/en/x-default 及含表單的預先渲染 HTML。
- 四篇建議文章在專案中尚不存在，正式網址亦回傳真正 404；沒有建立同主題重複網址。
- 保留既有 robots.txt、尾斜線、公開首頁中英文對應、404.html 與 Cloudflare Pages 精確路由策略。
- 原 sitemap 未使用 lastmod，本次維持省略，不在 build 時批次製造更新日期。文章可見更新日期及 Article.dateModified 固定為實際內容修改日。

## 實作

- 首頁更新 title/H1/description；保留前方計算器與登入流程。
- 新增免登入公開介紹、使用步驟、免費／付費差異、虛構生日示範、四篇文章入口及 FAQ。
- 新增 `/numerology/how-to-calculate/`、`life-path-1/`、`life-path-7/`、`life-path-9/`，包含各自 metadata、正文、麵包屑、Article 與延伸閱讀。
- 不建立英文文章；新文章不輸出 hreflang，不提供指向不存在譯文的語言切換。
- 共用內容來源 `articles.json` 與 `numerologySeo.ts`。沿用 build 期間 React renderToString 和瀏覽器 hydrateRoot，沒有額外爬蟲正文或重複 SEO 區塊。
- 所有文章與首頁納入 sitemap；沒有會員結果、生日參數或付費頁。個人結果狀態另設 noindex；登入及權限驗證仍保留。
- 未變更 `calculateNumerology`、登入、checkout、AI、方案價格或解鎖邏輯。

## 教學採用的實際規則

- 主命數：整個西元生日逐位加總，縮減遇到 11、22、33 停止。
- 生日數：只縮減日，同樣保留大師數。
- 缺失數：原始生日數字中未出現的 1–9；不將主命數加入。
- 九宮格另加入生日逐位總和的數字，因此與缺失數規則不同。
- 目前流年固定使用 2026，以「整數月份＋整數日期＋2026」後縮減。教學明確揭露，不更改算法或宣稱可選任意年度。
- 虛構示範 1990-12-31：主命數 8、生日數 4、缺失 4/5/6/7/8、2026 流年 8。

## 驗證與重跑

從專案根目錄：

```powershell
npm.cmd --prefix app run build
npm.cmd --prefix app run typecheck
npm.cmd --prefix app run test:hydration
```

從 app 目錄：

```powershell
npx.cmd tsx scripts/numerology-seo-check.ts
```

- Production build 與 49 條路由預先渲染 SEO 檢查通過。
- TypeScript、49 條路由 hydration 結構檢查通過。
- 五個生命靈數頁面，開啟／停用 JS 皆有主要正文；單一 H1、canonical、JSON-LD，無 hydration 錯誤。
- 320／375／1280px 無橫向溢出；文章連結及返回計算器錨點有效。
- 主命數、生日數、缺失數、九宮格、固定流年與 11/22/33 的測試通過。
- 使用虛構測試使用者，驗證訪客登入提示與登入後計算結果、結果 noindex，未取得付費權限。
- 所有測試 API 與外部請求被攔截，沒有真實登入、付款、付費 AI 呼叫。
- 本機靜態伺服器驗證未知文章與不存在英文文章回傳 404；建置產物無 numerology 萬用 SPA rewrite。

## 未驗證及後續事項

- 本次不部署，尚未驗證新文章在正式 Cloudflare Pages 的發布狀態、HTTP 404 或搜尋引擎索引。
- 正式登入、付款、AI 解讀與解鎖端到端未測試；僅檢查本次未修改其邏輯，並執行模擬登入計算。
- 現行流年年份固定為 2026；未來年度更新需另行處理計算程式與教學，不能僅修改 SEO 文案。
- Build 仍有既有大型 JavaScript bundle 提醒，這次未進行全站拆包。
