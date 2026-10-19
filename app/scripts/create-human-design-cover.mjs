import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>
    * { box-sizing: border-box } body { margin: 0; width: 1200px; height: 630px; color: #f8fafc; font-family: "Microsoft JhengHei", sans-serif; background: radial-gradient(ellipse at 95% 15%, #34316b, transparent 65%), linear-gradient(120deg,#081521,#15112c); }
    main { padding: 75px 80px; height: 100%; border: 1px solid #b8a57866; }
    .brand { color: #d6bf82; font-size: 24px; letter-spacing: 6px; } h1 { margin: 40px 0 20px; font-size: 76px; letter-spacing: 6px; } .subtitle { font-size: 36px; color: #c9e8eb; } p { font-size: 25px; line-height: 1.8; color: #cbd5e1; } footer { margin-top: 42px; color: #d6bf82; font-size: 20px; letter-spacing: 2px; }
    </style><main><div class="brand">晶域心語 · HUMAN DESIGN</div><h1>免費人類圖查詢</h1><div class="subtitle">探索真實天賦，認識自己的能量節奏</div><p>5 大類型 · 九大能量中心<br>內在權威 · 人生角色 · AI 專屬解析</p><footer>CRYSTALFIELD101.COM</footer></main></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('../public/images/human-design-cover.jpg', import.meta.url)), type: 'jpeg', quality: 92 });
} finally { await browser.close(); }
