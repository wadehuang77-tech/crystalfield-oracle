import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnnualTransitState } from '../src/lib/vedicAnnual';

// All auth, provider and data endpoints below are synthetic browser fixtures.
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome'});
try {
  const context=await browser.newContext();let posts=0;
  const facts={year:2026,startDate:'2026-01-01',endDate:'2026-12-31',start:'2026-01-01T00:00:00+08:00',endExclusive:'2027-01-01T00:00:00+08:00',timezone:'Asia/Taipei',birth:{date:'2000-01-01',time:'12:00',location:'Taipei',timezone:'Asia/Taipei'},dasha:[],limitations:['SETTINGS_UNVERIFIED']};
  const preview={id:'synthetic',chartId:'synthetic-chart',status:'awaiting_data',facts};
  let state:AnnualTransitState={status:'pending',callsUsed:46,callLimit:64,samplesCollected:46,baselineTotal:47,baselineCollected:46,retryAt:null,errorCode:null,data:null};
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/')){
      let body:unknown={};
      if(url.pathname==='/api/auth/me')body={authenticated:true,user:{id:'admin',email:'wadehuang77@gmail.com'}};
      else if(url.pathname.endsWith('/annual/config'))body={adminFree:true,price:599,transitEnabled:true,purchaseEnabled:false,generationEnabled:false};
      else if(url.pathname.endsWith('/annual/charts'))body={charts:[{id:'synthetic-chart',birth:facts.birth}]};
      else if(url.pathname.endsWith('/annual/previews'))body={previews:[preview]};
      else if(url.pathname.endsWith('/annual/previews/synthetic'))body=preview;
      else if(url.pathname.endsWith('/annual/transits/synthetic')){
        if(route.request().method()==='POST'){
          posts++;assert.deepEqual(route.request().postDataJSON(),{});
          if(posts===1)state={...state,status:'failed',callsUsed:47,errorCode:'PROKERALA_TIMEOUT'};
          else state={...state,status:'completed',callsUsed:48,samplesCollected:47,baselineCollected:47,errorCode:null,data:{version:'prokerala-sampled-v1',provider:'prokerala',ayanamsa:'lahiri',nodes:'provider-default-unverified',start:facts.start,endExclusive:facts.endExclusive,timezone:facts.timezone,maxGapDays:8,precision:'sampled-intervals',samples:[{at:'2026-01-01T00:00:00.000Z',positions:[{planet:'Jupiter',sign:'Aries',longitude:1,retrograde:false,signFromMoon:1,signFromAscendant:1}]}],events:[{id:'synthetic-transition',planet:'Jupiter',kind:'sign',from:'Aries',to:'Taurus',after:'2026-06-30T00:00:00Z',by:'2026-07-01T00:00:00Z'}]}};
        }
        body=state;
      }
      return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
    }
    return url.hostname==='127.0.0.1'?route.continue():route.abort();
  });
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5198/vedic-astrology/annual?case_id=synthetic');
  await page.getByRole('button',{name:'收集／繼續全年行運資料'}).click();
  await page.getByText('星位服務逾時，已完成樣本保留，可重試。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'收集／繼續全年行運資料'}).click();
  await page.getByRole('heading',{name:'觀測到的轉換區間'}).waitFor();
  await page.getByText('展開已保存的星位樣本',{exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),'vedic-annual-transits-mobile.png'),fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'觀測到的轉換區間'}).waitFor();assert.equal(posts,2);
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5198/en/vedic-astrology/annual?case_id=synthetic');
  await page.getByRole('heading',{name:'Observed transition intervals'}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),'vedic-annual-transits-desktop.png'),fullPage:true});
  assert.equal(posts,2);assert.deepEqual(errors,[]);
  console.log('PASS: synthetic failure/retry, saved sample reuse after reload/language switch, interval rendering and 390/1440px overflow. Screenshots in OS temp. No live API calls.');
}finally{await browser.close();await server.close();}
