import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createOrder } from '../../worker/src/checkout';
import { createVedicChart } from '../../worker/src/vedicAstrology';
import { SPREAD_CATALOG } from '../../worker/src/ecpay';
import type { Env } from '../../worker/src/utils';
const chart = {
  chart_id: 'saved-chart', chart_token: 'saved-token', expires_at: '2099-01-01',
  calculation: { provider: 'prokerala', ayanamsa: 'Lahiri' },
  chart: {
    ayanamsa: 'LAHIRI', lagna: 'Aries', sunSign: 'Capricorn', moonSign: 'Libra',
    moonNakshatra: 'Swati Pada 2', mahaDasha: 'Sun', antarDasha: 'Saturn',
    planets: { Mercury: 'Pisces', Jupiter: 'Aquarius', Sun: 'Capricorn' },
    housePlacements: { Sun: 10 }, houseLords: {}, dashaTimeline: [],
  },
  free_results: {
    archetype: { title: '開創型引路者', body: '中文人格解讀' },
    talents: { title: '今生最重要的天賦', items: ['直覺想像'], body: '中文天賦解讀' },
    currentCycle: { title: '自我定位與發光期', body: '中文週期解讀' },
    challenge: { title: '課題', body: '中文課題' },
    nextYear: { title: '未來', body: '中文未來', lockedPrompts: ['提示'] },
  },
};
const sqls: string[]=[];
const env = { ALLOWED_ORIGINS:'http://127.0.0.1:5188', DB:{prepare(sql:string){sqls.push(sql);return {bind(){return this},async first(){return {c:0}},async run(){return {}}}}}} as unknown as Env;
for(const spread_id of Object.keys(SPREAD_CATALOG).filter(k=>k.startsWith('vedic_'))){const r=await createOrder(new Request('http://local/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spread_id})}),env);assert.equal(r.status,401)}
const invalid=await createVedicChart(new Request('http://local/api/chart',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env);assert.equal(invalid.status,400);assert.ok(sqls.every(s=>s.includes('rate_limit_events')));
const b=await chromium.launch({channel:'chrome'});
try{const c=await b.newContext();let signedIn=false,charts=0,orders=0,paid=false,basicReads=0;await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/')){let body:any={reviews:[]};if(u.pathname.startsWith('/api/orders/'))body={order:{status:paid?'paid':'pending',item_id:'vedic_basic'}};else if(u.pathname==='/api/vedic-astrology/basic-reading'){basicReads++;body={chart_id:chart.chart_id,results:chart.free_results};}else if(u.pathname.includes('/reports'))throw new Error('Basic purchase must not call AI reports');else if(u.pathname==='/api/auth/me')body={authenticated:signedIn,user:signedIn?{id:'test-user',email:'test@example.invalid'}:null};else if(u.pathname.includes('vedic-astrology/chart')&&r.request().method()==='POST'){charts++;body=chart;}else if(u.pathname.includes('checkout')&&r.request().method()==='POST'){orders++;assert.equal(r.request().postDataJSON().spread_id,'vedic_basic');body={};}return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})}return u.hostname==='127.0.0.1'?r.continue():r.abort()});const p=await c.newPage();p.on('pageerror',e=>console.log(e.message));await p.goto('http://127.0.0.1:5188/vedic-astrology/');await p.locator('input[type="date"]').fill('1990-12-31');await p.locator('select').nth(0).selectOption('08');await p.locator('select').nth(1).selectOption('15');await p.locator('input[type="text"]').fill('Taipei, Taiwan');await p.locator('button[type="submit"]').click();await p.locator('#vedic-free-results').waitFor();assert.equal(charts,1);await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:/199/}).scrollIntoViewIfNeeded();await p.screenshot({path:'vedic-basic-locked-preview.png'});assert.equal(await p.getByText(chart.free_results.archetype.body,{exact:true}).count(),0);await p.reload();await p.locator('#vedic-free-results').waitFor();await p.getByRole('button', {name:/199/}).click();await p.waitForURL('**/login?**');assert.equal(orders,0);const ret=new URL(p.url()).searchParams.get('redirect')!;signedIn=true;await p.goto('http://127.0.0.1:5188'+ret);await p.locator('#vedic-free-results').waitFor();assert.equal(orders,0);await p.getByRole('button', {name:/199/}).click();await p.waitForTimeout(400);assert.equal(orders,1);await p.goto('http://127.0.0.1:5188/vedic-astrology/?order_id=order&order_token=token');await p.waitForTimeout(600);assert.equal(basicReads,0);assert.equal(await p.getByText(chart.free_results.archetype.body,{exact:true}).count(),0);paid=true;await p.reload();await p.getByText(chart.free_results.archetype.body,{exact:true}).waitFor();assert.equal(basicReads,1);await p.reload();await p.getByText(chart.free_results.archetype.body,{exact:true}).waitFor();await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#vedic-free-results').screenshot({path:'vedic-basic-mobile-preview.png'});await p.setViewportSize({width:1440,height:1000});await p.locator('#vedic-free-results').screenshot({path:'vedic-basic-desktop-preview.png'});console.log('PASS: NT199 guest login gate, pending denied, paid content + refresh, mobile overflow checked, no AI reports; guest chart + refresh; login before checkout; chart restored after mocked login; all guest Vedic SKUs 401, invalid guest chart reaches validation; no real provider/AI/payment calls.');}finally{await b.close()}
