import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Synthetic authentication only; never contacts OAuth, payment or calculation providers.
const server=await createServer({server:{host:'127.0.0.1',port:5197,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome'});
try {
 const context=await browser.newContext();let signedIn=false;
 const user={id:'fixture-user',email:'fixture@example.test',name:'Test'};
 await context.addInitScript({content:"window.google={accounts:{id:{initialize:function(){},renderButton:function(parent){var b=document.createElement('button');b.textContent='Google';b.type='button';b.style.cssText='width:100%;min-height:44px;border:1px solid #747775;border-radius:4px;color:#1f1f1f;background:white';parent.append(b);}}}};"});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/api/')){
   let body:unknown={reviews:[],profiles:[],entitlements:[]};
   if(url.pathname==='/api/maya/config')body={public:true,member:true,payment:false,sandbox:false,ai:false};
   if(url.pathname==='/api/auth/me')body={authenticated:signedIn,user:signedIn?user:null};
   if(url.pathname==='/api/auth/google/config')body={client_id:'fixture',csrf_token:'fixture'};
   if(url.pathname==='/api/auth/facebook/config')body={enabled:false,app_id:null,version:null,csrf_token:null};
   if(url.pathname==='/api/auth/signin'){signedIn=true;body={user};}
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  }
  return url.hostname==='127.0.0.1'?route.continue():route.abort();
 });
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const prefix of ['', '/en'])for(const tool of ['numerology','human-design','vedic-astrology','maya-calendar']){
  const path=`${prefix}/${tool}`;console.log('Checking',path);await page.goto(`http://127.0.0.1:5197${path}`);
  await page.locator('[data-birth-login-gate] > button').click();
  await page.waitForURL(`**${prefix}/login?**`);
  assert.equal(new URL(page.url()).searchParams.get('redirect'),path);
 }
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5197/login?redirect=%2Fnumerology');
  await page.getByRole('button',{name:'Google',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Facebook/}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),`birth-login-${width}.png`),fullPage:true});
 }
 await page.getByLabel('電子郵件',{exact:true}).fill('fixture@example.test');
 await page.getByLabel('密碼',{exact:true}).fill('Fixture123');
 await page.getByRole('button',{name:'登入',exact:true}).click();await page.waitForURL('**/numerology');
 assert.equal(await page.locator('[data-birth-login-gate]').count(),0);
 for(const tool of ['human-design','vedic-astrology','maya-calendar']){
  await page.goto(`http://127.0.0.1:5197/${tool}`);
  await page.waitForFunction(()=>!document.querySelector('[data-birth-login-gate]'));
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: eight localized guest gates, return URL, mocked password login, signed-in forms, no Facebook entry, Google slot, 390/1440px overflow. Screenshots in OS temp. No real OAuth calls.');
}finally{await browser.close();await server.close();}
