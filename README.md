# 晶域心語 Crystalfield Oracle

React + Vite 前端搭配 Cloudflare Workers + D1 後端的靈性占卜平台，涵蓋塔羅牌占卜、生命靈數水晶分析、會員制度、綠界付款與管理後台。

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 18、Vite、TypeScript、React Router、Tailwind CSS |
| 後端 | Cloudflare Workers、Wrangler |
| 資料庫 | Cloudflare D1（兩個獨立 binding） |
| 付款 | 綠界 ECPay |
| 寄信 | Resend |

## 專案結構

```text
crystalfield-oracle/
├── app/                    # 前端 React App
│   ├── src/
│   │   ├── pages/          # 頁面與路由
│   │   ├── components/     # UI 元件
│   │   │   └── numerology/ # 生命靈數水晶分析元件
│   │   ├── hooks/          # React hooks（含 usePremium）
│   │   ├── lib/            # API client、付款導轉、靈數計算、追蹤
│   │   ├── contexts/       # AuthContext
│   │   └── utils/          # 牌陣解讀工具
│   ├── public/             # 靜態資源
│   ├── scripts/            # Smoke test
│   └── package.json
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   ├── wrangler.toml
│   └── package.json
└── d1/                     # D1 schema、seed、migration
    ├── migrations/         # 版本化 migration 檔（001、002…）
    ├── customer-schema.sql
    ├── cards-schema.sql
    └── *.sql
```

## 主要功能

**塔羅占卜**
- 七個牌組：Tarot、Osho、Lightworker、Unicorns、Dragons、Egyptian Gods、Work Your Light
- 單張牌與多張牌陣（含 Celtic Cross、Cosmic Cross）
- Email gate 免費解鎖、付費牌陣訂單與綠界付款回傳

**生命靈數水晶分析**（`/numerology`）
- 依生日計算生命靈數、缺失數字、水晶能量
- 每日能量指引、AI 顧問、升級解鎖

**後台與追蹤**
- 會員註冊、登入、忘記密碼
- 管理後台：使用者、訪客 email、訂單、管理員、KPI 儀表板
- 轉換事件與頁面瀏覽追蹤
- 月費會員定期定額管理（綠界信用卡 recurring）

## 訂閱上線文件

月費會員定期定額的 migration、測試流程與已知限制請看：

- [docs/subscription-rollout.md](/Users/mac/Projects/crystalfield-oracle/docs/subscription-rollout.md)

## 前置需求

- Node.js 18+
- Cloudflare 帳號並已執行 `wrangler login`
- 兩個 Cloudflare D1 database（見下方 D1 章節）

## 安裝

```bash
# 前端
cd app
npm install

# Worker
cd ../worker
npm install
```

## 環境變數

### 前端（`app/`）

複製範例：

```bash
cp app/.env.example app/.env.local
```

| 變數 | 說明 |
|------|------|
| `VITE_API_BASE` | Worker API 網址（開發時留空，Vite 會自動 proxy） |

開發時留空即可，`vite.config.ts` 已設定將 `/api/*` proxy 到 `http://127.0.0.1:8787`。

生產環境範例：

```bash
VITE_API_BASE=https://api.crystalfield101.com
```

### Worker secrets

透過 Wrangler 設定，不要寫進 git：

```bash
cd worker
npx wrangler secret put JWT_SECRET          # 32+ 字元隨機字串
npx wrangler secret put RESEND_API_KEY      # Resend API Key
npx wrangler secret put ECPAY_MERCHANT_ID   # 綠界商店代號
npx wrangler secret put ECPAY_HASH_KEY      # 綠界提供
npx wrangler secret put ECPAY_HASH_IV       # 綠界提供
```

> `ECPAY_*` 若尚未啟用正式付款可先略過，但正式環境必填。

## 本機開發

開兩個 terminal：

**Terminal 1 — Worker API**

```bash
cd worker
npm run dev
# → http://127.0.0.1:8787
```

**Terminal 2 — 前端**

```bash
cd app
npm run dev
# → http://localhost:5173
```

## D1 資料庫

### 初始建立（第一次）

```bash
cd worker
npx wrangler d1 create bolt-tarot-customer
npx wrangler d1 create bolt-tarot-cards
```

將產生的 `database_id` 填入 `worker/wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "bolt-tarot-customer"
database_id = "<YOUR_ID>"

[[d1_databases]]
binding = "DB_CARDS"
database_name = "bolt-tarot-cards"
database_id = "<YOUR_ID>"
```

### 套用 schema 與 seed

> **注意：** schema 檔含有 `DROP TABLE IF EXISTS`，正式環境執行前請確認已備份資料。

```bash
# 客戶資料庫
npx wrangler d1 execute bolt-tarot-customer --remote --file=./d1/customer-schema.sql
npx wrangler d1 execute bolt-tarot-customer --remote --file=./d1/customer-seed.sql

# 牌組內容資料庫
npx wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-schema.sql
npx wrangler d1 execute bolt-tarot-cards --remote --file=./d1/cards-seed.sql
```

