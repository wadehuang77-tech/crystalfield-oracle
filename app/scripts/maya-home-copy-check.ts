import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';

const server = await createServer({ server: { host: '127.0.0.1', port: 5236, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let cases = 0;
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const width of [390, 768, 1440])
    for (const state of ['visitor', 'member', 'admin'] as const) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const en = locale === 'en', prefix = en ? '/en' : '';
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const req = route.request(), url = new URL(req.url());
        const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5236' ? route.continue() : route.abort();
        if (url.pathname === '/api/track') return reply({ ok: true });
        assert.equal(req.method(), 'GET', 'Copy and local KIN queries must never trigger AI, payment or profile writes');
        if (url.pathname === '/api/auth/me') return reply(state === 'visitor' ? { authenticated: false }
          : { authenticated: true, user: { id: 'owner', email: 'offline@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: state === 'admin' });
        if (url.pathname === '/api/maya/config') return reply({
          public: true, member: true, payment: true, sandbox: false, ai: false, admin_preview: state === 'admin',
        });
        if (url.pathname === '/api/maya/pro/config') return reply({ enabled: true, payment: true, mode: 'production_entitlement', liveAi: false });
        if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: true, reportAvailable: false });
        if (url.pathname === '/api/auth/google/config') return reply({ client_id: null, csrf_token: 'offline' });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [] });
        if (url.pathname === '/api/maya/daily') return reply({ daily: null });
        if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: [] });
        if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: true, mode: 'production' });
        throw new Error(`Unexpected request ${url.pathname}`);
      });
      await page.goto(`http://127.0.0.1:5236${prefix}/maya-calendar`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('[data-maya-hero]');
      const heading = hero.getByRole('heading', { level: 1, name: en ? 'Discover Your Galactic Life Signature' : '探索你的馬雅星際生命密碼', exact: true });
      await heading.waitFor();
      const subtitle = hero.locator('[data-maya-subtitle]');
      assert.equal(await subtitle.innerText(), en
        ? 'Explore your strengths, personality, and sense of direction—starting with your birth date.'
        : '透過出生日期，認識你的天賦、性格特質與人生方向。');
      if (!en) assert.ok((await hero.innerText()).includes('每個人都有專屬的馬雅星際印記（KIN）。透過 Dreamspell 13 月亮曆，你可以探索自己的太陽圖騰、銀河音調、內在潛能與生命成長課題。從認識自己開始，發現屬於你的生命藍圖。'));
      const cta = hero.getByRole('button', { name: en ? 'Find My KIN for Free' : '免費查詢我的 KIN', exact: true });
      assert.equal(await cta.isEnabled(), true);
      for (const element of [heading, subtitle, cta]) {
        const bounds = await element.boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844, `${state} ${locale} ${width}px hero text/CTA must fit first viewport`);
      }
      assert.equal(await page.locator('[data-maya-features] article').count(), 3);
      for (const [label, href] of [
        [en ? 'About Dreamspell' : '認識馬雅曆', `${prefix}/maya-calendar`],
        [en ? "Today's Galactic Energy" : '今日星際能量', `${prefix}/maya-calendar/daily`],
        [en ? 'My Life Blueprint' : '我的生命藍圖', `${prefix}/maya-calendar/reports`],
      ]) assert.equal(await hero.getByRole('link', { name: label, exact: true }).getAttribute('href'), href);
      const mainText = await page.locator('main').innerText();
      assert.equal(/Mock/.test(mainText), state === 'admin', 'Mock copy must be admin-only, even with AI disabled');
      assert.match(mainText, en ? /not the traditional Maya/ : /並非傳統馬雅/);
      if (en) assert.doesNotMatch(mainText.replace('繁體中文', ''), /[\u3400-\u9fff]/u);
      await page.locator('.maya-free-form input').fill('1987-07-26');
      await page.locator('.maya-free-form').getByRole('button', { name: en ? 'Find My KIN for Free' : '免費查詢我的 KIN', exact: true }).click();
      await page.locator('[data-selected-kin="34"]').waitFor();
      await page.locator('.maya-free-form input').fill('2000-02-29');
      await page.locator('.maya-free-form button').click();
      await page.getByRole('alert').filter({ hasText: en ? 'February 29' : '2 月 29 日' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await cta.click();
      await page.waitForURL(state === 'visitor' ? /\/login/ : new RegExp(`${prefix}/maya-calendar/member$`));
      if (state !== 'visitor') {
        await page.getByRole('heading', { name: en ? 'Personal birth data and KIN' : '個人出生資料與 KIN', exact: true }).waitFor();
        await page.getByRole('button', { name: `${en ? 'Pay to unlock' : '付費解鎖'} · NT$199`, exact: true }).waitFor();
      }
      assert.deepEqual(errors, []);
      cases++; await page.close();
    }
  assert.equal(cases, 18);
  console.log('PASS 18 bilingual visitor/member/admin homepage cases; first-viewport hero/CTA at 390/768/1440px, admin-only Mock copy, original CTA routes and deterministic KIN/leap-day behavior; AI/payment/profile writes=0');
} finally { await browser.close(); await server.close(); }
