import { useEffect,useRef,useState } from 'react';
import { Link,useLocation,useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authUrlFor } from '../lib/authLocale';
import { vedicAnnualApi } from '../lib/api';
import VedicAnnualReportPanel from '../components/VedicAnnualReportPanel';
import { VEDIC_ANNUAL_CHAPTERS,annualPlanet,annualVedicMessage,type VedicAnnualConfig,type VedicAnnualPreview } from '../lib/vedicAnnual';

const panel='rounded-3xl border border-amber-300/25 bg-slate-950/80 p-5 sm:p-8';
const button='inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50';
export default function VedicAnnualPage(){
  const {user,loading}=useAuth(),location=useLocation(),[params,setParams]=useSearchParams();
  const en=location.pathname.startsWith('/en/'),language=en?'en':'zh-Hant',prefix=en?'/en':'';
  const t=(zh:string,eng:string)=>en?eng:zh;
  const [config,setConfig]=useState<VedicAnnualConfig|null>(null);
  const [charts,setCharts]=useState<Awaited<ReturnType<typeof vedicAnnualApi.charts>>['charts']>([]);
  const [saved,setSaved]=useState<VedicAnnualPreview[]>([]);
  const [selected,setSelected]=useState(params.get('chart_id')??'');
  const [year,setYear]=useState(new Intl.DateTimeFormat('en',{timeZone:'Asia/Taipei',year:'numeric'}).format(new Date()));
  const [result,setResult]=useState<{owner:string;value:VedicAnnualPreview}|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
  const owner=useRef(user?.id);owner.current=user?.id;
  const lock=useRef(false),caseId=params.get('case_id');
  const shown=result && result.owner===user?.id?result.value:null;
  const source=charts.find(c=>c.id===selected);
  const message=(e:unknown)=>annualVedicMessage((e as {body?:{code?:string}})?.body?.code??'INTERNAL_ERROR',en);
  useEffect(()=>{let alive=true;setConfig(null);void vedicAnnualApi.config().then(v=>{if(alive)setConfig(v);}).catch(()=>{if(alive)setError(annualVedicMessage('INTERNAL_ERROR',en));});return()=>{alive=false;};},[en,user?.id]);
  useEffect(()=>{
    document.title=t('印度占星流年運勢｜晶域心語','Vedic Annual Outlook | CrystalField101');
    const existing=document.querySelector('meta[name="robots"]'),previous=existing?.getAttribute('content');
    const tag=existing??document.createElement('meta');tag.setAttribute('name','robots');tag.setAttribute('content','noindex, nofollow');if(!existing)document.head.appendChild(tag);
    return()=>{if(!existing)tag.remove();else if(previous)tag.setAttribute('content',previous);};
  },[en]);
  useEffect(()=>{
    setCharts([]);setSaved([]);setResult(null);setError('');if(!user)return;
    const controller=new AbortController(),uid=user.id;
    async function load(){try{
      let list=await vedicAnnualApi.charts(controller.signal);
      const requested=params.get('chart_id');
      if(requested&&!list.charts.some(c=>c.id===requested)) {
        // Reuse the existing chart token without exposing it in URLs or sending birth data again.
        let candidate:{chart?:{chart_id?:string;chart_token?:string};userId?:string}|null=null;
        for(const key of ['cf_vedic_chart_session','cf_vedic_chart_session_guest']) {
          try {const value=JSON.parse(sessionStorage.getItem(key)??'null');if(value?.chart?.chart_id===requested&&(!value.userId||value.userId===uid))candidate=value;}catch{/* Ignore invalid browser storage. */}
        }
        if(candidate?.chart?.chart_token&&!controller.signal.aborted) {
          await vedicAnnualApi.claim(requested,candidate.chart.chart_token);
          list=await vedicAnnualApi.charts(controller.signal);
        }
      }
      if(controller.signal.aborted||owner.current!==uid)return;
      setCharts(list.charts);setSelected(value=>list.charts.some(c=>c.id===value)?value:list.charts[0]?.id??'');
      const history=await vedicAnnualApi.previews(language,controller.signal);
      if(!controller.signal.aborted)setSaved(history.previews);
      if(caseId){const value=await vedicAnnualApi.preview(caseId,language,controller.signal);if(!controller.signal.aborted)setResult({owner:uid,value});}
    }catch(e){if(!controller.signal.aborted)setError(message(e));}}
    void load();return()=>controller.abort();
  },[user?.id,language,caseId,reload,params.get('chart_id')]);
  async function prepare(){
    if(!user||lock.current)return;const uid=user.id;lock.current=true;setBusy(true);setError('');setResult(null);
    try{const value=await vedicAnnualApi.prepare(selected,Number(year),language);if(owner.current===uid){setResult({owner:uid,value});setParams({case_id:value.id});}}
    catch(e){if(owner.current===uid)setError(message(e));}
    finally{lock.current=false;setBusy(false);}
  }
  return <main className="mx-auto max-w-5xl space-y-7 px-4 py-10 text-base leading-7 text-violet-50">
    <nav><Link className="text-amber-200 underline" to={`${prefix}/vedic-astrology`}>{t('返回印度占星','Back to Vedic astrology')}</Link></nav>
    <header><h1 className="font-serif text-3xl text-amber-50 sm:text-4xl">{t('印度占星流年運勢','Vedic Annual Outlook')}</h1>
      <p className="mt-4 max-w-3xl">{t('結合你的出生星盤、行星大運與年度行運，探索今年的生活主題、機會與需要調整的方向。','Explore annual themes, opportunities and adjustments through your birth chart, Dasha periods and annual transits.')}</p>
      <p className="mt-4 rounded-xl border border-amber-200/30 p-4 text-amber-100">{config?.generationEnabled?t('流年運勢 NT$599：選取出生盤與年份後，即可解鎖十章個人化報告。管理員免費生成。','Annual outlook NT$599: select a saved chart and year to unlock ten personalized chapters. Administrators generate for free.'):t('正在確認報告服務狀態；可先選擇出生盤與年份。','Checking report availability. You can select a chart and year first.')}</p>
    </header>
    <section className={panel}><h2 className="text-2xl">{t('選擇出生資料與曆年','Select a saved chart and calendar year')}</h2>
      {!user?<Link className={`${button} mt-5`} to={authUrlFor(location.pathname,'login',location.pathname+location.search)}>{loading?t('確認登入中…','Checking sign-in…'):t('登入選取出生資料','Sign in to select a chart')}</Link>:<form className="mt-5 space-y-5" onSubmit={e=>{e.preventDefault();void prepare();}}>
        <label className="block">{t('已儲存出生盤','Saved birth chart')}<select className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-violet-300/40 bg-slate-900 p-3" value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">{t('選擇出生盤','Select a chart')}</option>{charts.map(c=><option key={c.id} value={c.id}>{c.birth?.date} {c.birth?.time} · {c.birth?.location}</option>)}</select></label>
        {charts.length===0&&<p>{t('尚無可使用的出生盤。請先在原有印度占星頁建立出生盤，無須在這裡重填資料。','No saved chart is available. Create a chart on the existing Vedic astrology page first; you will not need to enter it again here.')}</p>}
        <label className="block">{t('指定年份','Year')}<input className="mt-2 block min-h-12 w-full rounded-xl border border-violet-300/40 bg-slate-900 p-3" type="number" min="1900" max="2100" required value={year} onChange={e=>setYear(e.target.value)} /></label>
        <p>{/^\d{4}$/.test(year)?`${year}-01-01 — ${year}-12-31`:t('請輸入四位數年份','Enter a four-digit year')} · {source?.birth?.timezone??t('選擇出生盤後顯示時區','Timezone shown after selecting a chart')}</p>
        <p className="text-violet-100">{t('採出生地時區的曆年，不是生日到下一次生日。出生時間或地點缺漏時，不會補成中午，也不會推測上升、宮位與精確大運日期。','This is a calendar year in the birth location timezone, not a birthday year. Missing birth time or location will not be filled with noon or used to invent ascendant, houses or precise Dasha dates.')}</p>
        <button className={button} disabled={busy||!selected}>{busy?t('整理並儲存年度資料…','Preparing and saving annual data…'):t('查看並保存年度資料','Review and save annual data')}</button>
      </form>}
    </section>
    {busy&&<p role="status">{t('讀取出生資料 → 整理已存大運期間 → 儲存年度資料。尚未進行行運或 AI 生成。','Reading your chart → organizing saved Dasha periods → saving annual data. Transits and AI generation have not started.')}</p>}
    {error&&<div role="alert" className="rounded-xl border border-rose-300 p-4"><p>{error}</p><button className={`${button} mt-3`} onClick={()=>setReload(n=>n+1)}>{t('重新讀取','Reload')}</button></div>}
    {shown&&<section className={panel} aria-live="polite"><h2 className="text-2xl">{shown.facts.year} · {t('年度計算依據','Annual calculation facts')}</h2>
      <p className="mt-3">{shown.facts.startDate} — {shown.facts.endDate} · {shown.facts.timezone}</p>
      <p>{t('出生資料','Birth data')}：{shown.facts.birth.date} {shown.facts.birth.time} · {shown.facts.birth.location}</p>
      <p className="mt-3">Prokerala · {t('恆星黃道','Sidereal zodiac')} · Lahiri</p>
      <h3 className="mt-6 text-xl text-amber-100">{t('大運／小運時間軸（計算資料，非吉凶預測）','Dasha timeline (calculation facts, not predictions)')}</h3>
      <p className="mt-2 text-violet-100">{t('時間皆依上方時區顯示；區間終點不包含在前一段內。只列出與該年重疊的 provider 原始期間。','Times use the timezone above. Endpoints are exclusive. Only provider periods overlapping this year are included.')}</p>
      <ol className="mt-5 space-y-4">{shown.facts.dasha.map(p=><li key={p.id} className="min-w-0 rounded-xl border-l-4 border-amber-300 bg-violet-950/30 p-4">
        <strong>{p.kind==='mahadasha'?t('大運','Mahadasha'):t('小運','Antardasha')} · {p.parent?`${annualPlanet(p.parent,en)} / `:''}{annualPlanet(p.lord,en)}</strong>
        <p className="mt-1 break-words">{formatDate(p.start,shown.facts.timezone,en)} → {formatDate(p.endExclusive,shown.facts.timezone,en)}</p>
        {(p.startsWithinYear||p.endsWithinYear)&&<p className="text-amber-100">{t('含年內階段切換','Includes a transition within the year')}</p>}
      </li>)}</ol>
      {!shown.facts.dasha.length&&<p className="mt-4">{annualVedicMessage('DASHA_COVERAGE',en)}</p>}
      <h3 className="mt-6 text-xl">{t('資料限制','Data limitations')}</h3><ul className="mt-3 list-disc space-y-2 pl-5">{shown.facts.limitations.filter(code=>code!=='TRANSITS_UNAVAILABLE').map(code=><li key={code}>{annualVedicMessage(code,en)}</li>)}</ul>
      <p>{t('全年行運收集狀態顯示於下方區塊。','Annual transit collection status is shown below.')}</p>
      <p className="mt-4 text-violet-100">{t('年度資料已保存；請於下方查看解鎖與報告狀態。','Annual facts are saved. View access and report status below.')}</p>
    </section>}
    {shown&&user&&<VedicAnnualReportPanel key={`${user.id}:${shown.id}:${language}`} preview={shown} language={language} config={config}/>}
    <section className={panel}><h2 className="text-2xl">{t('完整報告涵蓋範圍','Planned full report coverage')}</h2><ol className="mt-5 grid list-decimal gap-3 pl-6 sm:grid-cols-2">{VEDIC_ANNUAL_CHAPTERS.map(c=><li key={c[1]}>{c[en?1:0]}</li>)}</ol>
      <p className="mt-5 text-xl text-amber-100">{config?.adminFree?t('管理員免費，不需付款或解鎖','Administrator access is free; no payment or unlock required'):config?.price?`NT$${config.price}`:t('價格載入中','Loading price')}</p>
      <p className="mt-4">{t('每份方案對應固定出生資料與一個指定年份，中英文共用購買權限。請先選擇並保存年度資料，即可查看解鎖／生成入口。','Each purchase covers a fixed birth profile and one calendar year, with shared Chinese/English access. Select and save annual facts above to view unlock and generation options.')}</p>
      <p className="mt-3">{t('行運資料核實後，完整報告將依序顯示：讀取出生資料 → 計算大運與行運 → 整理年度主題 → 生成解讀 → 儲存報告。','Once transit data is verified, report stages will be: read birth data → calculate Dasha and transits → organize themes → generate interpretation → save report.')}</p>
    </section>
    {!!user&&saved.length>0&&<section id="saved-annual-reports" className={`${panel} scroll-mt-20`}><h2 className="text-2xl">{t('已保存的年度資料','Saved annual data')}</h2><ul className="mt-4 space-y-3">{saved.map(s=><li key={s.id}><Link className="break-words text-amber-200 underline" to={`${location.pathname}?case_id=${encodeURIComponent(s.id)}`}>{s.facts.birth.date} · {s.facts.year} · {t('查看資料與時間軸','View facts and timeline')}</Link></li>)}</ul></section>}
  </main>;
}
function formatDate(value:string,timezone:string,en:boolean){return new Intl.DateTimeFormat(en?'en-GB':'zh-TW',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}
