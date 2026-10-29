import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import worker from '../src/index';
import { computeEcpayCheckMac } from '../src/ecpay';
import { annualReportFacts } from '../src/vedicAnnualCalculation';
import { runAnnualJob } from '../src/vedicAnnualReportRunner';
import { annualAiOnce,type AnnualJobInput } from '../src/vedicAnnualReport';

test('second precision is disclosed without rewriting source dates or accepting larger gaps',()=>{
  const f=prepareVedicAnnual(fixture(),2026),row=f.dasha.find(v=>v.kind==='mahadasha'&&v.lord==='Sun')!;
  row.endExclusive=new Date(Date.parse(row.endExclusive)-1000).toISOString();
  const before=JSON.stringify(f),ready=annualReportFacts(f);assert.equal(ready.dashaCoverage.mahadasha,true);assert.ok(ready.limitations.includes('DASHA_SECOND_PRECISION'));assert.equal(JSON.stringify(f),before);
  row.endExclusive=new Date(Date.parse(row.endExclusive)-1000).toISOString();assert.equal(annualReportFacts(f).dashaCoverage.mahadasha,false);
});
import { routeVedicAnnual,vedicAnnualConfig } from '../src/vedicAnnual';
import { annualFingerprint,calendarYear,prepareVedicAnnual } from '../src/vedicAnnualCalculation';
import type { VedicChartData } from '../src/vedicAstrology';
import type { Env } from '../src/utils';
import { validateVedicAnnualOutput } from '../src/vedicAnnualPrompt';
import { buildVedicAnnualPrompt } from '../src/vedicAnnualPrompt';
import { annualSampleDates,annualTransitSample,completeAnnualTransits,nextAnnualSample,TRANSIT_SIGNS } from '../src/vedicAnnualTransits';
import { AnnualTransitStore } from '../src/vedicAnnualTransitStore';
import { fetchProkeralaAnnualPositions,ProkeralaError,type ProkeralaPlanet } from '../src/prokerala';

