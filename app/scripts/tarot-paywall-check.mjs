import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TAROT_TEST_BASE || 'http://127.0.0.1:5198';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error.message));
  let used = 0;
  let submitted = 0;
  await page.route('**/tarot-test', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.includes('free-unlock')) {
      if (used >= 3) return reply({ error: '免費占卜次數已用完', code: 'TAROT_FREE_QUOTA_EXHAUSTED' }, 403);
      used++;
      return reply({ card: { card_key: 'same-card', gated: {} }, cards: [{ card_key: 'same-card', gated: {} }], entitlement_status: 'free_available' });
    }
    if (path === '/api/tarot/entitlement') return reply({ entitlement: { status: 'expired', plan_tier: 0, free_readings_remaining: 0 } });
    if (path === '/api/checkout/create-order') {
      assert.equal(route.request().postDataJSON().spread_id, 'tarot_three_monthly_600');
      submitted++;
      return reply({ ecpay: { endpoint: base + '/mock-payment', fields: { MerchantID: 'test' } } });
    }
    return reply({});
  });
  await page.goto(base + '/tarot-test');
  await page.evaluate(async () => {
    await import('/@vite/client');
    const refresh = await import('/@react-refresh');
    refresh.default.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const bannerModule = await (await fetch('/src/components/TarotTrialStatusBanner.tsx')).text();
    const routerUrl = bannerModule.match(/from "([^"]*react-router-dom[^"]*)"/)[1];
    const { MemoryRouter } = await import(routerUrl);
    const { AuthContext } = await import('/src/contexts/AuthContext.tsx');
    const { useSingleCardGate } = await import('/src/hooks/useSingleCardGate.ts');
    const { useMultiSpreadGate } = await import('/src/hooks/useMultiSpreadGate.ts');
    const { TarotTrialStatusBanner } = await import('/src/components/TarotTrialStatusBanner.tsx');
    const h = React.createElement;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const auth = { user: { id: 'test' } };
    function Harness({ multi, spread }) {
      const [draw, setDraw] = React.useState(false);
      const single = useSingleCardGate({ spreadId: spread, cardKey: draw ? 'same-card' : null, enabled: draw && !multi });
      const picks = React.useMemo(() => draw ? [{ card_key: 'same-card', position: 0 }] : null, [draw]);
      const multiple = useMultiSpreadGate({ spreadId: spread, picks, enabled: draw && multi });
      return h('div', null, h('button', { onClick: () => setDraw(!draw) }, draw ? 'Reset' : 'Draw'), h('output', null, (multi ? multiple : single).phase));
    }
    window.mountGate = (multi, spread) => root.render(h(AuthContext.Provider, { value: auth }, h(Harness, { key: spread, multi, spread })));
    window.mountBanner = path => root.render(h(AuthContext.Provider, { value: auth }, h(MemoryRouter, { key: path, initialEntries: [path] }, h(TarotTrialStatusBanner))));
    HTMLFormElement.prototype.submit = function () { window.payment = { action: this.action, method: this.method }; };
  });
  for (const deck of ['tarot', 'lightworker', 'unicorns', 'dragons', 'egyptian', 'work_your_light', 'osho']) {
    for (const multi of [false, true]) {
      used = 0;
      await page.evaluate(({ multi, spread }) => window.mountGate(multi, spread), { multi, spread: `${deck}_${multi ? 'three' : 'single'}` });
      for (let n = 1; n <= 4; n++) {
        await page.getByRole('button', { name: 'Draw', exact: true }).click();
        await page.waitForFunction(expected => document.querySelector('output')?.textContent === expected, n < 4 ? 'unlocked' : multi ? 'paywall' : 'membership_gate');
        if (n < 4) {
          await page.getByRole('button', { name: 'Reset', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('output')?.textContent === 'idle');
        }
      }
      assert.equal(used, 3);
    }
  }
  for (const path of ['/tarot', '/lightworker', '/unicorns', '/dragons', '/egyptian-gods', '/work-your-light', '/osho', '/en/tarot']) {
    console.log('Checking payment entry:', path);
    await page.evaluate(path => window.mountBanner(path), path);
    await page.getByRole('button', { name: /選擇付費方案|Choose a plan/ }).click();
    await page.getByRole('button', { name: /立即訂閱 NT\$600/ }).click();
    await page.waitForFunction(() => window.payment?.method === 'post');
    assert.equal(await page.evaluate(() => window.payment.action), base + '/mock-payment');
    await page.evaluate(() => { window.payment = null; });
  }
  assert.equal(submitted, 8);
  console.log('PASS: 14 repeated-reading flows; 8 plan entry and payment form flows.');
} finally {
  await browser.close();
}
