import type { VedicChartData, VedicReportProgress } from '../lib/api';

export function VedicChartCore({ chart, language }: { chart: VedicChartData; language: 'zh-Hant' | 'en' }) {
  const p = chart.presentation;
  const en = language === 'en';
  if (!p) return null;
  return <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-violet-300/20 bg-slate-950/60 p-5 sm:p-7">
    <h3 className="text-xl text-amber-100">{en ? 'Core Birth Chart Results' : '出生盤核心結果'}</h3>
    <p className="mt-3 text-violet-100">{en ? 'Ascendant longitude' : '上升經度'}: {p.ascendantLongitude.toFixed(4)}° · {p.moonNakshatra.name} · Pada {p.moonNakshatra.pada ?? '—'}</p>
    <p className="mt-2 text-sm text-violet-100">{en ? 'Current Vimshottari Dasha' : '目前 Vimshottari 大運'}: {p.dasha.mahaDasha} / {p.dasha.antarDasha ?? '—'}</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm text-violet-100"><thead><tr>
      {(en ? ['Planet', 'Sign', 'Longitude', 'House'] : ['行星', '星座', '經度', '宮位']).map(label => <th key={label} className="p-2">{label}</th>)}
    </tr></thead><tbody>{p.planets.map(planet => <tr key={planet.name}><td className="p-2">{planet.name}</td><td className="p-2">{planet.sign}</td><td className="p-2">{planet.longitude.toFixed(4)}°</td><td className="p-2">{planet.house ?? '—'}</td></tr>)}</tbody></table></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{([['D9 / Navamsa', p.d9], ['D10 / Dasamsa', p.d10]] as const).map(([label, division]) => division && <div key={label} className="rounded-xl border border-white/10 p-4">
      <h4 className="font-semibold text-amber-100">{label}</h4><p className="mt-2 text-sm text-violet-100">{en ? 'Ascendant' : '上升'}: {division.ascendant}</p>
      <ul className="mt-2 grid gap-1 text-sm text-violet-100/80">{division.positions.map(planet => <li key={planet.name}>{planet.name}: {planet.sign} · {planet.signDegree.toFixed(2)}° · {en ? 'House' : '宮位'} {planet.house ?? '—'}</li>)}</ul>
    </div>)}</div>
  </section>;
}

export function VedicProgressiveReport({ progress, language, onRetry, retrying }: {
  progress: VedicReportProgress;
  language: 'zh-Hant' | 'en';
  onRetry: (section: number, key: string) => void;
  retrying: string | null;
}) {
  const en = language === 'en';
  const active = progress.reportStatus === 'pending' || progress.reportStatus === 'generating';
  return <section id="vedic-paid-report" className="mx-auto mt-12 max-w-5xl" aria-label={en ? 'AI report progress' : 'AI 解析進度'}>
    <div role="status" aria-live="polite" className="rounded-2xl border border-amber-300/20 bg-slate-950/60 p-5">
      <h2 className="text-xl text-amber-100">{active ? en ? 'Your in-depth AI reading is being generated' : 'AI 深度解析產生中'
        : progress.reportStatus === 'completed' ? en ? 'Your reading is complete' : '深度解析已完成'
          : en ? 'Some sections could not be completed' : '部分解析暫時未完成'}</h2>
      <p className="mt-2 text-violet-100">{en ? 'Completed' : '已完成'} {progress.completedSections} / {progress.totalSections}</p>
      {progress.safeErrorCode === 'REPORT_QUALITY_FAILED' && <p className="mt-3 text-rose-100">{en
        ? 'Your saved sections are available, but the final report quality check did not pass. Please contact support.'
        : '已保存的段落仍可閱讀，但整份報告未通過最終品質檢查，請聯繫客服。'}</p>}
      {progress.title && <h3 className="mt-4 font-serif text-2xl text-amber-100">{progress.title}</h3>}
      {progress.introduction && <p className="mt-3 whitespace-pre-line break-words leading-8 text-violet-100">{progress.introduction}</p>}
    </div>
    <div className="mt-5 grid gap-5">{progress.sections.map((section, index) => <article key={section.key} className="min-w-0 rounded-2xl border border-violet-300/20 bg-slate-950/60 p-5 sm:p-7" data-section-status={section.status}>
      <h3 className="text-xl text-amber-100">{section.title}</h3>
      {section.status === 'completed' && section.content ? <>
        <p className="mt-4 whitespace-pre-line break-words leading-8 text-violet-100/90">{section.content.consultation}</p>
        {section.content.timeline?.map(period => <div key={period.id} className="mt-5 rounded-xl border border-white/10 p-4">
          <h4 className="text-amber-100">{period.displayLabel}</h4>
          <p className="mt-2 text-sm text-violet-100/70">{period.analysisStartDate || period.startDate} ～ {period.analysisEndDate || period.endDate}</p>
          <p className="mt-3 whitespace-pre-line break-words leading-8 text-violet-100">{period.interpretation.consultation}</p>
        </div>)}
      </> : section.status === 'failed' ? <>
        <p className="mt-4 text-violet-100">{en ? 'This section is temporarily unavailable.' : '此段解析暫時未完成。'}</p>
        {section.retryable && <button type="button" disabled={!!retrying} onClick={() => onRetry(index + 1, section.key)} className="mt-3 rounded-xl border border-amber-300/30 px-4 py-2 text-amber-100 disabled:opacity-50">{en ? 'Retry this section' : '重試此段解析'}</button>}
      </> : <div className="mt-4 space-y-3" aria-busy="true">
        <p className="text-sm text-violet-100/70">{section.status === 'generating' ? en ? 'Analyzing…' : '正在解析…' : en ? 'Waiting for analysis…' : '等待解析…'}</p>
        <div className="h-3 w-full rounded bg-violet-200/10" /><div className="h-3 w-4/5 rounded bg-violet-200/10" />
      </div>}
    </article>)}</div>
    {progress.closing && <p className="mt-7 whitespace-pre-line text-center leading-8 text-amber-100/80">{progress.closing}</p>}
  </section>;
}