// Synthetic fixtures only: these assert integration rules, not real ephemeris accuracy.
function fixture():VedicChartData {
  const birth={date:'2000-01-01',time:'12:00',location:'Taipei, Taiwan',latitude:25.033,longitude:121.5654,timezone:'Asia/Taipei',utcOffset:'+08:00'};
  const dasha=[{lord:'Sun',start:'2025-01-01T00:00:00+08:00',end:'2026-07-01T00:00:00+08:00',subPeriods:[
    {lord:'Venus',start:'2025-01-01T00:00:00+08:00',end:'2026-03-01T00:00:00+08:00'},
    {lord:'Saturn',start:'2026-03-01T00:00:00+08:00',end:'2026-07-01T00:00:00+08:00'}]},
  {lord:'Moon',start:'2026-07-01T00:00:00+08:00',end:'2028-01-01T00:00:00+08:00',subPeriods:[
    {lord:'Jupiter',start:'2026-07-01T00:00:00+08:00',end:'2028-01-01T00:00:00+08:00'}]}];
  const names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
  return {provider:'prokerala',ayanamsa:'lahiri',birth,moonSign:'Aries',lagna:'Aries',housePlacements:Object.fromEntries(names.map((n,i)=>[n,i+1])),
    calculationData:{provider:'prokerala',ayanamsa:'lahiri',birth:{datetime:'2000-01-01T12:00:00+08:00',latitude:birth.latitude,longitude:birth.longitude,timezone:birth.timezone},
      d1:{houses:Array.from({length:12},(_,i)=>({number:i+1,sign:'Aries'})),planets:[]},
      dasha:{periods:dasha,yearLength:365.25}}} as VedicChartData;
}
test('annual output rejects missing chapters, fabricated evidence, repeated text and omitted transitions',()=>{
  const facts=prepareVedicAnnual(fixture(),2026);
  const valid={sections:Array.from({length:10},(_,key)=>({key,
    body:`Chapter ${key}: this synthetic validation fixture discusses practical observations supported by the saved periods, without claiming real astrological accuracy.`,
    evidenceIds:facts.dasha.map(row=>row.id),actions:key===8?['Review a weekly work plan.','Set a clear spending limit.','Reserve a regular rest period.']:[]}))};
  assert.equal(validateVedicAnnualOutput(valid,facts).sections.length,10);
  const change=(edit:(draft:typeof valid)=>void)=>{const draft=structuredClone(valid);edit(draft);assert.throws(()=>validateVedicAnnualOutput(draft,facts),/REPORT_INVALID/);};
  change(draft=>{draft.sections.pop();});
  change(draft=>{draft.sections[0].evidenceIds=['invented-transit'];});
  change(draft=>{draft.sections[1].evidenceIds.pop();});
  change(draft=>{draft.sections[7].evidenceIds.pop();});
  change(draft=>{draft.sections[2].body=draft.sections[0].body;});
  change(draft=>{draft.sections[8].actions[1]=draft.sections[8].actions[0];});
  change(draft=>{draft.sections[0].key=9;});
});
test('calendar-year boundaries, historical timezone and all in-year Dasha switches',async()=>{
  const facts=prepareVedicAnnual(fixture(),2026);
  assert.equal(facts.start,'2026-01-01T00:00:00+08:00');assert.equal(facts.endExclusive,'2027-01-01T00:00:00+08:00');
  assert.deepEqual(facts.dashaCoverage,{mahadasha:true,antardasha:true});assert.equal(facts.dasha.length,5);
  assert.equal(facts.dasha.filter(d=>d.kind==='mahadasha').map(d=>d.lord).join(','),'Sun,Moon');
  assert.equal(facts.dasha.find(d=>d.lord==='Saturn')?.start,'2026-02-28T16:00:00.000Z');
  const leap=calendarYear(2024,'Asia/Taipei');assert.equal((Date.parse(leap.endExclusive)-Date.parse(leap.start))/86400000,366);
  assert.equal(calendarYear(2026,'America/New_York').start,'2026-01-01T00:00:00-05:00');
  const bad=fixture();bad.birth.time='';assert.throws(()=>prepareVedicAnnual(bad,2026),/BIRTH_INCOMPLETE/);
  const offset=fixture();offset.birth.utcOffset='+09:00';assert.throws(()=>prepareVedicAnnual(offset,2026),/BIRTH_INCOMPLETE/);
  const gap=fixture();gap.calculationData!.dasha.periods[0].subPeriods.pop();assert.equal(prepareVedicAnnual(gap,2026).dashaCoverage.antardasha,false);
  const overlap=fixture();overlap.calculationData!.dasha.periods[1].start='2026-06-01T00:00:00+08:00';assert.throws(()=>prepareVedicAnnual(overlap,2026),/DASHA_INVALID/);
  const invalid=fixture();invalid.calculationData!.dasha.periods[0].subPeriods[0].end='2026-02-30T00:00:00+08:00';assert.throws(()=>prepareVedicAnnual(invalid,2026),/DASHA_INVALID/);
  assert.throws(()=>prepareVedicAnnual(fixture(),1999),/INVALID_INPUT/);
  assert.ok(facts.limitations.includes('TRANSITS_UNAVAILABLE'));assert.equal(facts.transits,null);
  assert.notEqual(await annualFingerprint('one',fixture(),facts),await annualFingerprint('two',fixture(),facts));
  assert.notEqual(await annualFingerprint('one',fixture(),facts),await annualFingerprint('one',fixture(),prepareVedicAnnual(fixture(),2027)));
});
let mf:Miniflare,env:Env;const tokens=new Map<string,string>();const fetchBefore=globalThis.fetch;
before(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("isolated annual test")}}',compatibilityDate:'2026-06-25',d1Databases:{DB:'vedic-annual-test'}});
  const {DB}=await mf.getBindings<{DB:D1Database}>();env={DB,DB_CARDS:DB,JWT_SECRET:'test-only',ALLOWED_ORIGINS:'https://www.crystalfield101.com',ENV:'dev'};
  await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT,token_generation INTEGER DEFAULT 0)').run();
  await DB.prepare('CREATE TABLE vedic_charts(id TEXT PRIMARY KEY,user_id TEXT,chart_json TEXT,created_at TEXT,expires_at TEXT)').run();
  for(const file of ['004-orders.sql','005-orders-picks.sql','003-rate-limit-events.sql','033_vedic_annual.sql','034_vedic_annual_transits.sql','036_vedic_annual_release.sql']) {
    let sql=await readFile(new URL(`../../d1/migrations/${file}`,import.meta.url),'utf8');
    const triggers=sql.match(/CREATE TRIGGER[\s\S]*?END;/g)??[];sql=sql.replace(/CREATE TRIGGER[\s\S]*?END;/g,'').replace(/--[^\n]*/g,'');
    await DB.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
    for(const trigger of triggers)await DB.prepare(trigger).run();
  }
  for(const id of ['owner','other','admin']) {
    const email=id==='admin'?'wadehuang77@gmail.com':`${id}@example.test`;
    await DB.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(id,email).run();tokens.set(id,await signJwt({sub:id,email},env.JWT_SECRET));
    await DB.prepare("INSERT INTO vedic_charts VALUES(?,?,?,datetime('now'),'2099-01-01T00:00:00Z')").bind(`${id}-chart`,id,JSON.stringify(fixture())).run();
  }
  globalThis.fetch=async()=>{throw new Error('Tests must never call an external provider or AI');};
});
after(async()=>{globalThis.fetch=fetchBefore;await mf?.dispose();});
function call(path:string,body?:unknown,user='owner',language='zh-Hant') {
  return routeVedicAnnual(new Request(`https://api.crystalfield101.com/api/vedic-astrology/annual/${path}?language=${language}`,{
    method:body?'POST':'GET',headers:{Origin:'https://www.crystalfield101.com','Content-Type':'application/json',...(user?{Cookie:`bolt_session=${tokens.get(user)}`}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
}
test('owner isolation, idempotent persistence, frozen snapshots, price and admin exemption',async()=>{
  assert.equal(vedicAnnualConfig(env).price,599);assert.equal(vedicAnnualConfig({...env,VEDIC_ANNUAL_PRICE_TWD:'1'}).purchaseEnabled,false);
  assert.equal((await call('charts',undefined,'')).status,401);
  assert.equal((await call('previews',{chart_id:'other-chart',year:2026})).status,404);
  const results=await Promise.all([call('previews',{chart_id:'owner-chart',year:2026}),call('previews',{chart_id:'owner-chart',year:2026})]);
  for(const r of results)assert.equal(r.status,200,await r.clone().text());
  const first=await results[0].json() as {id:string};assert.equal((await results[1].json() as {id:string}).id,first.id);
  assert.equal((await call(`previews/${first.id}`,undefined,'other')).status,404);
  assert.equal((await call(`previews/${first.id}`,undefined,'owner','en')).status,200);
  assert.equal((await call('previews',{chart_id:'owner-chart',year:2027})).status,200);
  await assert.rejects(env.DB.prepare('UPDATE vedic_annual_cases SET year=2027 WHERE id=?').bind(first.id).run());
  assert.equal((await(await call(`reports/${first.id}`)).json() as {authorized:boolean}).authorized,false);
  for(const op of ['checkout','generate','retry'])assert.equal((await call(`reports/${first.id}/${op}`,{amount:1})).status,400);
  const admin=await(await call('previews',{chart_id:'admin-chart',year:2026},'admin')).json() as {id:string};
  assert.equal((await(await call('config',undefined,'admin')).json() as {adminFree:boolean}).adminFree,true);
  assert.equal((await call(`reports/${admin.id}`,undefined,'admin')).status,200,'Admin does not need a purchase; unavailable data still blocks generation');
  assert.equal((await call(`reports/${first.id}`,undefined,'admin')).status,404,'Admin cannot read another owner');
  await env.DB.prepare("UPDATE profiles SET email='different@example.test' WHERE id='admin'").run();
  assert.equal((await(await call(`reports/${admin.id}`,undefined,'admin')).json() as {authorized:boolean}).authorized,false);
  await env.DB.prepare("INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,ecpay_trade_no,picks_payload) VALUES('test-order','TEST','owner','owner@example.test','vedic_astrology','vedic_annual','Synthetic annual',599,'paid','TEST-TRADE',?)").bind(JSON.stringify({vedic_annual_case_id:first.id})).run();
  await env.DB.prepare("INSERT INTO vedic_annual_entitlements(case_id,user_id,order_id,amount,status,source) VALUES(?,'owner','test-order',599,'active','verified_payment')").bind(first.id).run();
  assert.equal((await call(`reports/${first.id}`,undefined,'owner','en')).status,200);
  await env.DB.prepare("UPDATE orders SET status='refunded' WHERE id='test-order'").run();assert.equal((await(await call(`reports/${first.id}`)).json() as {authorized:boolean}).authorized,false);
});
test('guest chart claim is signed, expiring and cannot steal another owner',async()=>{
  const token=await signJwt({sub:'owner-chart',email:'vedic-chart@crystalfield.local'},env.JWT_SECRET);
  assert.equal((await call('claim-chart',{chart_id:'owner-chart',chart_token:token},'other')).status,403);
  await env.DB.prepare("INSERT INTO vedic_charts VALUES('guest-chart',NULL,?,datetime('now'),'2099-01-01T00:00:00Z')").bind(JSON.stringify(fixture())).run();
  const guest=await signJwt({sub:'guest-chart',email:'vedic-chart@crystalfield.local'},env.JWT_SECRET);
  assert.equal((await call('claim-chart',{chart_id:'guest-chart',chart_token:guest})).status,200);
  assert.equal((await call('claim-chart',{chart_id:'guest-chart',chart_token:guest},'other')).status,403);
});

function transitFixture(at:string):ProkeralaPlanet[] {
  // Deliberately synthetic: Jupiter crosses a sign and Saturn changes motion midyear.
  const late=Date.parse(at)>=Date.parse('2026-07-01T00:00:00+08:00');
  return [{name:'Jupiter',longitude:late?31:29,sign:late?'Taurus':'Aries',retrograde:false},
    {name:'Saturn',longitude:65,sign:'Gemini',retrograde:late},
    {name:'Rahu',longitude:125,sign:'Leo',retrograde:true},
    {name:'Ketu',longitude:305,sign:'Aquarius',retrograde:true}].map(p=>({...p,sign_degree:p.longitude%30}));
}
test('bounded full-year sampling, leap year, refinement and factual evidence validation',()=>{
  const facts=prepareVedicAnnual(fixture(),2026),dates=annualSampleDates(facts);
  assert.equal(dates.length,47);assert.equal(dates[0],'2025-12-31T16:00:00.000Z');assert.equal(dates.at(-1),'2026-12-31T15:59:59.000Z');
  const leap={...facts,...calendarYear(2024,'America/New_York')};assert.equal(annualSampleDates(leap).length,47);
  assert.equal(annualSampleDates(leap).at(-1),'2025-01-01T04:59:59.000Z');
  const samples=dates.map(at=>annualTransitSample(facts,at,transitFixture(at)));
  assert.throws(()=>completeAnnualTransits(facts,samples.slice(1)),/TRANSIT_INCOMPLETE/);
  assert.throws(()=>nextAnnualSample(facts,[],64),/TRANSIT_BUDGET/);
  let calls=samples.length,at:string|null;
  while((at=nextAnnualSample(facts,samples,calls))!==null){samples.push(annualTransitSample(facts,at,transitFixture(at)));calls++;}
  assert.ok(calls<=64&&calls>47);
  const data=completeAnnualTransits(facts,samples);assert.equal(data.events.length,2);assert.equal(data.maxGapDays,8);
  for(const event of data.events)assert.ok(Date.parse(event.by)-Date.parse(event.after)<=86400000);
  assert.equal(data.samples[0].positions[0].signFromMoon,1);
  assert.equal(data.samples.at(-1)!.positions[0].signFromAscendant,2);
  const wrong=transitFixture(dates[0]);wrong[0].sign='Pisces';assert.throws(()=>annualTransitSample(facts,dates[0],wrong),/TRANSIT_INVALID/);
  const nodes=transitFixture(dates[0]);nodes[3].longitude=306;assert.throws(()=>annualTransitSample(facts,dates[0],nodes),/TRANSIT_INVALID/);
  assert.throws(()=>completeAnnualTransits(facts,[...samples,samples[0]]),/TRANSIT_INVALID/);
  assert.ok(buildVedicAnnualPrompt({...facts,transits:data},'en').system.includes('sampled observations'));
  const tampered=structuredClone(data);tampered.events[0].by='2026-01-01T00:00:00Z';
  assert.throws(()=>buildVedicAnnualPrompt({...facts,transits:tampered},'en'),/TRANSIT_INVALID/);
});
test('transit collection persists, resumes, bounds concurrent calls and shares languages',async()=>{
  await env.DB.prepare("UPDATE profiles SET email='wadehuang77@gmail.com' WHERE id='admin'").run();
  const preview=await(await call('previews',{chart_id:'admin-chart',year:2026},'admin')).json() as {id:string};
  const facts=prepareVedicAnnual(fixture(),2026),store=new AnnualTransitStore(env.DB);
  assert.equal((await call(`transits/${preview.id}`,undefined,'other')).status,404);
  assert.equal((await call(`transits/${preview.id}`,{},'admin')).status,503,'live switch remains closed');
  let calls=0;
  const provider=async(_env:unknown,at:string)=>{calls++;await new Promise(r=>setTimeout(r,10));return transitFixture(at);};
  await Promise.all([store.step(env,preview.id,facts,provider),store.step(env,preview.id,facts,provider)]);
  assert.equal(calls,1,'atomic lease permits one provider call');
  let state=await store.state(preview.id,facts);
  while(state.status!=='completed'){state=await store.step(env,preview.id,facts,provider);assert.notEqual(state.status,'failed');assert.ok(calls<=64);}
  const before=calls;await store.step(env,preview.id,facts,provider);assert.equal(calls,before,'saved annual samples are reused');
  const zh=await(await call(`transits/${preview.id}`,undefined,'admin')).json();
  const en=await(await call(`transits/${preview.id}`,undefined,'admin','en')).json();assert.deepEqual(en,zh);
  const hydrated=await store.facts(preview.id,facts);assert.ok(hydrated.transits);assert.ok(!hydrated.limitations.includes('TRANSITS_UNAVAILABLE'));
  assert.ok(buildVedicAnnualPrompt(hydrated,'zh-Hant'));
  const retryCase=await(await call('previews',{chart_id:'admin-chart',year:2027},'admin')).json() as {id:string};
  const retryFacts=prepareVedicAnnual(fixture(),2027);
  let failed=await store.step(env,retryCase.id,retryFacts,async()=>{throw new ProkeralaError('PROKERALA_RATE_LIMITED','planet-position',429,90);});
  assert.equal(failed.status,'failed');assert.equal(failed.callsUsed,1);assert.ok(failed.retryAt);
  await store.step(env,retryCase.id,retryFacts,provider);assert.equal(calls,before,'Retry-After is honored');
  await env.DB.prepare('UPDATE vedic_annual_transits SET retry_at=NULL WHERE case_id=?').bind(retryCase.id).run();
  failed=await store.step(env,retryCase.id,retryFacts,provider);assert.equal(failed.samplesCollected,1);assert.equal(failed.callsUsed,2);
  await env.DB.prepare('UPDATE vedic_annual_transits SET calls_used=64 WHERE case_id=?').bind(retryCase.id).run();
  failed=await store.step(env,retryCase.id,retryFacts,provider);assert.equal(failed.errorCode,'TRANSIT_BUDGET');assert.equal(failed.callsUsed,64);
  const own=await(await call('previews',{chart_id:'owner-chart',year:2026})).json() as {id:string};
  assert.equal((await call(`transits/${own.id}`)).status,403,'refunded owner cannot fetch transit data');
});
test('annual provider adapter uses documented endpoint and rejects incomplete responses without retry',async()=>{
  const prior=globalThis.fetch;let calls=0;
  const credentials={PROKERALA_CLIENT_ID:'synthetic-id',PROKERALA_CLIENT_SECRET:'synthetic-secret'};
  try {
    globalThis.fetch=async(input,init)=>{
      const url=new URL(String(input));
      if(url.pathname==='/token')return Response.json({access_token:'synthetic-token',token_type:'Bearer',expires_in:3600});
      calls++;assert.equal(url.pathname,'/v2/astrology/planet-position');assert.equal(url.searchParams.get('ayanamsa'),'1');assert.equal(url.searchParams.get('la'),'en');
      assert.equal(url.searchParams.get('datetime'),'2026-01-01T00:00:00.000Z');assert.equal(url.searchParams.get('coordinates'),'25.033,121.5654');
      assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer synthetic-token');
      const ids=[0,1,2,3,4,5,6,100,101,102],names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Ascendant','Rahu','Ketu'];
      return Response.json({status:'ok',data:{planet_position:ids.map((id,i)=>({id,name:names[i],rasi:{id:i},longitude:i*30+1,degree:1,is_retrograde:false}))}});
    };
    assert.equal((await fetchProkeralaAnnualPositions(credentials,'2026-01-01T00:00:00.000Z',25.033,121.5654)).length,10);assert.equal(calls,1);
    globalThis.fetch=async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});};
    await assert.rejects(fetchProkeralaAnnualPositions(credentials,'2026-01-01T00:00:00.000Z',25.033,121.5654),(error:unknown)=>error instanceof ProkeralaError&&error.retryAfterSeconds===120);assert.equal(calls,2);
    globalThis.fetch=async()=>Response.json({status:'ok',data:{planet_position:[]}});
    await assert.rejects(fetchProkeralaAnnualPositions(credentials,'2026-01-01T00:00:00.000Z',25.033,121.5654),/PROKERALA_INVALID_RESPONSE/);
  }finally{globalThis.fetch=prior;}
});

test('599 checkout, signed callback, isolation, bilingual generation, cache and manual retry',async()=>{
  const jobs=new Map<string,AnnualJobInput>();
  Object.assign(env,{VEDIC_ANNUAL_PAYMENT_ENABLED:'true',VEDIC_ANNUAL_GENERATION_ENABLED:'true',VEDIC_ANNUAL_TRANSITS_ENABLED:'true',
    OPENAI_API_KEY:'fixture-only',OPENAI_MODEL:'gpt-5.4',PROKERALA_CLIENT_ID:'fixture-only',PROKERALA_CLIENT_SECRET:'fixture-only',ECPAY_MERCHANT_ID:'fixture-shop',ECPAY_HASH_KEY:'fixture-key',ECPAY_HASH_IV:'fixture-iv',
    VEDIC_ANNUAL_REPORT_WORKFLOW:{createBatch:async(rows:Array<{id:string;params:AnnualJobInput}>)=>{rows.forEach(r=>jobs.set(r.id,r.params));return [];},get:async()=>({status:async()=>({status:'running'})})}});
  await env.DB.prepare("INSERT INTO profiles(id,email) VALUES('buyer','buyer@example.test')").run();
  tokens.set('buyer',await signJwt({sub:'buyer',email:'buyer@example.test'},env.JWT_SECRET));
  await env.DB.prepare("INSERT INTO vedic_charts VALUES('buyer-chart','buyer',?,datetime('now'),'2099-01-01')").bind(JSON.stringify(fixture())).run();
  const preview=await(await call('previews',{chart_id:'buyer-chart',year:2026},'buyer')).json() as {id:string;facts:VedicAnnualFacts};
  const id=preview.id;
  assert.equal((await call(`reports/${id}/generate`,{},'buyer')).status,403);
  assert.equal((await call(`reports/${id}/checkout`,{amount:1},'buyer')).status,400);
  assert.equal((await call(`reports/${id}/checkout`,{},'other')).status,404);
  const forms=await Promise.all([call(`reports/${id}/checkout`,{},'buyer'),call(`reports/${id}/checkout`,{},'buyer')]);
  const one=await forms[0].json() as {order_id:string;amount:number;ecpay:{fields:Record<string,string>}},two=await forms[1].json() as typeof one;
  assert.equal(one.amount,599);assert.equal(one.order_id,two.order_id);assert.equal(one.ecpay.fields.TotalAmount,'599');
  const params={MerchantID:'fixture-shop',MerchantTradeNo:one.ecpay.fields.MerchantTradeNo,TradeAmt:'599',TradeNo:'FIXTURE-ANNUAL-TRADE',RtnCode:'1',SimulatePaid:'0',PaymentType:'Credit'};
  async function callback(overrides:Record<string,string>={},badSignature=false){
    const values={...params,...overrides};const mac=await computeEcpayCheckMac(values,env.ECPAY_HASH_KEY!,env.ECPAY_HASH_IV!);
    return worker.fetch(new Request('https://api.crystalfield101.com/api/ecpay-webhook',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,CheckMacValue:badSignature?'invalid':mac})}),env,{} as ExecutionContext);
  }
  assert.equal((await callback({},true)).status,400);assert.equal((await callback({TradeAmt:'1'})).status,400);assert.equal((await callback({MerchantID:'other'})).status,400);
  await callback({SimulatePaid:'1'});assert.equal((await(await call(`reports/${id}`,undefined,'buyer')).json() as {authorized:boolean}).authorized,false);
  assert.equal(await(await callback()).text(),'1|OK');assert.equal(await(await callback()).text(),'1|OK');
  for(const lang of ['en','zh-Hant'])assert.equal((await(await call(`reports/${id}`,undefined,'buyer',lang)).json() as {authorized:boolean}).authorized,true);
  const transits=completeAnnualTransits(preview.facts,annualSampleDates(preview.facts).map(at=>annualTransitSample(preview.facts,at,transitFixture(at))));
  await env.DB.prepare("INSERT INTO vedic_annual_transits(case_id,status,calls_used,samples_json,data_json) VALUES(?,'completed',47,?,?)").bind(id,JSON.stringify(transits.samples),JSON.stringify(transits)).run();
  assert.equal((await call(`reports/${id}/generate`,{},'buyer')).status,200);assert.equal((await call(`reports/${id}/generate`,{},'buyer')).status,200);assert.equal(jobs.size,1);
  const input=[...jobs.values()][0],facts={...preview.facts,transits},ids=[...facts.dasha.map(d=>d.id),...transits.events.map(e=>e.id)];
  const output={sections:Array.from({length:10},(_,key)=>({key,body:`Chapter ${key}. `+'A synthetic reading for isolated tests discusses practical observation and clear communication. '.repeat(3),evidenceIds:ids,actions:key===8?['Set a weekly planning time.','Discuss a shared work boundary.','Review spending every month.']:[]}))};
  let aiCalls=0;const previous=globalThis.fetch;
  const step={do:async(_name:string,_config:unknown,run:()=>Promise<unknown>)=>run(),sleep:async()=>{}} as unknown as Parameters<typeof runAnnualJob>[2];
  try{
    globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.openai.com/v1/responses');aiCalls++;const payload=JSON.parse(init?.body as string);assert.equal(payload.text.format.type,'json_schema');assert.equal(payload.store,false);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}],usage:{input_tokens:100,output_tokens:100}});};
    await runAnnualJob(env,input,step);const saved=await(await call(`reports/${id}`,undefined,'buyer')).json() as {status:string;report:unknown};assert.equal(saved.status,'completed');assert.ok(saved.report);assert.equal(aiCalls,1);
    await call(`reports/${id}/generate`,{},'buyer');assert.equal(jobs.size,1);assert.equal(aiCalls,1);
    await assert.rejects(annualAiOnce(env,input,facts),/AI_OUTCOME_UNKNOWN/);assert.equal(aiCalls,1);
    await call(`reports/${id}/generate`,{},'buyer','en');const english=[...jobs.values()].find(j=>j.language==='en')!;
    globalThis.fetch=async()=>{aiCalls++;throw Error('synthetic interruption');};await runAnnualJob(env,english,step);
    const failed=await(await call(`reports/${id}`,undefined,'buyer','en')).json() as {status:string;authorized:boolean};assert.equal(failed.status,'failed');assert.equal(failed.authorized,true);
    await call(`reports/${id}/retry`,{},'buyer','en');assert.equal(jobs.size,3);
    await env.DB.prepare("UPDATE orders SET status='refunded' WHERE id=?").bind(one.order_id).run();
    assert.equal((await(await call(`reports/${id}`,undefined,'buyer')).json() as {authorized:boolean}).authorized,false);
    assert.equal((await callback()).status,400);
    const retry=[...jobs.values()].at(-1)!;const calls=aiCalls;await runAnnualJob(env,retry,step);assert.equal(aiCalls,calls,'revoked entitlement must stop AI');
    await env.DB.prepare("UPDATE profiles SET email='wadehuang77@gmail.com' WHERE id='admin'").run();
    const admin=await(await call('previews',{chart_id:'admin-chart',year:2026},'admin')).json() as {id:string};
    assert.equal((await call(`reports/${admin.id}/generate`,{},'admin')).status,200,'admin can start without an order');
  }finally{globalThis.fetch=previous;}
});
