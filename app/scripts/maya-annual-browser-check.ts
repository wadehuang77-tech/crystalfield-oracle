import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { annualSnapshot, ANNUAL_CHAPTERS, type AnnualState } from '../src/lib/mayaAnnual';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome'});
try{
  const ctx=await browser.newContext();let signedIn=false,steps=0,checkouts=0;const saved=new Map<string,AnnualState>();
  const snapshot=annualSnapshot('1990-06-15');
  await ctx.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/')){
      let body:unknown={};const locale=url.searchParams.get('locale')==='en'?'en':'zh-TW';
      if(url.pathname==='/api/auth/me')body={authenticated:signedIn,user:signedIn?{id:'owner',email:'test@example.invalid'}:null};
      else if(url.pathname==='/api/maya/annual/config')body={enabled:true,payment:true};
      else if(url.pathname==='/api/maya/annual/orders')body={orders:[{orderId:'test-order',snapshot,status:'paid'}]};
      else if(url.pathname==='/api/maya/checkout'&&route.request().method()==='POST'){
        checkouts++;const request=route.request().postDataJSON();assert.equal(request.product_code,'MAYA_ANNUAL_599');assert.equal(request.birth_date,'1990-06-15');assert.equal(request.start_year,snapshot.startYear);assert.equal(request.amount,undefined);body={order_id:'test-order',already_paid:true};
      }else if(url.pathname==='/api/maya/checkout/test-order')body={order_id:'test-order',locale:'en',product_code:'MAYA_ANNUAL_599',status:'paid',amount:599};
      else if(url.pathname==='/api/maya/annual/reports/test-order'){
        let state=saved.get(locale)??{orderId:'test-order',snapshot,locale,status:'pending',completed:0,percent:0,error:null,sections:null} as AnnualState;
        if(route.request().method()==='POST'){
          steps++;const completed=state.completed+1;state={...state,completed,percent:completed===10?100:completed*9,status:completed===10?'completed':'pending',sections:completed===10?ANNUAL_CHAPTERS.map(c=>({heading:c[locale==='en'?1:0],body:locale==='en'?'A specific annual reflection to practice in daily life.':'這是模擬測試用的年度解讀，提供具體生活觀察。'})):null};saved.set(locale,state);
        }body=state;
      }
      return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
    }
    return url.hostname==='127.0.0.1'?route.continue():route.abort();
  });
  const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5199/maya-calendar/annual');
  await page.locator('input[type=date]').fill('2000-02-29');await page.getByRole('alert').filter({hasText:'2 月 29 日'}).waitFor();
  await page.locator('input[type=date]').fill('1990-06-15');await page.getByRole('link',{name:'登入後探索我的流年運勢'}).waitFor();assert.equal(checkouts,0);
  signedIn=true;await page.reload();await page.locator('input[type=date]').fill('1990-06-15');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),'maya-annual-preview-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'探索我的流年運勢',exact:true}).click();await page.waitForURL('**maya_order=test-order');
  await page.waitForFunction(()=>Number(document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'))>0);
  await page.reload();await page.waitForFunction(()=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='100',{},{timeout:40000});
  assert.equal(steps,10);assert.equal(await page.locator('article').count(),10);
  await page.reload();await page.getByRole('progressbar').waitFor();await page.waitForTimeout(200);assert.equal(steps,10);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),'maya-annual-report-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5199/en/maya-calendar/annual?maya_order=test-order');
  await page.waitForFunction(()=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='100',{},{timeout:40000});
  assert.equal(checkouts,1);assert.equal(steps,20);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),'maya-annual-report-desktop.png'),fullPage:true});
  signedIn=false;await page.reload();await page.getByRole('link',{name:'Sign in to explore my birthday year'}).waitFor();assert.equal(await page.locator('article').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: guest login gate, leap birthday warning, fixed checkout, reload resume/cache, bilingual access, mobile/desktop overflow and logout privacy. All APIs mocked. Screenshots in OS temp folder.');
}finally{await browser.close();await server.close();}
