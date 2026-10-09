import type { VedicChartData, VedicReportProgress } from '../lib/api';
import { vedicReportPercentage } from '../lib/vedicReportPolling';

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

export function VedicProgressiveReport({ progress, language, onRetry, retrying, reconnecting = false }: {
  progress: VedicReportProgress;
  language: 'zh-Hant' | 'en';
  onRetry: (section: number, key: string) => void;
  retrying: string | null;
  reconnecting?: boolean;
}) {
  const en = language === 'en';
  const active = progress.reportStatus === 'pending' || progress.reportStatus === 'generating';
  const percentage = vedicReportPercentage(progress.completedSections);
  const latestCompleted = [...progress.sections].reverse().find(section => section.status === 'completed' && section.content);
  return <section id="vedic-paid-report" className="mx-auto mt-8 max-w-5xl scroll-mt-24" aria-label={en ? 'AI report progress' : 'AI 解析進度'}>
    <div role="status" aria-live="polite" className="rounded-2xl border border-amber-300/30 bg-slate-950/80 p-5 shadow-[0_0_40px_rgba(251,191,36,0.12)] sm:p-7">
      <h2 className="text-xl font-semibold text-amber-100 sm:text-2xl">{active ? en ? 'Your nine-part Vedic Astrology reading is being generated' : '正在為您生成九大印度占星深度解析'
        : progress.reportStatus === 'completed' ? en ? 'All nine readings are complete' : '九大解析已完成'
          : en ? 'Some sections could not be completed' : '部分解析暫時未完成'}</h2>
      {active && <p className="mt-2 text-violet-100">{en
        ? 'The AI is preparing personalized interpretations based on your birth chart, one section at a time.'
        : 'AI 正在根據您的出生盤，逐項完成個人化解析。'}</p>}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold text-amber-50">{en ? 'Current progress' : '目前完成'} <span className="ml-1 text-2xl tabular-nums">{percentage}%</span></p>
        <p className="text-sm text-violet-100">{en ? 'Completed' : '已完成'} {progress.completedSections} / 9 {en ? 'sections' : '項解析'}</p>
      </div>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-violet-200/15"
        role="progressbar"
        aria-label={en ? 'Vedic report generation progress' : '印度占星報告生成進度'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-400 to-violet-400 transition-[width] duration-500" style={{ width: `${percentage}%` }} />
      </div>
      {active && <>
        <p className="mt-4 text-sm text-violet-100/80">{en
          ? 'This usually takes about 1–3 minutes; actual time depends on system load.'
          : '預估約需 1～3 分鐘，實際時間依系統負載而定。'}</p>
        <p className="mt-2 text-sm leading-6 text-violet-100/65">{en
          ? 'You may keep this page open to follow the live updates. Leaving or closing the page will not stop the generation workflow; your saved progress will be available when you return.'
          : '建議留在此頁面查看即時進度；即使離開或關閉頁面，已啟動的生成流程仍會繼續，稍後回來可恢復進度。'}</p>
      </>}
      {reconnecting && <p className="mt-3 text-sm text-amber-200" role="status" aria-live="polite">{en
        ? 'Connection interrupted. Keeping the last confirmed progress and reconnecting…'
        : '連線暫時中斷，保留上次確認的進度，正在重新連線…'}</p>}
      {progress.safeErrorCode === 'REPORT_QUALITY_FAILED' && <p className="mt-3 text-rose-100">{en
        ? 'Your saved sections are available, but the final report quality check did not pass. Please contact support.'
        : '已保存的段落仍可閱讀，但整份報告未通過最終品質檢查，請聯繫客服。'}</p>}
      {progress.title && <h3 className="mt-4 font-serif text-2xl text-amber-100">{progress.title}</h3>}
      {progress.introduction && <p className="mt-3 whitespace-pre-line break-words leading-8 text-violet-100">{progress.introduction}</p>}
      {latestCompleted?.content?.consultation && <div className="mt-5 rounded-xl border border-emerald-200/20 bg-emerald-200/[0.04] p-4">
        <h3 className="font-semibold text-emerald-100">{en ? 'Latest completed section' : '最新完成的解析'} · {latestCompleted.title}</h3>
        <p className="mt-2 whitespace-pre-line break-words leading-7 text-violet-100/90">{latestCompleted.content.consultation}</p>
      </div>}
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
