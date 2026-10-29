import { Link } from 'react-router-dom';
import { VEDIC_ANNUAL_CHAPTERS } from '../lib/vedicAnnual';

export default function VedicAnnualOffer({ language, chartId }: { language: 'zh-Hant' | 'en'; chartId?: string }) {
  const en = language === 'en';
  const path = `${en ? '/en' : ''}/vedic-astrology/annual`;
  const target = chartId ? `${path}?${new URLSearchParams({ chart_id: chartId })}` : path;
  return <section id="vedic-annual-offer" className="mx-auto mt-16 max-w-5xl rounded-3xl border border-amber-300/40 bg-slate-950 p-6 text-violet-50 sm:p-8" aria-labelledby="vedic-annual-offer-heading">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 id="vedic-annual-offer-heading" className="font-serif text-3xl text-amber-50">{en ? 'Vedic Annual Outlook' : '印度占星流年運勢'}</h2>
      <span className="text-3xl font-semibold text-amber-200">NT$599</span>
    </div>
    <h3 className="mt-6 text-xl">{en ? 'Full report coverage' : '完整報告涵蓋範圍'}</h3>
    <ol className="mt-5 grid list-inside list-decimal gap-x-8 gap-y-4 text-base leading-7 sm:grid-cols-2">
      {VEDIC_ANNUAL_CHAPTERS.map(chapter => <li key={chapter[1]}>{chapter[en ? 1 : 0]}</li>)}
    </ol>
    <p className="mt-6 leading-7">{en ? 'One birth profile and one calendar year per purchase. Chinese and English share access. Select your saved birth chart and year before continuing to ECPay.' : '每份方案對應一位對象的固定出生資料與一個指定年份，中英文共用購買權限。選擇已儲存出生盤與年份後，即可前往綠界付款。'}</p>
    <p className="mt-3 leading-7 text-violet-100">{en ? 'Read birth data → prepare Dasha and transits → organize annual themes → generate interpretation → save report. Administrators retain free access; existing reports do not require another payment.' : '讀取出生資料 → 計算大運與行運 → 整理年度主題 → 生成解讀 → 儲存報告。管理員維持免費，已購報告不需再次付款。'}</p>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-300" to={target}>{en ? 'Unlock annual outlook NT$599' : '解鎖流年運勢 NT$599'}</Link>
      <Link className="inline-flex min-h-12 items-center justify-center px-4 py-3 text-amber-200 underline underline-offset-4" to={`${path}#saved-annual-reports`}>{en ? 'View my saved annual readings' : '查看已建立的流年解析'}</Link>
    </div>
  </section>;
}
