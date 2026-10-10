import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mayaForDate, mayaSignature, mockMayaReport, type MayaLocale } from '../src/lib/maya';
import { mockLifeBlueprintV2 } from '../src/lib/mayaLifeBlueprintMock';
import { MAYA_RELATIONSHIP_PRODUCT } from '../src/lib/mayaRelationship';

const server = await createServer({ server: { host: '127.0.0.1', port: 5217, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results: Array<{ locale: MayaLocale; width: number; mode: string; result: string }> = [];
let apiPosts = 0;
let aiCalls = 0;
const artifacts = process.env.MAYA_VISUAL_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
try {
  for (const locale of ['zh-TW', 'en'] as const) for (const width of [390, 768, 1440]) {
    for (const mode of ['public', 'unpaid', 'legacy', 'v2', 'forbidden', 'anonymous'] as const) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, acceptDownloads: true });
      const calls: string[] = [];
      const pageErrors: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (/openai|anthropic|images\/generations|api\/maya\/(?:admin-reports|admin-preview)/i.test(url.href)) aiCalls++;
        if (!url.pathname.startsWith('/api/')) return url.origin === 'http://127.0.0.1:5217' ? route.continue() : route.abort();
        calls.push(url.pathname);
        if (url.pathname === '/api/track') return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
        if (request.method() !== 'GET') { apiPosts++; throw new Error(`Unexpected non-read request ${request.method()} ${url.pathname}`); }
        const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        const anonymous = mode === 'public' || mode === 'anonymous';
        if (url.pathname === '/api/auth/me') return reply(anonymous ? { authenticated: false } : { authenticated: true, user: { id: 'local-owner-A', email: 'local-owner-A@example.test' } });
        if (url.pathname === '/api/admin/check') return reply({ isAdmin: false });
        if (url.pathname === '/api/auth/google/config') return reply({ client_id: null, csrf_token: 'local-ui-only' });
        if (url.pathname === '/api/maya/config') return reply({ public: true, member: true, payment: false, sandbox: false, ai: true });
        if (url.pathname === '/api/maya/relationship/config') return reply({ product: MAYA_RELATIONSHIP_PRODUCT, payment: false, reportAvailable: false });
        if (url.pathname === '/api/maya/profile') return reply({ profiles: [{ ...mayaForDate('1987-07-26', locale), id: 'owned-profile-A', role: 'personal', birth_date: '1987-07-26', free_summary: '' }] });
        if (url.pathname === '/api/maya/daily') return reply({ daily: { ...mayaForDate('2026-10-10', locale), date: '2026-10-10', timezone: 'Asia/Taipei', free_summary: '', awareness_prompt: '', special_day: null } });
        if (url.pathname === '/api/maya/entitlements') return reply({ entitlements: mode === 'legacy' || mode === 'v2' ? [{ id: 'owned-access-A', product_code: 'MAYA_FULL_499', status: 'active' }] : [] });
        if (url.pathname === '/api/maya/checkout/config') return reply({ enabled: false, mode: 'production' });
        if (url.pathname === '/api/maya/reports') return reply({ reports: [] });
        if (url.pathname === '/api/maya/reports/owned-report-A' || url.pathname === '/api/maya/reports/other-owner-B') {
          if (url.pathname.endsWith('/other-owner-B') || mode === 'forbidden' || mode === 'unpaid') return reply({ error: 'FORBIDDEN' }, 403);
          assert.ok(mode === 'v2' || mode === 'legacy');
          // Retrieval-only fixture, NOT a real paid AI or backend-v2 acceptance.
          const report = mode === 'v2' ? mockLifeBlueprintV2(mayaSignature(34, locale), locale) : mockMayaReport(mayaSignature(34, locale), null, locale, 'MAYA_FULL_499');
          return reply({ id: 'owned-report-A', status: 'completed', report });
        }
        throw new Error(`Unexpected API ${url.pathname}`);
      });
      const base = `http://127.0.0.1:5217${locale === 'en' ? '/en' : ''}/maya-calendar`;
      const target = mode === 'public' ? base : mode === 'forbidden' ? `${base}/reports/other-owner-B` : mode === 'unpaid' || mode === 'anonymous' ? `${base}/member` : `${base}/reports/owned-report-A`;
      await page.goto(target);
      if (mode === 'anonymous') {
        await page.waitForURL(/\/login\?redirect=/);
        assert.equal(await page.locator('[data-chapter-id]').count(), 0);
        assert.ok(!calls.some(path => path.includes('/api/maya/reports') || path === '/api/maya/profile'));
      } else {
        if (mode === 'public') await page.locator('.maya-free-form input').waitFor();
        else if (mode === 'forbidden') await page.getByRole('alert').waitFor();
        else await page.locator('.maya-identity-svg').waitFor();
        if (mode === 'v2') await page.locator('.maya-chapter-content').last().waitFor({ state: 'attached' });
        if (mode === 'legacy') await page.locator('.maya-legacy').waitFor();
        await page.locator('[data-kin="260"]').waitFor({ state: 'attached' });
        assert.equal(await page.locator('[data-kin]').count(), 260);
        assert.equal(await page.locator('[data-kin][tabindex="0"]').count(), 1);
        const first = page.locator('[data-kin="1"]');
        await first.click();
        await first.press('ArrowRight');
        assert.equal(await page.locator(':focus').getAttribute('data-kin'), '21');
        await page.locator(':focus').press('ArrowDown');
        assert.equal(await page.locator(':focus').getAttribute('data-kin'), '22');
        await page.locator(':focus').press('End');
        assert.equal(await page.locator(':focus').getAttribute('data-kin'), '242');
        await page.locator(':focus').press('Enter');
        assert.equal(await page.locator('[data-selected-kin]').getAttribute('data-selected-kin'), '242');
        assert.ok(await page.locator('[data-kin="242"]').isVisible());
        const size = await page.locator('[data-kin="1"]').boundingBox();
        assert.ok(size && size.width >= 44 && size.height >= 44);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        for (const box of await page.locator('.maya-cosmic-panel, .maya-identity-svg').evaluateAll(elements => elements.map(element => {
          const bounds = element.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, width: bounds.width };
        }))) assert.ok(box.left >= -1 && box.right <= width + 1, `${mode} ${width}px clipped component ${JSON.stringify(box)}`);
        if (mode === 'public') {
          const relationship = page.locator('[data-relationship-product="MAYA_RELATIONSHIP_899"]');
          assert.match(await relationship.innerText(), /NT\$899/);
          assert.doesNotMatch(await relationship.innerText(), /NT\$699/);
          const proPayment = page.getByRole('link', { name: locale === 'en' ? 'ECPay checkout · NT$699' : '綠界付款 · NT$699', exact: true });
          assert.equal(await proPayment.getAttribute('href'), `${locale === 'en' ? '/en' : ''}/maya-calendar/pro`);
          assert.ok(!calls.some(path => path.includes('/api/maya/reports') || path === '/api/maya/profile'));
          const input = page.locator('.maya-free-form input');
          await input.fill('1987-07-26');
          await page.locator('.maya-free-form button').click();
          await page.locator('.maya-identity-svg').waitFor();
          assert.ok((await page.locator('.maya-identity-svg').textContent())?.includes('KIN 34'));
          await page.locator('.maya-symbol-library summary').click();
          assert.equal(await page.locator('.maya-symbol-grid [data-seal-id]').count(), 20);
          assert.equal(await page.locator('.maya-symbol-grid [data-tone-number]').count(), 13);
          await input.fill('2000-02-29');
          await page.locator('.maya-free-form button').click();
          await page.getByRole('alert').waitFor();
          assert.equal(await page.locator('.maya-identity-svg').count(), 0);
          await input.fill('1987-07-26');
          await page.locator('.maya-free-form button').click();
        } else if (mode === 'forbidden') {
          await page.getByRole('alert').waitFor();
          assert.equal(await page.locator('.maya-chapter-content').count(), 0);
          assert.equal(await page.locator('.maya-legacy').count(), 0);
        } else if (mode === 'unpaid') {
          assert.equal(await page.locator('.maya-chapter-content').count(), 0);
          assert.equal(await page.locator('.maya-legacy').count(), 0);
        } else {
          await page.locator('.maya-blueprint').waitFor();
          assert.equal(await page.locator('[data-chapter-id]').count(), 12);
          if (mode === 'v2') {
            assert.equal(await page.locator('.maya-chapter-content').count(), 12);
            const before = calls.length;
            await page.locator('.maya-chapter-nav button').nth(11).click();
            assert.ok(await page.locator('[data-chapter-id="ninety-day-practice"]').getAttribute('open') !== null);
            assert.equal(await page.locator('.maya-plan article').count(), 3);
            assert.equal(calls.length, before);
            await page.locator('[data-chapter-id="ninety-day-practice"] summary').press('Enter');
            assert.equal(await page.locator('[data-chapter-id="ninety-day-practice"]').getAttribute('open'), null);
          } else {
            assert.equal(await page.locator('.maya-legacy details').count(), 7);
            assert.equal(await page.locator('.maya-chapter-content').count(), 0);
          }
        }
        if (mode === 'public' && width === 390) {
          for (const format of ['svg', 'png']) {
            const downloadPromise = page.waitForEvent('download');
            await page.locator('.maya-downloads button').nth(format === 'svg' ? 0 : 1).click();
            const download = await downloadPromise;
            assert.equal(download.suggestedFilename(), `dreamspell-kin-34.${format}`);
            const path = await download.path();
            assert.ok(path);
            const bytes = await readFile(path);
            if (format === 'svg') {
              const xml = bytes.toString('utf8');
              assert.ok(xml.includes('KIN 34') && xml.includes('1987-07-26'));
              assert.doesNotMatch(xml, /interpretation|lifeExamples|ninetyDayPlan/);
            } else assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
          }
        }
        if (locale === 'en') {
          const text = await page.locator('main').innerText();
          assert.doesNotMatch(text.replace('繁體中文', ''), /[\u3400-\u9fff]/u);
        }
        if (artifacts && ['public', 'v2'].includes(mode)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: join(artifacts, `${locale}-${width}-${mode}.png`), fullPage: false });
          await page.locator(mode === 'v2' ? '.maya-blueprint' : '.maya-matrix-scroll').screenshot({ path: join(artifacts, `${locale}-${width}-${mode}-component.png`) });
        }
        if (mode === 'v2') {
          await page.evaluate(path => {
            history.pushState({}, '', path);
            dispatchEvent(new PopStateEvent('popstate'));
          }, `${base}/reports/other-owner-B`);
          await page.getByRole('alert').waitFor();
          assert.equal(await page.locator('.maya-chapter-content').count(), 0);
          assert.equal(await page.locator('.maya-legacy').count(), 0);
        }
        if (mode === 'public') {
          await page.getByRole('link', { name: locale === 'en' ? 'View relationship blueprint availability' : '查看雙人藍圖開發狀態', exact: true }).click();
          await page.getByRole('heading', { level: 1, name: locale === 'en' ? MAYA_RELATIONSHIP_PRODUCT.en : MAYA_RELATIONSHIP_PRODUCT.zh }).waitFor();
          const disabledBuy = page.getByRole('button', { name: locale === 'en' ? 'ECPay checkout · NT$899' : '綠界付款 · NT$899', exact: true });
          assert.ok(await disabledBuy.isDisabled());
          assert.match(await page.locator('main').innerText(), /MAYA_RELATIONSHIP_899/);
          assert.ok(!calls.includes('/api/maya/relationship/entitlements'));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
          if (artifacts) await page.screenshot({ path: join(artifacts, `${locale}-${width}-relationship.png`), fullPage: true });
          if (locale === 'en') assert.doesNotMatch((await page.locator('main').innerText()).replace('繁體中文', ''), /[\u3400-\u9fff]/u);
        }
      }
      assert.deepEqual(pageErrors, []);
      results.push({ locale, width, mode, result: 'PASS' });
      console.log(`PASS ${locale} ${width}px ${mode}`);
      await page.close();
    }
  }
  assert.equal(apiPosts, 0);
  assert.equal(aiCalls, 0);
  if (artifacts) await writeFile(join(artifacts, 'results.json'), JSON.stringify({ results, apiPosts, aiCalls }, null, 2));
  console.log(`PASS ${results.length} bilingual responsive cases; non-analytics API POSTs=${apiPosts}; AI calls=${aiCalls}.`);
  console.log('Retrieval/auth fixtures are local UI tests, not real Google/payment/v2-backend acceptance.');
} finally { await browser.close(); await server.close(); }
