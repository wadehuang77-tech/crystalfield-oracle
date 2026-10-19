# 人類圖 SEO 第二階段：本機實作紀錄

內容更新日：2026-10-19。此輪不 commit、不 push、不部署；沒有正式資料庫變更、真實付費 AI 或付款呼叫。

## 查核範圍與既有狀態

- 先檢查 Git 狀態與專案、父層及此次目錄適用的 AGENTS.md，未找到適用規範檔。
- 只定位人類圖頁面、資料、計算欄位、共用 SEO／語言切換／路由與預先渲染設定。保留原有 GA4、印度占星與其他未提交檔案。
- 生命靈數 SEO 已提交至 `c5b8253`，本次沒有覆寫其內容及頁面；另外重跑生命靈數測試確認共用設定相容。
- 既有文章：types、generator、manifesting-generator、projector、manifestor、reflector、authority、profile、birth-time。五大類型沿用 `/human-design/{type}/`，沒有另建 `/types/{type}/`。
- 正式站首頁及 authority 頁均為 200，初始 HTML 已含 React 預先渲染正文；how-to-read 原為 404，因此本輪只新增此主題網址。
- 首頁已有 zh-Hant/en/x-default 雙向 hreflang。中文文章原本無 hreflang；既有英文文章路由有內容，但沒有公開預先渲染／索引配置，本次不擴增英文文章或虛構語言對應。新指南只有中文路由。
- 尾斜線會 308 到尾斜線版本；www 正式 canonical 維持不變。
- 全站問題：`https://crystalfield101.com/human-design/` 仍回應 200，未轉到 www。原 canonical 指向 www，本輪只記錄，不改網域策略。

## 修改與新增網址

- `/human-design/`：新 Title/H1、符合功能的描述、免費／付費界線、出生資料與模擬工具限制、新手順序、文章入口與 FAQ。保留表單在前方與既有驗證、登入規則。
- `/human-design/how-to-read/`：新增欄位辨識、策略／權威／角色／定義區分、中心顏色、新手觀察練習。
- `/human-design/generator/`、`manifesting-generator/`、`projector/`、`manifestor/`、`reflector/`：改善既有文章，每篇不同情境與練習；不引用人口比例。
- `/human-design/authority/`：沿用網址，區分身體內在權威與無內在權威，補充原始來源及本站結果不一致限制。
- `/human-design/types/`：補充五類呈現與生產者家族關係、五大類型導覽。
- `/human-design/birth-time/`：修正估計時間與本站能力說明，避免讓任意輸入被誤認為準確排盤。
- `/human-design/profile/`：正文保留，只沿用新版共用文章版型及標準尾斜線連結。

## 計算限制與來源

現有 `humanDesignCalc.ts` 使用生日、時間與城市字串產生固定種子的模擬輸出，不做天文星曆及完整時區換算。此輪沒有修改演算法。

現有權威標籤為薦骨、情緒（太陽神經叢）、脾臟（直覺）、自我（意志力）、G中心（自我投射）、月亮（無固定）。已知問題包括：生產者家族可能被分配脾臟權威、中心／通道與權威未依完整圖表一致判定、沒有 Mental Projector 分類，以及反映者介面寫 28 天。公開文章如實區分介面名稱與原始教學，不假裝修復引擎。

查閱的原始來源（各相關文章有標準連結）：

