import { json,readBody,readSession,isAllowedOrigin,rateLimit,type Env,type SessionUser } from './utils';
import { verifyJwt } from './auth';
import { AnnualTransitStore } from './vedicAnnualTransitStore';
import type { VedicChartData } from './vedicAstrology';
import { prepareVedicAnnual,annualFingerprint,VedicAnnualError,annualReportFacts } from './vedicAnnualCalculation';
import { annualGenerationEnabled,annualReportView,startAnnualReport } from './vedicAnnualReport';
import { annualCheckout } from './vedicAnnualPayment';
import { VEDIC_ANNUAL_PRODUCT,VEDIC_ANNUAL_VERSION,VEDIC_ANNUAL_PROMPT_VERSION,annualVedicMessage,type VedicAnnualFacts,type VedicAnnualConfig } from '../../app/src/lib/vedicAnnual';

// Dedicated checkout: never expose this fixed-case product to generic checkout.
export function vedicAnnualConfig(env:Env):VedicAnnualConfig {
  const generationEnabled=annualGenerationEnabled(env)&&env.VEDIC_ANNUAL_TRANSITS_ENABLED==='true'&&!!env.PROKERALA_CLIENT_ID&&!!env.PROKERALA_CLIENT_SECRET;
  return {product:VEDIC_ANNUAL_PRODUCT,price:599,currency:'TWD',purchaseEnabled:generationEnabled&&env.VEDIC_ANNUAL_PAYMENT_ENABLED==='true'&&!!env.ECPAY_MERCHANT_ID&&!!env.ECPAY_HASH_KEY&&!!env.ECPAY_HASH_IV,generationEnabled,
    transitEnabled:env.VEDIC_ANNUAL_TRANSITS_ENABLED==='true'&&!!env.PROKERALA_CLIENT_ID&&!!env.PROKERALA_CLIENT_SECRET,
    reasons:generationEnabled?[]:['RELEASE_PENDING']};
}
interface CaseRow {id:string;user_id:string;chart_id:string;calculation_json:string;status:'awaiting_data';created_at:string}
function present(row:CaseRow) {return {id:row.id,chartId:row.chart_id,facts:annualReportFacts(JSON.parse(row.calculation_json) as VedicAnnualFacts),status:row.status,createdAt:row.created_at};}
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
export async function vedicAnnualAdmin(env:Env,user:SessionUser|null):Promise<boolean> {
  if(!user||user.email.trim().toLowerCase()!=='wadehuang77@gmail.com')return false;
  const profile=await env.DB.prepare('SELECT email FROM profiles WHERE id=?').bind(user.id).first<{email:string}>();
  return profile?.email.trim().toLowerCase()==='wadehuang77@gmail.com';
}
async function ownedCase(env:Env,id:string,user:string) {
  const row=await env.DB.prepare('SELECT * FROM vedic_annual_cases WHERE id=? AND user_id=?').bind(id,user).first<CaseRow>();
  if(!row)throw new VedicAnnualError('NOT_FOUND',404);return row;
}
export async function annualAccess(env:Env,id:string,user:SessionUser) {
  if(await vedicAnnualAdmin(env,user))return true;
  return !!await env.DB.prepare(`SELECT e.case_id FROM vedic_annual_entitlements e JOIN orders o ON o.id=e.order_id
    WHERE e.case_id=? AND e.user_id=? AND e.status='active' AND e.source='verified_payment'
    AND o.user_id=e.user_id AND o.status='paid' AND o.item_id='vedic_annual' AND o.amount=599 AND e.amount=599 AND o.ecpay_trade_no IS NOT NULL
    AND json_valid(o.picks_payload) AND json_extract(o.picks_payload,'$.vedic_annual_case_id')=e.case_id`).bind(id,user.id).first();
}
export async function routeVedicAnnual(req:Request,env:Env):Promise<Response> {
  const url=new URL(req.url),en=url.searchParams.get('language')==='en';
  const respond=(body:unknown,status=200)=>json(req,env,body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
  const base='/api/vedic-astrology/annual';
  try {
    if(req.method==='GET'&&url.pathname===`${base}/config`){
      const ready=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vedic_annual_jobs'").first();
      const config=vedicAnnualConfig(env);return respond({...config,...(!ready?{purchaseEnabled:false,generationEnabled:false,reasons:['STORAGE_NOT_READY']}:{}),adminFree:await vedicAnnualAdmin(env,await readSession(req,env,true))});
    }
    const user=await readSession(req,env,true);if(!user)throw new VedicAnnualError('LOGIN_REQUIRED',401);
    if(req.method!=='GET'&&!isAllowedOrigin(req,env))throw new VedicAnnualError('BAD_ORIGIN',403);
    if(url.pathname===`${base}/charts`&&req.method==='GET') {
      const schema=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vedic_charts'").first();
      if(!schema)return respond({charts:[]});
      const rows=await env.DB.prepare('SELECT id,chart_json,created_at FROM vedic_charts WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all<{id:string;chart_json:string;created_at:string}>();
      return respond({charts:rows.results.map(row=>{
        const chart=JSON.parse(row.chart_json) as VedicChartData;
        return {id:row.id,birth:chart.birth,provider:chart.provider??'legacy',createdAt:row.created_at};
      })});
    }
    if(url.pathname===`${base}/claim-chart`&&req.method==='POST') {
      const body=await readBody<{chart_id?:unknown;chart_token?:unknown}>(req,4096);
      if(!body||!validId(body.chart_id)||typeof body.chart_token!=='string'||Object.keys(body).some(k=>!['chart_id','chart_token'].includes(k)))throw new VedicAnnualError('INVALID_INPUT',400);
      const token=await verifyJwt(body.chart_token,env.JWT_SECRET);
      if(token?.sub!==body.chart_id||token.email!=='vedic-chart@crystalfield.local')throw new VedicAnnualError('CLAIM_INVALID',403);
      const changed=await env.DB.prepare('UPDATE vedic_charts SET user_id=? WHERE id=? AND (user_id IS NULL OR user_id=?) AND expires_at>? RETURNING id')
        .bind(user.id,body.chart_id,user.id,new Date().toISOString()).first();
      if(!changed)throw new VedicAnnualError('CLAIM_INVALID',403);
      return respond({chartId:body.chart_id});
    }
    const exists=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vedic_annual_cases'").first();
    if(!exists)throw new VedicAnnualError('STORAGE_NOT_READY',503);
    const transits=url.pathname.match(/^\/api\/vedic-astrology\/annual\/transits\/([a-zA-Z0-9_-]{1,80})$/);
    if(transits&&['GET','POST'].includes(req.method)) {
      const row=await ownedCase(env,transits[1],user.id);
      if(!await annualAccess(env,row.id,user))throw new VedicAnnualError('PAYMENT_REQUIRED',403);
      if(!await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vedic_annual_transits'").first())throw new VedicAnnualError('STORAGE_NOT_READY',503);
      const facts=JSON.parse(row.calculation_json) as VedicAnnualFacts,store=new AnnualTransitStore(env.DB);
      if(req.method==='GET')return respond(await store.state(row.id,facts));
      if(!vedicAnnualConfig(env).transitEnabled)throw new VedicAnnualError('TRANSITS_DISABLED',503);
      const body=await readBody<Record<string,unknown>>(req,1024);
      if(!body||Object.keys(body).length)throw new VedicAnnualError('INVALID_INPUT',400);
      const limit=await rateLimit(env,'vedic-annual-transit',user.id,80,3600);if(!limit.allowed)throw new VedicAnnualError('TOO_MANY_REQUESTS',429);
      return respond(await store.step(env,row.id,facts));
    }
    if(url.pathname===`${base}/previews`&&req.method==='GET') {
      const rows=await env.DB.prepare('SELECT * FROM vedic_annual_cases WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all<CaseRow>();
      return respond({previews:rows.results.map(present)});
    }
    if(url.pathname===`${base}/previews`&&req.method==='POST') {
      const limit=await rateLimit(env,'vedic-annual-preview',user.id,20,3600);if(!limit.allowed)throw new VedicAnnualError('TOO_MANY_REQUESTS',429);
      const body=await readBody<{chart_id?:unknown;year?:unknown}>(req,1024);
      if(!body||!validId(body.chart_id)||typeof body.year!=='number'||!Number.isInteger(body.year)||Object.keys(body).some(k=>!['chart_id','year'].includes(k)))throw new VedicAnnualError('INVALID_INPUT',400);
      const row=await env.DB.prepare('SELECT chart_json FROM vedic_charts WHERE id=? AND user_id=?').bind(body.chart_id,user.id).first<{chart_json:string}>();
      if(!row)throw new VedicAnnualError('NOT_FOUND',404);
      const chart=JSON.parse(row.chart_json) as VedicChartData;
      const facts=prepareVedicAnnual(chart,body.year),fingerprint=await annualFingerprint(user.id,chart,facts);
      const id=crypto.randomUUID();
      await env.DB.prepare(`INSERT OR IGNORE INTO vedic_annual_cases(id,user_id,chart_id,product_code,fingerprint,year,timezone,period_start,period_end_exclusive,birth_snapshot_json,calculation_json,settings_json,calculation_version,prompt_version)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,body.chart_id,VEDIC_ANNUAL_PRODUCT,fingerprint,body.year,facts.timezone,facts.start,facts.endExclusive,JSON.stringify(chart),JSON.stringify(facts),JSON.stringify(facts.settings),VEDIC_ANNUAL_VERSION,VEDIC_ANNUAL_PROMPT_VERSION).run();
      const saved=await env.DB.prepare('SELECT * FROM vedic_annual_cases WHERE user_id=? AND fingerprint=?').bind(user.id,fingerprint).first<CaseRow>();
      if(!saved)throw new VedicAnnualError('INTERNAL_ERROR',500);
      return respond(present(saved));
    }
    const preview=url.pathname.match(/^\/api\/vedic-astrology\/annual\/previews\/([a-zA-Z0-9_-]{1,80})$/);
    if(preview&&req.method==='GET')return respond(present(await ownedCase(env,preview[1],user.id)));
    const report=url.pathname.match(/^\/api\/vedic-astrology\/annual\/reports\/([a-zA-Z0-9_-]{1,80})(?:\/(generate|retry|checkout))?$/);
    if(report&&['GET','POST'].includes(req.method)) {
      await ownedCase(env,report[1],user.id);
      if(req.method==='GET')return respond(await annualReportView(env,report[1],user,en?'en':'zh-Hant'));
      const body=await readBody<Record<string,unknown>>(req,1024);
      if(!body||Object.keys(body).length)throw new VedicAnnualError('INVALID_INPUT',400);
      if(!await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vedic_annual_jobs'").first())throw new VedicAnnualError('STORAGE_NOT_READY',503);
      const limit=await rateLimit(env,'vedic-annual-report',user.id,30,3600);if(!limit.allowed)throw new VedicAnnualError('TOO_MANY_REQUESTS',429);
      if(report[2]==='checkout'){
        if(await annualAccess(env,report[1],user))return respond({already_paid:true});
        if(!vedicAnnualConfig(env).purchaseEnabled)throw new VedicAnnualError('RELEASE_PENDING',503);
        return respond(await annualCheckout(req,env,report[1],user,en));
      }
      if(!['generate','retry'].includes(report[2]))throw new VedicAnnualError('NOT_FOUND',404);
      return respond(await startAnnualReport(env,report[1],user,en?'en':'zh-Hant'));
    }
    throw new VedicAnnualError('NOT_FOUND',404);
  }catch(error){const code=error instanceof VedicAnnualError?error.code:'INTERNAL_ERROR';return respond({code,error:annualVedicMessage(code,en)},error instanceof VedicAnnualError?error.status:500);}
}
