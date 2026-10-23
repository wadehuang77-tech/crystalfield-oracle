import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mayaAnnualApi, mayaApi } from '../lib/api';
import { authUrlFor } from '../lib/authLocale';
import { ANNUAL_CASTLES, ANNUAL_CHAPTERS, annualError, annualSnapshot, type AnnualSnapshot, type AnnualState } from '../lib/mayaAnnual';
import { mayaSignature, taipeiDate, type MayaLocale } from '../lib/maya';
import { submitMayaCheckout } from '../lib/mayaCheckout';
import SolarSealIcon from '../components/maya/SolarSealIcon';
import GalacticToneSymbol from '../components/maya/GalacticToneSymbol';

const panel='rounded-2xl border border-cyan-400/25 bg-slate-900 p-5 sm:p-8';
const button='inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 disabled:opacity-50';
export default function MayaAnnualPage(){
  const {user,loading}=useAuth();const location=useLocation();const [params,setParams]=useSearchParams();
  const en=location.pathname.startsWith('/en/');const locale:MayaLocale=en?'en':'zh-TW';
  const t=(zh:string,english:string)=>en?english:zh;
  const [birth,setBirth]=useState('');const [year,setYear]=useState<number|undefined>();
  const [config,setConfig]=useState<{enabled:boolean;payment:boolean;adminFree?:boolean}|null>(null);
  const [orders,setOrders]=useState<Awaited<ReturnType<typeof mayaAnnualApi.orders>>['orders']>([]);
  const [state,setState]=useState<{identity:string;value:AnnualState}|null>(null);
  const [error,setError]=useState('');const [paymentStatus,setPaymentStatus]=useState('');
  const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);const checkoutBusy=useRef(false);
  const order=params.get('maya_order');const identity=`${user?.id}:${order}:${locale}`;
  let preview:AnnualSnapshot|null=null;let inputError='';
  if(birth)try{preview=annualSnapshot(birth,year);}catch(e){inputError=annualError(e instanceof Error?e.message:'INVALID_DATE',en);}
  const report=state?.identity===identity?state.value:null;
  useEffect(()=>{let alive=true;void mayaAnnualApi.config().then(v=>{if(alive)setConfig(v);}).catch(()=>{if(alive)setError(annualError('FEATURE_DISABLED',en));});return()=>{alive=false;};},[en,user?.id]);
  useEffect(()=>{
    document.title=t('馬雅流年運勢｜晶域心語','Dreamspell Birthday Year | Crystalfield');
    const existing=document.querySelector('meta[name="robots"]');const previous=existing?.getAttribute('content');
    const tag=existing??document.createElement('meta');tag.setAttribute('name','robots');tag.setAttribute('content','noindex, follow');if(!existing)document.head.appendChild(tag);
    return()=>{if(!existing)tag.remove();else if(previous)tag.setAttribute('content',previous);};
  },[en]);
  useEffect(()=>{
    setOrders([]);if(!user||!config?.enabled)return;
    const controller=new AbortController();void mayaAnnualApi.orders(locale,controller.signal).then(v=>{if(!controller.signal.aborted)setOrders(v.orders);}).catch(()=>{});
    return()=>controller.abort();
  },[user?.id,locale,config?.enabled,order]);
  useEffect(()=>{
    setError('');setPaymentStatus('');if(!user||!order||!config?.enabled)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let polls=0;let retryAllowed=retry>0;
    const publish=(v:AnnualState)=>{if(!controller.signal.aborted)setState({identity,value:v});};
    const schedule=()=>{if(!controller.signal.aborted)timer=setTimeout(()=>void tick(),1800);};
    async function tick(){
      try{
        const payment=order!.startsWith('annual-admin-') ? {status:'complimentary'} : await mayaApi.checkoutStatus(order!,locale,controller.signal);
        if(controller.signal.aborted)return;
        setPaymentStatus(payment.status);
        if(payment.status==='pending'){if(++polls<30)schedule();else setError(t('付款仍待後端確認，請稍後重新整理，勿重複付款。','Payment is still pending. Refresh later; do not pay again.'));return;}
        if(payment.status!=='paid'&&payment.status!=='complimentary'){setError(annualError('PAYMENT_REQUIRED',en));return;}
        let v=await mayaAnnualApi.report(order!,locale,controller.signal);publish(v);
        if(v.status==='blocked'||v.status==='completed'||v.status==='failed'&&!retryAllowed)return;
        if(v.status==='pending'||v.status==='failed') {retryAllowed=false;v=await mayaAnnualApi.step(order!,locale,controller.signal);publish(v);}
        if(v.status==='pending'||v.status==='processing')schedule();
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:annualError('GENERATION_FAILED',en));}
    }
    void tick();return()=>{controller.abort();clearTimeout(timer);};
  },[identity,config?.enabled,retry]);
  async function buy(){
    if(!preview||!user||checkoutBusy.current)return;checkoutBusy.current=true;setBusy(true);setError('');
    const key=`maya-annual-checkout:${user.id}:${preview.birthDate}:${preview.start}`;
    try{
      if(config?.adminFree){const result=await mayaAnnualApi.adminReport(preview.birthDate,preview.startYear,locale);setParams({maya_order:result.order_id});return;}
      let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}
      const result=await mayaAnnualApi.checkout(preview.birthDate,preview.startYear,locale,id);
      if('already_paid' in result)setParams({maya_order:result.order_id});else submitMayaCheckout(result,'production');
    }catch(e){setError(e instanceof Error?e.message:annualError('CHECKOUT_FAILED',en));sessionStorage.removeItem(key);}
    finally{checkoutBusy.current=false;setBusy(false);}
  }
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-base leading-7 text-slate-100">
    <nav><Link className="text-cyan-200 underline" to={`${en?'/en':''}/maya-calendar/member`}>{t('返回馬雅曆會員頁','Back to Maya membership')}</Link></nav>
    <header><h1 className="text-3xl font-bold sm:text-4xl">{t('馬雅流年運勢','Dreamspell Birthday Year')}</h1><p className="mt-4 text-lg">{t('從生日開始，探索你的年度流年印記、行動方向與人生週期。','Starting on your birthday, explore your annual signature, practical direction and life cycle.')}</p><p className="mt-4 font-semibold text-cyan-200">{t('NT$599／一位對象／一段生日流年','NT$599 / one person / one birthday year')}</p></header>
    <section className={panel}><h2 className="text-2xl font-semibold">{t('購買前確認流年期間','Preview your birthday-year period')}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>{t('出生日期','Birth date')}<input className="mt-2 block min-h-12 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 [color-scheme:dark]" type="date" min="1900-01-01" max={taipeiDate()} value={birth} onChange={e=>{setBirth(e.target.value);setYear(undefined);}} /></label>
        <label>{t('生日流年起始年份（預設目前所在流年）','Birthday-year start year (defaults to your current period)')}<input className="mt-2 block min-h-12 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3" type="number" min={birth?Number(birth.slice(0,4)):1900} max={Number(taipeiDate().slice(0,4))+1} value={year??preview?.startYear??''} onChange={e=>setYear(e.target.value?Number(e.target.value):undefined)} /></label>
      </div>
      {inputError&&<p role="alert" className="mt-4 text-amber-200">{inputError}</p>}
      {preview&&<p className="mt-5 rounded-xl bg-slate-950 p-4 font-semibold">{preview.start} — {preview.end} · {t('付款後此生日與期間固定','Birth date and period are fixed upon purchase')}</p>}
      <p className="mt-4 text-slate-300">{t('2 月 29 日出生者的平年生日規則尚待確認，暫不開放購買。下一段流年需另購；已購報告可持續查看，中英文共用權限。','Purchasing for February 29 births is unavailable pending a non-leap-year birthday rule. Each new birthday year is a separate purchase. Saved reports remain available, with shared access in English and Chinese.')}</p>
      {!user&&!loading?<Link className={`${button} mt-5`} to={authUrlFor(location.pathname,'login',location.pathname+location.search)}>{t('登入後探索我的流年運勢','Sign in to explore my birthday year')}</Link>:<button className={`${button} mt-5`} disabled={!preview||(!config?.payment&&!config?.adminFree)||busy||loading} onClick={()=>void buy()}>{busy?t('正在建立訂單…','Creating your order…'):config?.adminFree?t('管理員免費產生流年報告','Generate complimentary admin report'):t('探索我的流年運勢','Explore my birthday year')}</button>}
      {config&&!config.payment&&!config.adminFree&&<p className="mt-3 text-amber-200">{t('此方案尚未開放付款。','Purchasing is not enabled yet.')}</p>}
    </section>
    <section className={panel}><h2 className="text-2xl font-semibold">{t('報告包含哪些內容','What your report includes')}</h2><ol className="mt-4 grid list-decimal gap-3 pl-6 sm:grid-cols-2">{ANNUAL_CHAPTERS.map(c=><li key={c[0]}>{c[en?1:0]}</li>)}</ol><p className="mt-5 text-slate-300">{t('含生日流年印記、年度主題、52 年循環定位與年度 KIN 所在城堡的延伸解讀。Dreamspell 自我探索不代表必然命運。','Includes your birthday-year signature, annual themes, 52-year cycle position and reflections on the annual KIN castle. Dreamspell is a symbolic self-exploration system, not a prediction of destiny.')}</p></section>
    {error&&<p role="alert" className="rounded-xl border border-amber-300 p-4 text-amber-200">{error}</p>}
    {user&&order&&error&&<button className={button} onClick={()=>setRetry(n=>n+1)}>{t('重新確認與續讀，不需再次付款','Check again and resume without paying again')}</button>}
    {order&&paymentStatus==='pending'&&<p role="status">{t('付款確認中，請勿重複付款。','Confirming payment. Please do not pay again.')}</p>}
    {report&&<section className={panel} aria-live="polite">
      <h2 className="text-2xl font-semibold">{t('你的生日流年報告','Your birthday-year report')}</h2>
      <AnnualFacts snapshot={report.snapshot} locale={locale}/>
      <div className="mt-6" role="progressbar" aria-label={t('報告儲存進度','Report storage progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={report.percent}><div className="h-4 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-cyan-300 transition-[width]" style={{width:`${report.percent}%`}} /></div></div>
      <p className="mt-3">{report.percent}% · {t(`已儲存 ${report.completed}/10 章；依已完成章節計算，非剩餘時間預測。`,`Saved ${report.completed}/10 chapters; based on persisted chapters, not a time estimate.`)}</p>
      {report.status==='processing'&&<p>{t('正在生成下一章…','Generating the next chapter…')}</p>}
      {report.error&&<p role="alert" className="mt-4 text-amber-200">{annualError(report.error,en)}</p>}
      {report.status==='failed'&&<button className={`${button} mt-4`} onClick={()=>setRetry(n=>n+1)}>{t('重試，不需再次付款','Retry without paying again')}</button>}
      {report.sections?.map((s,i)=><article className="mt-8 border-t border-slate-600 pt-6" key={i}><h3 className="text-xl font-semibold text-cyan-200">{s.heading}</h3><p className="mt-4 max-w-prose whitespace-pre-line leading-8">{s.body}</p></article>)}
    </section>}
    {user&&!!orders.length&&<section className={panel}><h2 className="text-2xl font-semibold">{t('我的流年訂單與報告','My birthday-year orders and reports')}</h2><ul className="mt-4 space-y-3">{orders.map(o=><li key={o.orderId}><Link className="break-words text-cyan-200 underline" to={`${location.pathname}?maya_order=${encodeURIComponent(o.orderId)}`}>{o.snapshot.birthDate} · {o.snapshot.start} — {o.snapshot.end} · {({complimentary:t('管理員免費','Admin complimentary'),paid:t('已付款','Paid'),pending:t('待付款','Pending'),failed:t('付款未完成','Payment failed'),refunded:t('已退款','Refunded'),revoked:t('已撤權','Revoked')} as Record<string,string>)[o.status]??o.status}</Link></li>)}</ul></section>}
  </main>;
}
function AnnualFacts({snapshot:s,locale}:{snapshot:AnnualSnapshot;locale:MayaLocale}){
  const en=locale==='en';const signature=mayaSignature(s.kin,locale);
  return <div className="mt-5 space-y-3 rounded-xl bg-slate-950 p-4">
    <p>{s.birthDate} · {s.start} — {s.end} (Asia/Taipei)</p>
    <div className="flex flex-wrap items-center gap-4"><SolarSealIcon sealNumber={s.seal} locale={locale}/><GalacticToneSymbol toneNumber={s.tone} locale={locale}/></div>
    <p className="text-lg font-semibold">KIN {s.kin} · {signature.galactic_tone} {en?'tone':'調性'} {s.tone} · {signature.solar_seal}</p>
    <p>{en?`Age ${s.age} at period start · Cycle ${s.cycleNumber}, position ${s.cyclePosition}/52`:`起始生日滿 ${s.age} 歲 · 第 ${s.cycleNumber} 輪，第 ${s.cyclePosition}/52 個位置`}</p>
    <svg className="h-6 w-full" viewBox="0 0 520 20" role="img" aria-label={en?`Cycle position ${s.cyclePosition} of 52`:`52 年循環位置 ${s.cyclePosition}`}><rect width="520" height="20" rx="10" fill="#334155"/><rect width={s.cyclePosition*10} height="20" rx="10" fill="#67e8f9"/></svg>
    <p className="border-l-4 pl-3" style={{borderColor:['#fca5a5','#e2e8f0','#93c5fd','#fde68a','#6ee7b7'][s.castle-1]}}>{ANNUAL_CASTLES[s.castle-1][en?1:0]} · KIN {(s.castle-1)*52+1}–{s.castle*52}</p>
    <p className="text-slate-300">{en?'Cycle position = age modulo 52 + 1: birth is position 1, age 51 is position 52, age 52 begins the next cycle. The castle is determined by the annual birthday KIN, not by age. With the existing non-leap-day birthday rules, 52 × 365 is divisible by 260.':'循環位置＝生日年齡除以 52 的餘數＋1：出生為位置 1，51 歲為位置 52，52 歲進入下一輪。年度城堡依生日 KIN 區間計算，不按年齡分配。依現有非閏日生日規則，52 × 365 可被 260 整除。'}</p>
  </div>;
}
