import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const server=await createServer({server:{host:'127.0.0.1',port:5196,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext();let authorized=false,status='locked',generates=0,checkouts=0;
 const facts={year:2026,startDate:'2026-01-01',endDate:'2026-12-31',timezone:'Asia/Taipei',birth:{date:'2000-01-01',time:'12:00',location:'Taipei'},dasha:[],limitations:[]};
 const preview={id:'fixture',chartId:'chart',facts,status:'awaiting_data'};
 const report={sections:Array.from({length:10},(_,key)=>({key,body:`第 ${key+1} 章測試解讀，練習觀察生活步調與實際需要。`.repeat(8),actions:key===8?['安排每週回顧','設定合作界線','記錄每月收支']:[],evidenceIds:[]}))};
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.pathname.startsWith('/api/')){
   let body:unknown={};
   if(url.pathname==='/api/auth/me')body={authenticated:true,user:{id:'fixture',email:'fixture@example.test'}};
   else if(url.pathname.endsWith('/annual/config'))body={price:599,purchaseEnabled:true,generationEnabled:true,transitEnabled:true,adminFree:false};
   else if(url.pathname.endsWith('/annual/charts'))body={charts:[{id:'chart',birth:facts.birth}]};
   else if(url.pathname.endsWith('/annual/previews'))body={previews:[preview]};
   else if(url.pathname.endsWith('/annual/previews/fixture'))body=preview;
   else if(url.pathname.endsWith('/checkout')){assert.deepEqual(route.request().postDataJSON(),{});checkouts++;authorized=true;status='pending';body={already_paid:true};}
   else if(url.pathname.endsWith('/generate')){assert.deepEqual(route.request().postDataJSON(),{});generates++;status='generating';body={authorized,status,report:null,error:null};}
   else if(url.pathname.endsWith('/reports/fixture'))body={authorized,status,report:status==='completed'?report:null,facts:status==='completed'?facts:null,error:status==='failed'?'AI_FAILED':null};
   else if(url.pathname.endsWith('/transits/fixture'))body={status:'completed',callsUsed:47,samplesCollected:47,baselineTotal:47,baselineCollected:47,data:null};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  }return url.hostname==='127.0.0.1'?route.continue():route.abort();
 });
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5196/vedic-astrology/annual?case_id=fixture');
 await page.getByRole('button',{name:'解鎖流年運勢 NT$599',exact:true}).click();
 await page.getByRole('button',{name:'免費／已解鎖：生成流年報告',exact:true}).click();
 await page.getByText('階段式進度，非實際計算百分比。離開後背景工作會繼續。',{exact:true}).waitFor();
 assert.equal(generates,1);assert.equal(checkouts,1);status='completed';
 await page.getByRole('heading',{name:'1. 年度總覽',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:join(tmpdir(),'vedic-annual-report-mobile.png'),fullPage:true});
 await page.reload();await page.getByRole('heading',{name:'1. 年度總覽',exact:true}).waitFor();assert.equal(generates,1);
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5196/en/vedic-astrology/annual?case_id=fixture');
 await page.getByRole('heading',{name:'1. Your year at a glance',exact:true}).waitFor();assert.equal(checkouts,1);
 await page.screenshot({path:join(tmpdir(),'vedic-annual-report-desktop.png'),fullPage:true});
 status='failed';await page.reload();await page.getByRole('button',{name:'Retry generation — no new payment',exact:true}).waitFor();
 authorized=false;status='locked';await page.reload();await page.getByRole('button',{name:'Unlock annual outlook NT$599',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'1. Your year at a glance',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS synthetic annual checkout, generation stages, ten chapters, reload cache, bilingual access, retry, revoked content and 390/1440px layout. No external API calls.');
}finally{await browser.close();await server.close();}
