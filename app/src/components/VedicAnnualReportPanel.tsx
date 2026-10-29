import { useEffect,useRef,useState } from 'react';
import { vedicAnnualApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { VEDIC_ANNUAL_CHAPTERS,annualPlanet,annualVedicMessage,type AnnualReportState,type VedicAnnualConfig,type VedicAnnualPreview } from '../lib/vedicAnnual';
import VedicAnnualTransits from './VedicAnnualTransits';

const button='min-h-12 rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50';
export default function VedicAnnualReportPanel({preview,language,config}:{preview:VedicAnnualPreview;language:'en'|'zh-Hant';config:VedicAnnualConfig|null}){
 const en=language==='en',t=(zh:string,eng:string)=>en?eng:zh;
 const [state,setState]=useState<AnnualReportState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const alive=useRef(false),lock=useRef(false);
 useEffect(()=>{alive.current=true;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,polls=0;
  async function poll(){try{const value=await vedicAnnualApi.report(preview.id,language,controller.signal);if(controller.signal.aborted)return;setState(value);
    if(['calculating','generating','saving'].includes(value.status)||(value.status==='locked'&&polls++<60&&new URLSearchParams(location.search).has('payment')))timer=setTimeout(()=>void poll(),3000);
   }catch(e){if(!controller.signal.aborted)setError(annualVedicMessage((e as {body?:{code?:string}})?.body?.code??'INTERNAL_ERROR',en));}}
  void poll();return()=>{alive.current=false;controller.abort();clearTimeout(timer);};
 },[preview.id,language,refresh,en]);
 async function act(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
   if(!state?.authorized){const result=await vedicAnnualApi.checkout(preview.id,language);if(!alive.current)return;
    if(result.ecpay){submitToEcpay(result.ecpay);return;}setRefresh(v=>v+1);
   }else{const value=await vedicAnnualApi.generate(preview.id,language);if(alive.current){setState(value);setRefresh(v=>v+1);}}
  }catch(e){if(alive.current)setError(annualVedicMessage((e as {body?:{code?:string}})?.body?.code??'INTERNAL_ERROR',en));}
  finally{lock.current=false;if(alive.current)setBusy(false);}}
 const working=!!state&&['calculating','generating','saving'].includes(state.status),complete=state?.status==='completed'&&!!state.report;
 const stage=state?.status==='calculating'?1:state?.status==='generating'?2:state?.status==='saving'?3:complete?4:0;
 const stages=[t('讀取出生資料','Read birth data'),t('計算大運與全年行運','Prepare Dasha and annual transits'),t('整理年度主題並生成解讀','Organize themes and generate reading'),t('儲存報告','Save report')];
 const dates=(s:string)=>new Intl.DateTimeFormat(en?'en-GB':'zh-TW',{timeZone:preview.facts.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s));
 return <section className="min-w-0 space-y-5 rounded-3xl border border-amber-300/30 bg-slate-950/80 p-5 sm:p-8">
  <h2 className="text-2xl text-amber-100">{t('解鎖我的流年報告','Unlock my annual report')}</h2>
  <p>{preview.facts.startDate} — {preview.facts.endDate} · {preview.facts.timezone}</p>
  <p className="text-xl">{config?.adminFree?t('管理員免費，不需付款或解鎖','Administrator access: free, no payment required'):t('NT$599／一位對象／一個指定年份','NT$599 / one birth profile / one calendar year')}</p>
  <p>{t('中英文共用購買權限。付款由後端確認後，才會開放完整報告；生成失敗可重試，不需再次付款。','Chinese and English share purchase access. Full reports require server-confirmed payment. Failed generation can be retried without another payment.')}</p>
  {error&&<p role="alert" className="text-rose-200">{error}</p>}
  {state?.error&&<p role="alert" className="text-rose-200">{annualVedicMessage(state.error,en)}</p>}
  {!complete&&<button className={button} disabled={!state||busy||working||!(state.authorized?config?.generationEnabled:config?.purchaseEnabled)} onClick={()=>void act()}>
   {busy?t('處理中…','Processing…'):working?t('報告生成中，可稍後返回','Generating; you may return later'):state?.authorized?(state.status==='failed'?t('重試生成（不需再次付款）','Retry generation — no new payment'):t('免費／已解鎖：生成流年報告','Generate my unlocked annual report')):t('解鎖流年運勢 NT$599','Unlock annual outlook NT$599')}
  </button>}
  <button type="button" className="ml-3 min-h-12 px-3 text-amber-200 underline" onClick={()=>setRefresh(v=>v+1)}>{t('重新確認付款與報告狀態','Refresh payment and report status')}</button>
  {working||complete?<div role="status" className="space-y-3"><progress max={4} value={stage} className="h-3 w-full accent-amber-300" aria-label={t('處理階段，非實際百分比','Processing stage, not an actual percentage')}/>
   <p>{complete?t('100%：報告已完成並儲存','100%: report completed and saved'):t('階段式進度，非實際計算百分比。離開後背景工作會繼續。','Stage-based progress, not an actual percentage. Work continues in the background.')}</p>
   <ol className="list-decimal space-y-1 pl-6">{stages.map((label,i)=><li key={label} className={stage===i+1?'font-semibold text-amber-100':''}>{label}</li>)}</ol>
  </div>:null}
  {complete&&state?.report&&<div className="space-y-7">{state.facts?.limitations.map(code=><p key={code} className="text-sm leading-6 text-violet-100">{annualVedicMessage(code,en)}</p>)}
   {state.report.sections.map(section=><article key={section.key} className="min-w-0 border-t border-violet-200/20 pt-6">
    <h3 className="text-xl font-semibold text-amber-100">{section.key+1}. {VEDIC_ANNUAL_CHAPTERS[section.key]?.[en?1:0]}</h3>
    <p className="mt-3 whitespace-pre-line break-words leading-8">{section.body}</p>
    {!!section.actions.length&&<ol className="mt-4 list-decimal space-y-3 pl-6">{section.actions.map(action=><li key={action}>{action}</li>)}</ol>}
    <details className="mt-4 rounded-xl bg-violet-950/30 p-4"><summary className="cursor-pointer text-amber-100">{t('查看此段計算依據','View calculation evidence')}</summary><ul className="mt-3 space-y-2">{section.evidenceIds.map(id=>{
     const d=state.facts?.dasha.find(v=>v.id===id),event=state.facts?.transits?.events.find(v=>v.id===id);
     return <li key={id} className="break-words">{d?`${d.kind==='mahadasha'?t('大運','Mahadasha'):t('小運','Antardasha')} ${d.parent?annualPlanet(d.parent,en)+' / ':''}${annualPlanet(d.lord,en)} · ${dates(d.start)} — ${dates(d.endExclusive)}`:event?`${annualPlanet(event.planet,en)} · ${event.from} → ${event.to} · ${dates(event.after)} — ${dates(event.by)}`:id}</li>;
    })}</ul></details>
   </article>)}
  </div>}
  {state?.authorized&&<details><summary className="cursor-pointer text-amber-100">{t('查看全年行運收集資料','View annual transit collection')}</summary><VedicAnnualTransits key={`${stage}:${refresh}`} caseId={preview.id} language={language} enabled={!!config?.transitEnabled&&!working}/></details>}
 </section>;
}