### Migration（版本化變更）

Production migrations 不會自動執行，需手動到 GitHub Actions → **Apply D1 Migrations** → Run workflow：

- `confirm`: `APPLY`
- `database`: `DB`（或 `DB_CARDS`）

Migration 檔案位於 `d1/migrations/*.sql`，workflow 會複製到 `worker/migrations/` 後以 Wrangler 套用。

## 常用指令

**前端（在 `app/` 執行）**

```bash
npm run dev        # Vite dev server
npm run build      # 建置
npm run preview    # 預覽 dist
npm run lint       # ESLint
npm run typecheck  # TypeScript 型別檢查
npm run smoke      # Smoke test（需設定環境變數）
```

**Worker（在 `worker/` 執行）**

```bash
npm run dev        # wrangler dev，port 8787
npm run deploy     # 部署 Worker
npm run typecheck  # TypeScript 型別檢查
npm run types      # 重新產生 Worker 型別定義
```

## 頁面路由

| 路由 | 說明 |
|------|------|
| `/` | 首頁 |
| `/auth` | 登入 / 註冊 / 忘記密碼 |
| `/numerology` | 生命靈數水晶分析 |
| `/tarot` | Tarot 牌陣 |
| `/tarot-single` | Tarot 單張牌 |
| `/lightworker` | Lightworker |
| `/lightworker/celtic-cross` | Lightworker Celtic Cross |
| `/unicorns` | Unicorns |
| `/dragons` | Dragons |
| `/egyptian-gods` | Egyptian Gods |
| `/work-your-light` | Work Your Light |
| `/work-your-light-single` | Work Your Light 單張牌 |
| `/cosmic-cross` | Cosmic Cross |
| `/osho` | Osho |
| `/osho/single` | Osho 單張牌 |
| `/osho/three` | Osho 三張牌 |
| `/checkout/return` | 付款完成回傳頁 |
| `/membership` | 月費會員管理（需登入） |
| `/admin` | 管理後台（需管理員） |
| `/admin/settings` | 管理員帳號設定 |
| `/admin/kpi` | KPI 儀表板 |

## Worker API 概覽

| 群組 | 端點 |
|------|------|
| Auth | `POST /api/auth/signup` `signin` `signout` `GET /api/auth/me` |
| 密碼重設 | `POST /api/auth/request-password-reset` `verify-reset-code` `reset-password` |
| 牌組 | `GET /api/decks` `/api/decks/:id/preview` |
| 解鎖 | `POST /api/cards/single-unlock` `spread-unlock` |
| 付款 | `POST /api/checkout/create-order` `GET /api/checkout/catalog` `GET /api/orders/:id` |
| ECPay webhook | `POST /api/ecpay-webhook` |
| Leads / 追蹤 | `POST /api/save-email` `track` `conversion-events` |
| Admin | `GET/POST/DELETE /api/admin/*` `GET /api/metrics/daily` |

## 部署

### 手動部署

```bash
# 1. 建置前端
cd app
npm run build

# 2. 部署 Worker
cd ../worker
npm run deploy
```

### 自動部署（GitHub Actions）

| Workflow | 觸發 | 內容 |
|----------|------|------|
| `ci-deploy.yml` | PR / push `main` | 安裝、建置、typecheck；push main 時自動部署 Worker，可選 Cloudflare Pages，最後跑 smoke test |
| `d1-migrations.yml` | 手動 | 輸入 `APPLY` 確認後套用 production D1 migrations |

#### GitHub Secrets

在 **Settings → Secrets and variables → Actions → Secrets** 設定：

```text
CLOUDFLARE_API_TOKEN    # 需要 Workers、D1、Pages 編輯權限
CLOUDFLARE_ACCOUNT_ID
```

#### GitHub Variables

在 **Settings → Secrets and variables → Actions → Variables** 設定：

```text
VITE_API_BASE=https://api.crystalfield101.com
SMOKE_API_BASE=https://api.crystalfield101.com
SMOKE_FRONTEND_URL=https://crystalfield101.com
SMOKE_ORIGIN=https://crystalfield101.com
CLOUDFLARE_PAGES_PROJECT_NAME=   # 留空則僅自動部署 Worker
```

## 開發注意事項

- **API client** 位於 `app/src/lib/api.ts`，所有 fetch 走 `credentials: 'include'`（cookie-based auth）。
- **CORS**：Worker 會檢查 `Origin`，正式部署前務必更新 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS`。
- **D1 分離**：客戶資料（`DB`）與牌組內容（`DB_CARDS`）使用不同 binding，降低洩漏風險。
- **管理員保護**：前端路由由 `ProtectedRoute` 把關，Worker admin API 另有管理員權限驗證。
- **付款**：正式啟用綠界前，請在測試環境驗證 hash key、hash IV、回傳 URL 與 webhook。
- **Numerology 升級流程**：`usePremium` 目前以 localStorage 模擬付費解鎖，正式串接時應接到 Worker 付款 API。