- [類型與策略](https://jovianarchive.com/pages/type-and-strategy-in-human-design)
- [權威入門教學](https://jovianarchive.com/products/beginner-2-type-strategy-and-inner-authority)
- [權威差異](https://jovianarchive.com/blogs/human-design-basics/trusting-your-inner-authority)
- [Mental Projector](https://jovianarchive.com/pages/mental-authority-in-human-design-a-projector-process)
- [自我投射權威](https://jovianarchive.com/pages/self-projected-authority-in-human-design-the-projectors-voice)
- [投射者](https://jovianarchive.com/pages/projector-human-design)
- [反映者](https://jovianarchive.com/pages/reflector-human-design)
- [定義](https://jovianarchive.com/pages/understanding-definition-in-human-design)
- [中心](https://jovianarchive.com/pages/the-nine-centers-of-the-bodygraph-in-human-design)
- [人生角色](https://jovianarchive.com/pages/understanding-profile-in-human-design)

來源用來核對體系概念，不代表科學證實；生活情境與練習為本站編寫，不是真實客戶案例。未新增作者經歷、認證、人口比例或評分。

## HTML、索引與結構化資料

- 沿用 build 時 `renderToString`、瀏覽器 `hydrateRoot`，同一份 React 正文，不增加第二個 SEO 正文區塊。
- 修正首頁進場動畫預設透明，讓停用 JavaScript 時 H1、表單與教學內容仍可見。
- 標準連結含 href、尾斜線與計算器錨點；結果類型旁加入對應文章連結，只改顯示層。
- 公開文章輸出 Article 及 BreadcrumbList；移除共用版型中無本次核實依據的作者署名與固定舊日期。只有有實際更新紀錄的文章輸出可見日期、dateModified 與 sitemap lastmod，值來自內容檔，不隨 build 改變。
- 首頁保留雙語 hreflang；新指南不建立英文頁、不輸出英文 hreflang，並隱藏通往不存在譯文的切換按鈕。
- sitemap 只納入公開頁面，不納入命盤、生日參數或報告狀態。私人結果顯示狀態設 noindex，未改登入及資料權限。
- 未變更原 `robots.txt`、全站 canonical 網域、Cloudflare 404.html 或精確路由轉寫策略。

## 修改檔案

- `app/src/data/human-design/articles.json`
- `app/src/data/human-design/faqs.json`
- `app/src/lib/humanDesignSeo.ts`（新增）
- `app/src/pages/human-design/LandingPage.tsx`
- `app/src/pages/human-design/HumanDesignSeoContent.tsx`
- `app/src/pages/human-design/HumanDesignTypesSection.tsx`
- `app/src/pages/human-design/HumanDesignArticlePage.tsx`
- `app/src/pages/human-design/HeroCardPage.tsx`
- `app/src/pages/HumanDesignPage.tsx`（只加結果狀態 robots）
- `app/src/components/SeoMetadata.tsx`
- `app/src/components/LanguageSwitcher.tsx`
- `app/src/App.tsx`
- `app/seo/prerender-routes.mjs`
- `app/scripts/prerender.mjs`
- `app/scripts/verify-prerender-seo.mjs`
- `app/scripts/human-design-seo-check.ts`（新增）
- 本紀錄（新增）

## 驗證與重跑方式

從專案根目錄：

```powershell
npm.cmd --prefix app run build
npm.cmd --prefix app run typecheck
npm.cmd --prefix app run test:hydration
```

從 app 目錄：

```powershell
npx.cmd tsx scripts/human-design-seo-check.ts
npx.cmd tsx scripts/numerology-seo-check.ts
```

驗證項目：50 條預先渲染路由、11 個人類圖公開頁的初始正文與 JS 接管、單一 H1／canonical／JSON-LD、來源與文章連結、重新整理、320／375／1280px 無橫向溢出、真實內容更新日期、模擬登入及表單結果與原演算法一致、付費權限仍 locked、私人結果 noindex。測試會比對計算、API、AuthProvider、ReportPage、生命靈數核心檔案與 HEAD 相同。所有測試 API／外部請求均攔截，不會送出真實生日、付費 AI 或支付請求。

手機截圖放在系統暫存目錄 `crystalfield-human-design-seo`，不混入網站資產。

## 未驗證與後續事項

- 本輪未部署，新指南的正式 Cloudflare HTTP 回應及搜尋引擎索引尚未驗證。本機靜態產物驗證未知文章與不存在英文指南為 404，沒有新增萬用 SPA rewrite。
- 正式登入、正式排圖準確度、AI 解讀、付款與解鎖端到端流程未驗證。模擬登入測試不代表這些流程通過。
- 前述演算法限制仍存在，需另案替換正式計算服務；本輪僅修正公開說明及 SEO。
- 非 www 的網域統一與既有英文文章索引狀態屬後續工作，本次不擴大重構。
- 保留既有大型 bundle 警告，未進行全站拆包。
