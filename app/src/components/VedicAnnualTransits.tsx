import { useEffect,useRef,useState } from 'react';
import { vedicAnnualApi } from '../lib/api';
import { annualPlanet,annualVedicMessage,type AnnualTransitState } from '../lib/vedicAnnual';

export default function VedicAnnualTransits({caseId,language,enabled}:{caseId:string;language:'en'|'zh-Hant';enabled:boolean}) {
  const en=language==='en',t=(zh:string,eng:string)=>en?eng:zh;
  const [state,setState]=useState<AnnualTransitState|null>(null),[error,setError]=useState(''),[running,setRunning]=useState(false);
  const active=useRef(false),mounted=useRef(false);
  useEffect(()=>{mounted.current=true;const controller=new AbortController();
    void vedicAnnualApi.transits(caseId,language,controller.signal).then(setState).catch(e=>{if(!controller.signal.aborted)setError(annualVedicMessage(e?.body?.code??'INTERNAL_ERROR',en));});
    return()=>{mounted.current=false;active.current=false;controller.abort();};
  },[caseId,language,en]);
  async function collect(){
    if(active.current)return;active.current=true;setRunning(true);setError('');
    try {while(active.current){
      const next=await vedicAnnualApi.collectTransits(caseId,language);
      if(!mounted.current)break;setState(next);
      if(next.status==='completed'||next.status==='failed')break;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }}catch(e){if(mounted.current)setError(annualVedicMessage((e as {body?:{code?:string}})?.body?.code??'INTERNAL_ERROR',en));}
    finally{active.current=false;if(mounted.current)setRunning(false);}
  }
  const dates=(value:string)=>new Intl.DateTimeFormat(en?'en-GB':'zh-TW',{timeZone:state?.data?.timezone??'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
  const signNames:Record<string,string>={Aries:'牡羊座',Taurus:'金牛座',Gemini:'雙子座',Cancer:'巨蟹座',Leo:'獅子座',Virgo:'處女座',Libra:'天秤座',Scorpio:'天蠍座',Sagittarius:'射手座',Capricorn:'摩羯座',Aquarius:'水瓶座',Pisces:'雙魚座',retrograde:'逆行',direct:'順行'};
  const label=(value:string)=>en?value:signNames[value]??value;
  return <section className="min-w-0 space-y-4 rounded-3xl border border-amber-300/25 bg-slate-950/80 p-5 sm:p-8">
    <h2 className="text-2xl">{t('全年行運計算資料','Annual transit calculation data')}</h2>
    <p>{t('收集木星、土星、Rahu／Ketu 的全年星位。每 8 日取樣並細分觀察到的換座與順逆行變化；每份年度資料最多 64 次請求（含失敗）。','Collect annual Jupiter, Saturn, Rahu and Ketu positions. Samples are taken every eight days, refining observed sign and motion changes. Each case is capped at 64 requests, including failures.')}</p>
    <p>{t('這是分段取樣，不是完整精確事件表；可能漏掉取樣間的短暫往返。轉換只標示觀測區間，不等於吉凶或事件必然發生。','This is sampled evidence, not an exhaustive exact event calendar. Brief changes between samples may be missed. Transitions are bounded observation intervals, not predictions.')}</p>
    {state&&<div role="status" className="space-y-2">
      <p>{t('全年基礎樣本','Annual baseline samples')}：{state.baselineCollected} / {state.baselineTotal} · {t('已儲存樣本','Saved samples')}：{state.samplesCollected}</p>
      <progress className="h-3 w-full accent-amber-300" max={state.baselineTotal} value={state.baselineCollected} aria-label={t('基礎取樣進度，非報告生成進度','Baseline sampling progress, not report generation progress')}/>
      <p>{t('基礎取樣完成後可能繼續細分。這不是 AI 報告進度。','Refinement may continue after baseline sampling. This is not AI report progress.')}</p>
      <p>{t('已使用請求','Requests used')}：{state.callsUsed} / {state.callLimit}</p>
      {state.errorCode&&<p role="alert">{annualVedicMessage(state.errorCode,en)}</p>}
      {state.retryAt&&<p>{t('可重試時間','Retry after')}：{dates(state.retryAt)}</p>}
    </div>}
    {error&&<p role="alert">{error}</p>}
    {state?.status!=='completed'&&<button className="min-h-12 rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50" disabled={!enabled||running||(state?.callsUsed??0)>=64} onClick={()=>void collect()}>
      {running?t('收集並儲存星位中…','Collecting and saving positions…'):enabled?t('收集／繼續全年行運資料','Collect / resume annual transit data'):t('年度行運收集尚未啟用','Annual collection is not enabled')}
    </button>}
    <p>{t('離開頁面會在目前請求完成後暫停；重新進入可繼續，不會重抓已儲存樣本。','Leaving pauses collection after the current request. Return to resume without fetching saved samples again.')}</p>
    {state?.data&&<>
      <p className="text-amber-100">{t('全年樣本已儲存；AI 解讀尚未生成。','Annual samples are saved; AI interpretation has not been generated.')} · {state.data.timezone}</p>
      <h3 className="text-xl">{t('觀測到的轉換區間','Observed transition intervals')}</h3>
      {state.data.events.length===0&&<p>{t('樣本間未觀察到換座或順逆行差異；不代表全年沒有其他變化。','No sign or motion differences were observed between samples. This does not imply the absence of other changes.')}</p>}
      <ul className="space-y-3">{state.data.events.map(event=><li key={event.id} className="break-words rounded-xl border border-amber-200/25 p-4"><strong>{annualPlanet(event.planet,en)} · {label(event.from)} → {label(event.to)}</strong><p>{dates(event.after)} → {dates(event.by)}</p><p>{t('變化在兩次觀測之間，非精確轉換時刻。','The change occurred between observations; this is not an exact transition time.')}</p></li>)}</ul>
      <h3 className="text-xl">{t('星位樣本與本命參照','Position samples and natal references')}</h3>
      <p>{t('下列數字是從本命月亮／上升星座起算的星座序距，不是重新計算的 D1 宮位。沿用 provider 節點預設，未宣稱真交點或平均交點。','Numbers below count signs from the natal Moon / Ascendant sign; they are not recalculated D1 houses. The provider node default is retained without claiming true or mean nodes.')}</p>
      <details><summary className="min-h-12 cursor-pointer text-amber-100">{t('展開已保存的星位樣本','Show saved position samples')}</summary><ul className="space-y-4">{state.data.samples.map(sample=><li key={sample.at} className="break-words rounded-xl bg-violet-950/30 p-4"><p>{dates(sample.at)}</p>{sample.positions.map(p=><p key={p.planet}>{annualPlanet(p.planet,en)} · {label(p.sign)} · {label(p.retrograde?'retrograde':'direct')} · {t('月亮／上升序距','Moon / Ascendant sign distance')} {p.signFromMoon} / {p.signFromAscendant}</p>)}</li>)}</ul></details>
    </>}
  </section>;
}
