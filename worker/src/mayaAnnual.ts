import { json, readSession, readBody, isAllowedOrigin, type Env } from './utils';
import { mayaAdminLive, mayaFeatures } from './mayaFeatures';
import { mayaAnnualPaymentEnabled } from './mayaPayments';
import { mayaAiMode, MAYA_AI_MODEL, MAYA_AI_ORDER_CAP_TWD, MAYA_AI_TIMEOUT_MS } from './mayaAi';
import { ANNUAL_CHAPTERS, ANNUAL_CASTLES, MAYA_ANNUAL_PRODUCT, annualSnapshot, annualError, type AnnualSnapshot, type AnnualState } from '../../app/src/lib/mayaAnnual';
import { mayaSignature, type MayaLocale } from '../../app/src/lib/maya';

const INPUT_LIMIT = 4000;
const OUTPUT_LIMIT = 800;
// Conservative worst case at the existing Maya provider's USD pricing and TWD conversion.
const RESERVATION = (INPUT_LIMIT * 0.15 + OUTPUT_LIMIT * 0.6) / 1_000_000 * 35;
class AnnualError extends Error { constructor(readonly code: string, readonly status = 409) { super(code); } }
interface Row { id: string; status: AnnualState['status']; sections_json: string; report_json: string | null; error: string | null; lease_until: string | null }
interface Access { snapshot_json: string }
export async function annualAccess(env: Env, user: string, order: string): Promise<AnnualSnapshot> {
  const row = await env.DB.prepare(`SELECT p.snapshot_json FROM maya_annual_payment_orders p
    JOIN orders o ON o.id=p.order_id AND o.user_id=p.user_id
    JOIN maya_annual_entitlements e ON e.order_id=o.id AND e.user_id=o.user_id AND e.product_code=o.item_id
    WHERE p.order_id=? AND p.user_id=? AND o.item_type='maya' AND o.item_id=? AND o.amount=599
    AND o.status='paid' AND p.payment_state='paid' AND p.product_code=o.item_id
    AND e.status='active' AND e.source='verified_payment' AND e.starts_at<=datetime('now')
    AND (e.expires_at IS NULL OR e.expires_at>datetime('now'))
    AND p.trade_no=o.ecpay_trade_no AND p.merchant_id=?`).bind(order,user,MAYA_ANNUAL_PRODUCT.code,env.ECPAY_MERCHANT_ID).first<Access>();
  if (!row) throw new AnnualError('PAYMENT_REQUIRED',403);
  return JSON.parse(row.snapshot_json) as AnnualSnapshot;
}
function view(row: Row | null, snapshot: AnnualSnapshot, orderId: string, locale: MayaLocale): AnnualState {
  const completed = row ? (JSON.parse(row.sections_json) as unknown[]).length : 0;
  return { orderId, snapshot, locale, status: row?.status ?? 'pending', completed,
    percent: row?.status === 'completed' && row.report_json ? 100 : completed * 9,
    error: row?.error ?? null, sections: row?.status === 'completed' && row.report_json ? JSON.parse(row.report_json) : null };
}
export function annualMessages(snapshot: AnnualSnapshot, locale: MayaLocale, index: number, previous: Array<{body:string}>) {
  const purpose = [
    'Synthesize one central theme, with a grounded everyday example.',
    'Integrate the supplied seal and tone. Discuss gifts AND learning edges, not fixed personality.',
    'Balance advancing, grounding, tidying and resting. Do not assign all effort by castle color.',
    'Offer specific project, creative, learning and collaboration choices.',
    'Discuss boundaries, expressing needs and listening, with a realistic example.',
    'Discuss budgeting, allocation and consumption reflection. No investment return predictions.',
    'Suggest ordinary rest, awareness and scheduling. No diagnosis or treatment claims.',
    'Distinguish the age-based cycle position from the annual KIN castle. Explain castle theme as symbolic context, never an age stage.',
    'Give exactly three concrete, doable actions connected to the supplied seal and tone.',
    'Warm one-to-one closing with a practical reminder, without promising events.',
  ][index];
  return [
    { role:'system', content: `Write one chapter of a Dreamspell birthday-year self-reflection report. ${locale === 'en' ? 'Natural English only.' : '只使用自然繁體中文，像老師一對一諮詢。'}
Return strict JSON. Body: 120–220 English words or 180–350 Chinese characters. ${index === 8 ? 'Include exactly three actions in actions array; keep body brief.' : ''}
${purpose}
Use only server evidence. Never calculate or change birthdays, dates, age, KIN, seal, tone, castle or cycle position. Do not repeat numeric facts in prose; UI displays them.
Five castles are intervals of 52 KIN, not five divisions of a 52-year life. Castle color alone cannot determine advice.
No scientific certainty, destiny, medical, financial or event predictions. No monthly luck, dates, probability, fabricated biography or personal past events. No HTML.
Keep chapters distinct. Avoid repeated opening phrases, generic praise and unsupported reassurance.` },
    { role:'user', content: JSON.stringify({ snapshot, signature: mayaSignature(snapshot.kin,locale),
      castleTheme: ANNUAL_CASTLES[snapshot.castle-1][locale === 'en' ? 1 : 0], chapter: ANNUAL_CHAPTERS[index][locale === 'en' ? 1 : 0],
      previousOpenings: previous.map(s => s.body.slice(0,32)) }) },
  ];
}
export function validateAnnualSection(value: unknown, locale: MayaLocale, index: number): string {
  const v = value as { body?: unknown; actions?: unknown };
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).sort().join() !== (index === 8 ? 'actions,body' : 'body')
    || typeof v.body !== 'string' || v.body.length < 40 || v.body.length > 3500) throw new AnnualError('AI_SCHEMA_INVALID');
  if (index === 8 && (!Array.isArray(v.actions) || v.actions.length !== 3 || v.actions.some(a=>typeof a !== 'string' || a.length < 8 || a.length > 500))) throw new AnnualError('AI_SCHEMA_INVALID');
  const body = v.body + (index === 8 ? '\n\n' + (v.actions as string[]).map((a,i)=>`${i+1}. ${a}`).join('\n') : '');
  if (/[<>]/.test(body) || (locale === 'en' ? /[\u3400-\u9fff]/.test(body) : !/[\u3400-\u9fff]/.test(body))
    || /KIN\s*\d+|\d{4}-\d{2}-\d{2}|\d+\s*%/i.test(body)) throw new AnnualError('AI_SCHEMA_INVALID');
  return body;
}
async function generateSection(env: Env, snapshot: AnnualSnapshot, locale: MayaLocale, row: Row, order: string, authorize: ()=>Promise<unknown>) {
  const sections = JSON.parse(row.sections_json) as Array<{heading:string;body:string}>;
  const index = sections.length;
  if (index >= 10) throw new AnnualError('REPORT_STATE_INVALID');
  const saved = await env.DB.prepare("SELECT body FROM maya_annual_ai_attempts WHERE report_id=? AND section_index=? AND state='completed'")
    .bind(row.id,index).first<{body:string|null}>();
  if (saved?.body) {
    sections.push({heading:ANNUAL_CHAPTERS[index][locale==='en'?1:0],body:saved.body});
    return sections;
  }
  const mode = mayaAiMode(env);
  if (mode === 'mock') {
    sections.push({heading:ANNUAL_CHAPTERS[index][locale==='en'?1:0],body:locale==='en'
      ? `Local test chapter ${index+1}. This is mock content for testing progress and permissions, not a personal interpretation. Practice one small action and reflect on your choices.`
      : `本地測試章節 ${index+1}。這是驗證進度與權限用的模擬文字，不是個人化正式解讀。請以一個小行動觀察自己的選擇與感受。`});
    return sections;
  }
  // Never allow development tests to make paid requests through this endpoint.
  if (env.ENV !== 'production') throw new AnnualError('LOCAL_MOCK_ONLY');
  const messages = annualMessages(snapshot,locale,index,sections);
  if (new TextEncoder().encode(JSON.stringify(messages)).length > INPUT_LIMIT - 256) throw new AnnualError('AI_INPUT_LIMIT');
  const attemptId = crypto.randomUUID();
  await env.DB.prepare('INSERT OR IGNORE INTO maya_ai_budgets(order_id) VALUES (?)').bind(order).run();
  const reserved = await env.DB.batch([
    env.DB.prepare(`UPDATE maya_ai_budgets SET reserved_twd=reserved_twd+? WHERE order_id=? AND reserved_twd+?<=?
      AND (SELECT COUNT(*) FROM maya_annual_ai_attempts WHERE report_id=? AND section_index=?)<3
      AND NOT EXISTS(SELECT 1 FROM maya_annual_ai_attempts WHERE report_id=? AND section_index=? AND state IN ('reserved','unknown','completed'))`)
      .bind(RESERVATION,order,RESERVATION,MAYA_AI_ORDER_CAP_TWD,row.id,index,row.id,index),
    env.DB.prepare("INSERT INTO maya_annual_ai_attempts(id,report_id,section_index,state) SELECT ?,?,?,'reserved' WHERE changes()=1").bind(attemptId,row.id,index),
  ]);
  if (reserved[1].meta.changes !== 1) throw new AnnualError('AI_COST_LIMIT');
  await authorize();
  let data: {model?:string;usage?:{prompt_tokens:number;completion_tokens:number};choices?:Array<{finish_reason:string;message:{content:string}}>};
  const properties = { body:{type:'string'}, ...(index===8?{actions:{type:'array',minItems:3,maxItems:3,items:{type:'string'}}}:{}) };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST',signal:AbortSignal.timeout(MAYA_AI_TIMEOUT_MS),
      headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:MAYA_AI_MODEL,max_completion_tokens:OUTPUT_LIMIT,messages,
        response_format:{type:'json_schema',json_schema:{name:'maya_annual_section',strict:true,schema:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}}})});
    if (!response.ok) throw new Error('Provider unavailable');
    const reader=response.body?.getReader(); if(!reader) throw new Error('Empty response');
    let text='', bytes=0; const decoder=new TextDecoder();
    try { for(;;) {const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>64000){await reader.cancel();throw new Error('Output limit');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode(); }
    finally {reader.releaseLock();}
    data=JSON.parse(text);
  } catch {
    await env.DB.prepare("UPDATE maya_annual_ai_attempts SET state='unknown' WHERE id=?").bind(attemptId).run();
    throw new AnnualError('AI_OUTCOME_UNKNOWN');
  }
  const usage=data.usage;
  if(!usage || !Number.isInteger(usage.prompt_tokens) || !Number.isInteger(usage.completion_tokens) || usage.prompt_tokens<0 || usage.prompt_tokens>INPUT_LIMIT || usage.completion_tokens<0 || usage.completion_tokens>OUTPUT_LIMIT) {
    await env.DB.prepare("UPDATE maya_annual_ai_attempts SET state='unknown' WHERE id=?").bind(attemptId).run();
    throw new AnnualError('AI_OUTCOME_UNKNOWN');
  }
  const cost=(usage.prompt_tokens*.15+usage.completion_tokens*.6)/1e6*35;
  let body='';
  try {
    if(!data.model?.startsWith(MAYA_AI_MODEL) || data.choices?.[0]?.finish_reason!=='stop')throw new Error('Incomplete');
    body=validateAnnualSection(JSON.parse(data.choices[0].message.content),locale,index);
    if(sections.some(s=>s.body===body || s.body.slice(0,50)===body.slice(0,50)))body='';
  } catch {body='';}
  await env.DB.batch([
    env.DB.prepare("UPDATE maya_annual_ai_attempts SET state=?,body=?,input_tokens=?,output_tokens=?,cost_twd=? WHERE id=?").bind(body?'completed':'failed',body||null,usage.prompt_tokens,usage.completion_tokens,cost,attemptId),
    env.DB.prepare('UPDATE maya_ai_budgets SET actual_twd=actual_twd+? WHERE order_id=?').bind(cost,order),
  ]);
  if(!body)throw new AnnualError('AI_SCHEMA_INVALID');
  sections.push({heading:ANNUAL_CHAPTERS[index][locale==='en'?1:0],body});
  return sections;
}
export async function routeMayaAnnual(req:Request,env:Env):Promise<Response> {
  const url=new URL(req.url); const locale:MayaLocale=url.searchParams.get('locale')==='en'?'en':'zh-TW';
  const respond=(data:unknown,status=200)=>json(req,env,data,{status,headers:{'Cache-Control':'private, no-store'}});
  try {
    if(url.pathname==='/api/maya/annual/config' && req.method==='GET') return respond({enabled:env.MAYA_ANNUAL_ENABLED==='true'&&mayaFeatures(env).member,payment:mayaAnnualPaymentEnabled(env),adminFree:await mayaAdminLive(req,env,await readSession(req,env,true))});
    const user=await readSession(req,env,true);if(!user)throw new AnnualError('LOGIN_REQUIRED',401);
    if(env.MAYA_ANNUAL_ENABLED!=='true'||!mayaFeatures(env,user.id).member)throw new AnnualError('FEATURE_DISABLED',503);
    if(req.method!=='GET'&&!isAllowedOrigin(req,env))throw new AnnualError('BAD_ORIGIN',403);
    if(url.pathname==='/api/maya/annual/admin-report' && req.method==='POST') {
      if(!await mayaAdminLive(req,env,user))throw new AnnualError('PAYMENT_REQUIRED',403);
      const body=await readBody<Record<string,unknown>>(req,1024);
      if(!body || Object.keys(body).some(k=>!['birth_date','start_year'].includes(k)) || typeof body.birth_date!=='string'
        || typeof body.start_year!=='number' || !Number.isInteger(body.start_year))throw new AnnualError('INVALID_INPUT',400);
      let snapshot:AnnualSnapshot;
      try {snapshot=annualSnapshot(body.birth_date,body.start_year);}catch(e){throw new AnnualError(e instanceof Error?e.message:'INVALID_DATE',422);}
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([user.id,snapshot.birthDate,snapshot.start]))))).map(b=>b.toString(16).padStart(2,'0')).join('');
      const id=`annual-admin-${hash}`;
      // Zero-price administrative grant, never a fabricated paid transaction.
      const existing=await env.DB.prepare("SELECT order_id FROM maya_annual_payment_orders WHERE user_id=? AND birth_date=? AND period_start=? AND payment_state IN ('pending','paid') AND order_id<>?").bind(user.id,snapshot.birthDate,snapshot.start,id).first<{order_id:string}>();
      if(existing)throw new AnnualError('EXISTING_ORDER',409);
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status) VALUES (?,?,?,?,'maya_admin',?,'Admin complimentary annual report',0,'complimentary')").bind(id,`A${hash.slice(0,19)}`,user.id,user.email,MAYA_ANNUAL_PRODUCT.code),
        env.DB.prepare("INSERT OR IGNORE INTO maya_annual_payment_orders(order_id,user_id,product_code,merchant_id,locale,checkout_key,birth_date,period_start,period_end,snapshot_json) VALUES (?,?,?,'admin-complimentary',?,?,?,?,?,?)").bind(id,user.id,MAYA_ANNUAL_PRODUCT.code,locale,id,snapshot.birthDate,snapshot.start,snapshot.end,JSON.stringify(snapshot)),
      ]);
      return respond({order_id:id});
    }
    if(url.pathname==='/api/maya/annual/orders' && req.method==='GET') {
      const rows=await env.DB.prepare("SELECT p.order_id,p.snapshot_json,CASE WHEN o.item_type='maya_admin' THEN o.status ELSE p.payment_state END payment_state FROM maya_annual_payment_orders p JOIN orders o ON o.id=p.order_id WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 100").bind(user.id).all<{order_id:string;snapshot_json:string;payment_state:string}>();
      return respond({orders:rows.results.map(r=>({orderId:r.order_id,snapshot:JSON.parse(r.snapshot_json),status:r.payment_state}))});
    }
    const match=url.pathname.match(/^\/api\/maya\/annual\/reports\/([A-Za-z0-9_-]{1,80})$/);
    if(!match||!['GET','POST'].includes(req.method))throw new AnnualError('NOT_FOUND',404);
    const order=match[1]; const authorize=async()=>{
      if(order.startsWith('annual-admin-')) {
        const current=await readSession(req,env,true);
        if(!current || current.id!==user.id || !await mayaAdminLive(req,env,current))throw new AnnualError('PAYMENT_REQUIRED',403);
        const row=await env.DB.prepare(`SELECT p.snapshot_json FROM maya_annual_payment_orders p JOIN orders o ON o.id=p.order_id AND o.user_id=p.user_id
          WHERE p.order_id=? AND p.user_id=? AND p.product_code=? AND o.item_id=p.product_code
          AND o.item_type='maya_admin' AND o.amount=0 AND o.status='complimentary'
          AND p.merchant_id='admin-complimentary' AND p.payment_state='pending'`).bind(order,user.id,MAYA_ANNUAL_PRODUCT.code).first<Access>();
        if(!row)throw new AnnualError('PAYMENT_REQUIRED',403);
        return JSON.parse(row.snapshot_json) as AnnualSnapshot;
      }
      return annualAccess(env,user.id,order);
    };
    const snapshot=await authorize();
    const read=()=>env.DB.prepare('SELECT * FROM maya_annual_reports WHERE order_id=? AND user_id=? AND locale=?').bind(order,user.id,locale).first<Row>();
    let row=await read();
    // An expired request has an uncertain provider outcome; never silently bill again.
    if(row?.status==='processing'&&row.lease_until&&row.lease_until<new Date().toISOString().replace('T',' ').slice(0,19)) {
      const stored = await env.DB.prepare("SELECT body FROM maya_annual_ai_attempts WHERE report_id=? AND section_index=? AND state='completed'")
        .bind(row.id,(JSON.parse(row.sections_json) as unknown[]).length).first<{body:string|null}>();
      await env.DB.prepare("UPDATE maya_annual_reports SET status=?,error=? WHERE id=? AND status='processing' AND lease_until<datetime('now')")
        .bind(stored?.body?'pending':'blocked',stored?.body?null:'AI_OUTCOME_UNKNOWN',row.id).run();row=await read();
    }
    if(req.method==='GET'||row?.status==='completed'||row?.status==='processing'||row?.status==='blocked')return respond(view(row,snapshot,order,locale));
    const body=await readBody<Record<string,unknown>>(req,1024);
    if(!body||Object.keys(body).length)throw new AnnualError('INVALID_INPUT',400);
    mayaAiMode(env);
    await env.DB.prepare("INSERT OR IGNORE INTO maya_annual_reports(id,order_id,user_id,locale) VALUES (?,?,?,?)").bind(crypto.randomUUID(),order,user.id,locale).run();
    row=await read();if(!row)throw new AnnualError('PERSISTENCE_FAILED');
    const claim=await env.DB.prepare(`UPDATE maya_annual_reports SET status='processing',error=NULL,lease_until=datetime('now','+2 minutes'),updated_at=datetime('now')
      WHERE id=? AND status IN ('pending','failed') AND NOT EXISTS(SELECT 1 FROM maya_annual_reports WHERE user_id=? AND status='processing' AND lease_until>datetime('now')) RETURNING id`).bind(row.id,user.id).first();
    if(!claim)return respond(view(await read(),snapshot,order,locale));
    try {
      const sections=await generateSection(env,snapshot,locale,row,order,authorize);
      await authorize();
      await env.DB.prepare("UPDATE maya_annual_reports SET sections_json=?,report_json=?,status=?,lease_until=NULL,updated_at=datetime('now') WHERE id=? AND status='processing'")
        .bind(JSON.stringify(sections),sections.length===10?JSON.stringify(sections):null,sections.length===10?'completed':'pending',row.id).run();
    }catch(error){
      const code=error instanceof AnnualError?error.code:error instanceof Error&&error.message.startsWith('AI_')?error.message:'GENERATION_FAILED';
      const uncertain=code==='AI_OUTCOME_UNKNOWN'||code==='AI_COST_LIMIT';
      await env.DB.prepare("UPDATE maya_annual_reports SET status=?,error=?,lease_until=NULL,updated_at=datetime('now') WHERE id=?").bind(uncertain?'blocked':'failed',code,row.id).run();
    }
    await authorize();return respond(view(await read(),snapshot,order,locale));
  }catch(error){const code=error instanceof AnnualError?error.code:'INTERNAL_ERROR';return respond({code,error:annualError(code,locale==='en')},error instanceof AnnualError?error.status:500);}
}
