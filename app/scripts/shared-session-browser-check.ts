import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({server:{host:'127.0.0.1',port:5188,strictPort:true}});
await server.listen();
const browser = await chromium.launch({channel:'chrome'});
try {
  const context = await browser.newContext();
  let signed = false, signins = 0;
  const user = {id:'test',email:'test@example.test'};
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    let body: unknown = {};
    if (url.pathname === '/api/auth/signin') { signed=true; signins++; body={user}; }
    else if (url.pathname === '/api/auth/signout') { signed=false; body={ok:true}; }
    else if (url.pathname === '/api/auth/me') body={user:signed?user:null};
    else if (url.pathname === '/api/tarot/entitlement') body={entitlement:{status:'free_available',free_readings_remaining:7,plan_tier:0}};
    else if (url.pathname.includes('/config')) body={enabled:true,public:true,member:true,features:{member:true}};
    else if (url.pathname.includes('profiles')) body={profiles:[]};
    else if (url.pathname.includes('reports')) body={reports:[]};
    else if (url.pathname.includes('reviews')) body={reviews:[]};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  const page = await context.newPage(), other = await context.newPage();
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  const base = 'http://127.0.0.1:5188';
  await other.goto(base+'/numerology');
  await other.locator('[data-birth-login-gate]').waitFor();
  await page.goto(base+'/login?redirect=%2Ftarot');
  await page.locator('input[type=email]').fill(user.email);
  await page.locator('input[type=password]').fill('example1234');
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/tarot');
  await other.locator('[data-birth-login-gate]').waitFor({state:'detached'});
  for (const path of ['/oracle','/numerology','/human-design','/vedic-astrology','/maya-calendar','/en/numerology']) {
    console.log('Checking', path);
    await page.goto(base+path);
    await page.getByRole('button',{name:/Sign Out|Sign out|登出/}).first().waitFor();
    assert.equal(await page.locator('[data-birth-login-gate]').count(),0,path);
  }
  assert.equal(signins,1);
  await page.getByRole('button',{name:/Sign Out|Sign out|登出/}).first().click();
  await other.locator('[data-birth-login-gate]').waitFor();
  console.log('PASS: one login across five tools, reload, English, and cross-tab sign-in/sign-out (mock session API).');
} finally { await browser.close(); await server.close(); }
