# 晶域心語 Tarot Cards

以 React + Vite 建立的線上抽牌與牌陣解讀網站，後端使用 Cloudflare Workers + D1。專案包含多個牌組、會員登入、Email 解鎖、付費牌陣、綠界付款回傳、管理後台與 KPI 追蹤。

## 技術棧

- Frontend: React 18, Vite, TypeScript, React Router, Tailwind CSS
- Icons: lucide-react
- Backend: Cloudflare Workers, Wrangler
- Database: Cloudflare D1
- Payment: ECPay 綠界
- Email: Resend / MailChannels 設定欄位

## 專案結構

```text
.
├── src/                 # 前端 React App
│   ├── pages/           # 頁面與路由
│   ├── components/      # 共用 UI 元件
│   ├── hooks/           # 前端 hooks
│   ├── lib/             # API、付款導轉、追蹤工具
│   ├── contexts/        # Auth context
│   └── utils/           # 牌陣解讀工具
├── worker/              # Cloudflare Worker API
│   ├── src/
│   ├── wrangler.toml
│   └── package.json
├── d1/                  # D1 schema、seed、migration
├── public/              # 靜態資源
└── dist/                # 前端 build 輸出
```

## 主要功能

- 多牌組抽牌: Tarot、Osho、Lightworker、Unicorns、Dragons、Egyptian Gods、Work Your Light
- 單張牌與多張牌陣解讀
- Email gate 免費解鎖
- 會員註冊、登入、登出、忘記密碼
- 付費牌陣訂單建立與綠界付款回傳
- 管理後台: 使用者、訪客 email、訂單、管理員、KPI
- 轉換事件與頁面瀏覽追蹤

## 前置需求

- Node.js 18+
- npm
- Cloudflare 帳號與 Wrangler 登入權限
- 兩個 Cloudflare D1 database:
  - `DB`: 客戶、會員、訂單、事件資料
  - `DB_CARDS`: 牌組與牌義內容

## 安裝

```bash
npm install
cd worker
npm install
cd ..
```

## 環境變數

前端使用 `.env` 或部署平台環境變數:

```bash
VITE_API_BASE=
```

開發時可留空，`vite.config.ts` 會將 `/api/*` proxy 到本機 Worker:

```text
http://127.0.0.1:8787
```

生產環境請設定為 Worker API 網址，例如:

```bash
VITE_API_BASE=https://api.example.com
```

Worker secrets 使用 Wrangler 設定，不要寫進 git:

```bash
cd worker
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ECPAY_HASH_KEY
npx wrangler secret put ECPAY_HASH_IV
```

`ECPAY_HASH_KEY` 與 `ECPAY_HASH_IV` 若尚未啟用正式付款可先不設定，但正式環境需要填入綠界提供的值。

## 本機開發

開兩個 terminal。

Terminal 1: 啟動 Worker API

```bash
cd worker
npm run dev
```

Terminal 2: 啟動前端

```bash
npm run dev
```

預設前端網址:

```text
http://localhost:5173
```

## D1 資料庫

建立 D1 database:

```bash
cd worker
npx wrangler d1 create bolt-tarot-customer
npx wrangler d1 create bolt-tarot-cards
```

將產生的 `database_id` 填入 `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "bolt-tarot-customer"
database_id = "..."

[[d1_databases]]
binding = "DB_CARDS"
database_name = "bolt-tarot-cards"
database_id = "..."
```

套用 schema 與 seed:

```bash
cd ..
npx wrangler d1 execute bolt-tarot-customer --remote --file=./d1/customer-schema.sql
npx wrangler d1 execute bolt-tarot-customer --remote --file=./d1/customer-seed.sql
npx wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-schema.sql
npx wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-seed.sql
```

> 注意: schema 檔案含有 `DROP TABLE IF EXISTS`，執行前請確認目標環境與資料備份。

## 常用指令

前端:

```bash
npm run dev        # 啟動 Vite dev server
npm run build      # 建置前端
npm run preview    # 預覽 dist
npm run lint       # ESLint
npm run typecheck  # TypeScript type check
```

Worker:

```bash
cd worker
npm run dev        # 啟動 wrangler dev，預設 port 8787
npm run deploy     # 部署 Worker
npm run types      # 產生 Worker 型別
```

## 主要頁面

- `/`: 首頁
- `/auth`: 登入 / 註冊
- `/tarot`: Tarot 牌陣
- `/tarot-single`: Tarot 單張牌
- `/lightworker`: Lightworker
- `/lightworker/celtic-cross`: Lightworker Celtic Cross
- `/unicorns`: Unicorns
- `/dragons`: Dragons
- `/egyptian-gods`: Egyptian Gods
- `/work-your-light`: Work Your Light
- `/work-your-light-single`: Work Your Light 單張牌
- `/cosmic-cross`: Cosmic Cross
- `/osho`: Osho
- `/osho/single`: Osho 單張牌
- `/osho/three`: Osho 三張牌
- `/checkout/return`: 付款回到站內頁
- `/admin`: 管理後台
- `/admin/settings`: 管理員設定
- `/admin/kpi`: KPI 儀表板

## API 概覽

Worker API 主要集中在 `worker/src/index.ts`:

- Auth: `/api/auth/signup`, `/api/auth/signin`, `/api/auth/signout`, `/api/auth/me`
- Password reset: `/api/auth/request-password-reset`, `/api/auth/verify-reset-code`, `/api/auth/reset-password`
- Cards: `/api/decks`, `/api/decks/:deckId/preview`, `/api/cards/single-unlock`, `/api/cards/spread-unlock`
- Leads and tracking: `/api/save-email`, `/api/track`, `/api/conversion-events`
- Checkout: `/api/checkout/create-order`, `/api/checkout/result`, `/api/checkout/catalog`, `/api/orders/:id`
- Admin: `/api/admin/*`, `/api/metrics/daily`
- ECPay webhook: `/api/ecpay-webhook`

## 部署

1. 建置前端:

   ```bash
   npm run build
   ```

2. 部署 Worker:

   ```bash
   cd worker
   npm run deploy
   ```

3. 確認部署平台或靜態站台已設定:

   ```bash
   VITE_API_BASE=https://你的-worker-api-domain
   ```

4. 確認 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS` 包含正式前端網域。

## 開發注意事項

- 前端 API client 位於 `src/lib/api.ts`。
- Dev 模式下前端的 `/api` 會由 Vite proxy 到 `http://127.0.0.1:8787`。
- Worker 的 mutating request 會檢查 Origin，正式部署時務必更新 `ALLOWED_ORIGINS`。
- D1 分成客戶資料庫與牌組內容資料庫，避免把敏感客戶資料與牌義內容混在同一個 binding。
- 管理後台路由由 `ProtectedRoute` 保護，實際管理員權限仍由 Worker admin API 檢查。
- 付款相關流程請先在測試環境驗證綠界 hash key、hash IV、回傳 URL 與 webhook。
