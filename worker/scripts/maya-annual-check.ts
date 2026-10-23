import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import { routeMayaPayment } from '../src/mayaPayments';
import { routeMayaAnnual, annualMessages } from '../src/mayaAnnual';
import { computeEcpayCheckMac } from '../src/ecpay';
import { annualSnapshot, MAYA_ANNUAL_PRODUCT, type AnnualState } from '../../app/src/lib/mayaAnnual';
import { calculateDreamspellKin, getCastleByKin } from '../../app/src/lib/dreamspell';
import { taipeiDate } from '../../app/src/lib/maya';
import type { Env } from '../src/utils';

let mf:Miniflare, env:Env;const tokens=new Map<string,string>();let calls=0;let malformed=false;let unavailable=false;
const originalFetch=globalThis.fetch;
before(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("isolated")}}',compatibilityDate:'2026-06-25',d1Databases:{DB:'annual-isolated'}});
  const {DB}=await mf.getBindings<{DB:D1Database}>();
  env={DB,DB_CARDS:DB,ENV:'production',JWT_SECRET:'local-only',ALLOWED_ORIGINS:'https://www.crystalfield101.com',
    MAYA_PUBLIC_ENABLED:'true',MAYA_MEMBER_ENABLED:'true',MAYA_PAYMENT_ENABLED:'true',MAYA_AI_ENABLED:'true',MAYA_AI_MODE:'live',MAYA_ANNUAL_ENABLED:'true',OPENAI_API_KEY:'fake-key',
    ECPAY_ENV:'production',ECPAY_MERCHANT_ID:'9999999',ECPAY_HASH_KEY:'fake-hash',ECPAY_HASH_IV:'fake-iv',
    MAYA_PAYMENT_API_ORIGIN:'https://api.crystalfield101.com',MAYA_PAYMENT_FRONTEND_ORIGIN:'https://www.crystalfield101.com'};
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE,token_generation INTEGER DEFAULT 0)').run();
  await DB.prepare('CREATE TABLE admins(id TEXT PRIMARY KEY,email TEXT)').run();
  for(const name of ['owner','other','admin']){await DB.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(name,`${name}@example.test`).run();tokens.set(name,await signJwt({sub:name,email:`${name}@example.test`},env.JWT_SECRET));}
  await DB.prepare("INSERT INTO admins(id,email) VALUES('admin','admin@example.test')").run();
  for(const file of ['004-orders.sql','025_maya_dreamspell.sql','027_maya_production_payment_ai.sql','032_maya_annual.sql']){
    let sql=await readFile(new URL(`../../d1/migrations/${file}`,import.meta.url),'utf8');
    const triggers=sql.match(/CREATE TRIGGER[\s\S]*?END;/g)??[];sql=sql.replace(/CREATE TRIGGER[\s\S]*?END;/g,'').replace(/--[^\n]*/g,'');
    await DB.batch(sql.split(';').map(v=>v.trim()).filter(Boolean).map(v=>DB.prepare(v)));
    for(const trigger of triggers)await DB.prepare(trigger).run();
  }
  globalThis.fetch=async(input,init)=>{
    assert.equal(String(input),'https://api.openai.com/v1/chat/completions');calls++;
    if(unavailable)throw new Error('Simulated timeout');
    const request=JSON.parse(String(init?.body));const facts=JSON.parse(request.messages[1].content);const en=request.messages[0].content.includes('Natural English only');
    assert.equal(request.model,'gpt-4o-mini');assert.equal(facts.snapshot.product,MAYA_ANNUAL_PRODUCT.code);
    let response:any={body:en?`${facts.chapter}: Practice a specific choice in your daily life and notice how your needs change. Keep notes on one small experiment and discuss its impact with a trusted collaborator.`:`${facts.chapter}：以一個具體行動觀察日常選擇，留意自己需要的步調。寫下可以調整的工作方式，與夥伴釐清責任，讓實際經驗幫助你思考下一步。`};
    if(request.response_format.json_schema.schema.properties.actions)response.actions=en?['Write down one manageable action for this week.','Discuss one boundary with a trusted collaborator.','Review the experiment and adjust your next step.']:['寫下本週能落實的一個小行動。','與合作夥伴釐清一個責任界線。','回顧實驗結果並調整下一步安排。'];
    if(malformed)response={body:'bad'};
    return Response.json({model:'gpt-4o-mini-2024-07-18',usage:{prompt_tokens:900,completion_tokens:300},choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]});
  };
});
after(async()=>{globalThis.fetch=originalFetch;await mf?.dispose();});
test('named administrator complimentary access is server-verified, cached and revocable',async()=>{
  const adminEnv={...env,MAYA_ADMIN_LIVE_ENABLED:'true'};
  await env.DB.prepare("INSERT INTO profiles(id,email) VALUES('wade','wadehuang77@gmail.com')").run();
  tokens.set('wade',await signJwt({sub:'wade',email:'wadehuang77@gmail.com'},env.JWT_SECRET));
  const body={birth_date:'1981-03-05',start_year:2026};
  assert.equal((await call('annual/admin-report',body,'','en',adminEnv)).status,401);
  for(const user of ['owner','admin'])assert.equal((await call('annual/admin-report',body,user,'en',adminEnv)).status,403);
  assert.equal((await call('annual/admin-report',body,'wade','en',env)).status,403);
  const config=await(await call('annual/config',undefined,'wade','en',adminEnv)).json() as {adminFree:boolean};assert.equal(config.adminFree,true);
  const r=await call('annual/admin-report',body,'wade','en',adminEnv);assert.equal(r.status,200,await r.clone().text());
  const {order_id}=await r.json() as {order_id:string};
  const duplicate=await(await call('annual/admin-report',body,'wade','zh-TW',adminEnv)).json() as {order_id:string};assert.equal(duplicate.order_id,order_id);
  const stored=await env.DB.prepare('SELECT amount,status,item_type FROM orders WHERE id=?').bind(order_id).first();assert.deepEqual(stored,{amount:0,status:'complimentary',item_type:'maya_admin'});
  const path=`annual/reports/${order_id}`;
  assert.equal((await call(path,{},'other','en',adminEnv)).status,403);
  let state:AnnualState;
  for(let i=0;i<10;i++){const step=await call(path,{},'wade','en',adminEnv);assert.equal(step.status,200,await step.clone().text());state=await step.json();}
  assert.equal(state!.status,'completed');const completedCalls=calls;
  await call(path,{},'wade','en',adminEnv);assert.equal(calls,completedCalls);
  assert.equal((await call(path,undefined,'wade','zh-TW',adminEnv)).status,200);
  assert.equal((await call(path,undefined,'wade','en',env)).status,403);
  await env.DB.prepare("UPDATE profiles SET email='changed@example.test' WHERE id='wade'").run();
  assert.equal((await call(path,undefined,'wade','en',adminEnv)).status,403);
  await env.DB.prepare("UPDATE profiles SET email='wadehuang77@gmail.com' WHERE id='wade'").run();
  await env.DB.prepare("UPDATE orders SET status='revoked' WHERE id=?").bind(order_id).run();
  assert.equal((await call(path,{},'wade','en',adminEnv)).status,403);
});
function call(path:string,body?:unknown,user='owner',locale='en',target=env){
  const req=new Request(`https://api.crystalfield101.com/api/maya/${path}?locale=${locale}`,{method:body?'POST':'GET',headers:{Origin:'https://www.crystalfield101.com','Content-Type':'application/json',...(user?{Cookie:`bolt_session=${tokens.get(user)}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return path.startsWith('annual/')?routeMayaAnnual(req,target):routeMayaPayment(req,target,true);
}
const buyBody=(birth='1990-06-15',year=2026,key=crypto.randomUUID())=>({product_code:MAYA_ANNUAL_PRODUCT.code,birth_date:birth,start_year:year,locale:'en',idempotency_key:key});
async function buy(birth='1990-06-15',year=2026){const r=await call('checkout',buyBody(birth,year));assert.equal(r.status,200,await r.clone().text());return r.json() as Promise<{order_id:string;fields:Record<string,string>}>;}
async function callback(order:Awaited<ReturnType<typeof buy>>,override:Record<string,string>={},path='callback'){
  const fields={MerchantID:env.ECPAY_MERCHANT_ID!,MerchantTradeNo:order.fields.MerchantTradeNo,TradeNo:`T${order.fields.MerchantTradeNo}`,TradeAmt:'599',RtnCode:'1',SimulatePaid:'0',CustomField1:MAYA_ANNUAL_PRODUCT.code,CustomField2:order.order_id,...override};
  const CheckMacValue=await computeEcpayCheckMac(fields,env.ECPAY_HASH_KEY!,env.ECPAY_HASH_IV!);
  return routeMayaPayment(new Request(`https://api.crystalfield101.com/api/maya/payments/${path}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,CheckMacValue})}),env,true);
}
test('birthday boundaries, Taipei, leap-day block, castles and representative 52-year cycles',()=>{
  assert.equal(annualSnapshot('1990-06-15',undefined,'2026-06-14').start,'2025-06-15');
  for(const day of ['2026-06-15','2026-06-16'])assert.equal(annualSnapshot('1990-06-15',undefined,day).start,'2026-06-15');
  assert.equal(annualSnapshot('1990-12-31',undefined,'2026-01-01').start,'2025-12-31');
  assert.equal(taipeiDate(new Date('2026-06-14T16:00:00Z')),'2026-06-15');
  assert.equal(annualSnapshot('1990-03-01',2023,'2026-01-01').end,'2024-02-29');
  assert.throws(()=>annualSnapshot('2000-02-29'),/LEAP_DAY_BLOCKED/);
  assert.throws(()=>annualSnapshot('1990-02-30'),/INVALID_DATE/);
  for(const kin of [1,52,53,104,105,156,157,208,209,260])assert.equal(getCastleByKin(kin).number,Math.floor((kin-1)/52)+1);
  for(const birth of ['1900-01-01','1900-03-01','1948-02-28','1948-03-01','1974-12-31']){
    const y=Number(birth.slice(0,4));const s=annualSnapshot(birth,y+52,'2026-12-31');
    assert.equal(s.kin,calculateDreamspellKin(birth).kin);assert.equal(s.cyclePosition,1);assert.equal(s.cycleNumber,2);
    assert.equal(annualSnapshot(birth,y,'2026-12-31').cyclePosition,1);assert.equal(annualSnapshot(birth,y+51,'2026-12-31').cyclePosition,52);
  }
  const s=annualSnapshot('1990-06-15',2026,'2026-12-31');
  assert.ok(new TextEncoder().encode(JSON.stringify(annualMessages(s,'zh-TW',9,Array.from({length:9},()=>({body:'不重複的先前章節內容。'.repeat(8)}))))).length<3744);
});
test('fixed purchase, signed callbacks, bilingual reports, idempotency, retry and refund',async()=>{
  assert.equal((await call('checkout',buyBody(),'')).status,401);
  assert.equal((await call('checkout',{...buyBody(),amount:1})).status,400);
  assert.equal((await call('checkout',buyBody('2000-02-29'))).status,422);
  assert.equal((await call('checkout',buyBody(),'owner','en',{...env,MAYA_ANNUAL_ENABLED:'false'})).status,503);
  const order=await buy();assert.equal(order.fields.TotalAmount,'599');
  const duplicate=await buy();assert.equal(duplicate.order_id,order.order_id);
  const path=`annual/reports/${order.order_id}`;
  assert.equal((await call(path)).status,403);assert.equal((await call(path,{},'other')).status,403);
  assert.equal((await callback(order,{TradeAmt:'1'})).status,409);
  assert.equal((await callback(order,{MerchantID:'8888888'})).status,400);
  assert.equal((await callback(order,{CustomField1:'MAYA_BASIC_199'})).status,409);
  assert.equal((await callback(order,{},'result')).status,303);
  assert.equal((await call(path)).status,403,'Browser return is not payment');
  assert.equal((await callback(order)).status,200);assert.equal((await callback(order)).status,200);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM maya_annual_entitlements WHERE order_id=?').bind(order.order_id).first<{n:number}>())?.n,1);
  await assert.rejects(env.DB.prepare("UPDATE maya_annual_payment_orders SET birth_date='1991-01-01' WHERE order_id=?").bind(order.order_id).run());
  assert.equal((await call(path,{birth_date:'1991-01-01'})).status,400);
  const initialCalls=calls;
  const parallel=await Promise.all([call(path,{}),call(path,{})]);for(const r of parallel)assert.equal(r.status,200,await r.clone().text());
  assert.equal(calls,initialCalls+1,'Only one provider call across duplicate requests');
  await env.DB.prepare("UPDATE maya_annual_reports SET sections_json='[]',status='failed' WHERE order_id=? AND locale='en'").bind(order.order_id).run();
  assert.equal((await call(path,{})).status,200);assert.equal(calls,initialCalls+1,'Recover a saved chapter after interrupted report persistence without rebilling');
  malformed=true;const failed=await(await call(path,{})).json() as AnnualState;assert.equal(failed.status,'failed');malformed=false;
  let state=failed;
  for(let i=0;i<10&&state.status!=='completed';i++){const r=await call(path,{});assert.equal(r.status,200,await r.clone().text());state=await r.json();}
  assert.equal(state.status,'completed');assert.equal(state.percent,100);assert.equal(state.sections?.length,10);
  const doneCalls=calls;assert.equal((await call(path,{})).status,200);assert.equal(calls,doneCalls);
  let zh:AnnualState|null=null;for(let i=0;i<10;i++)zh=await(await call(path,{},'owner','zh-TW')).json();
  assert.equal(zh?.status,'completed');assert.equal(zh?.snapshot.start,state.snapshot.start);
  assert.ok((await env.DB.prepare('SELECT reserved_twd FROM maya_ai_budgets WHERE order_id=?').bind(order.order_id).first<{reserved_twd:number}>())!.reserved_twd<=1);
  assert.equal((await call(path,undefined,'other')).status,403);
  assert.equal((await call(`payments/${order.order_id}/adjust`,{action:'refunded',reference:'refund-local-annual'},'admin')).status,200);
  assert.equal((await call(path)).status,403);assert.equal((await call(path,{})).status,403);assert.equal((await callback(order)).status,409);
  const next=await buy('1990-06-15',2025);assert.notEqual(next.order_id,order.order_id);
  assert.equal((await callback(next,{RtnCode:'0'})).status,200);assert.equal((await call(`annual/reports/${next.order_id}`)).status,403);
});
test('unknown provider outcome blocks rebilling and retains purchased entitlement',async()=>{
  const order=await buy('1991-07-20');await callback(order);const path=`annual/reports/${order.order_id}`;
  unavailable=true;const v=await(await call(path,{})).json() as AnnualState;unavailable=false;
  assert.equal(v.status,'blocked');const count=calls;
  assert.equal((await call(path,{})).status,200);assert.equal(calls,count);
  assert.equal((await env.DB.prepare('SELECT status FROM maya_annual_entitlements WHERE order_id=?').bind(order.order_id).first<{status:string}>())?.status,'active');
});
