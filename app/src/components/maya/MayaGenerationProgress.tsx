import { useEffect, useId, useRef, useState } from 'react';
import type { MayaLocale } from '../../lib/maya';

export default function MayaGenerationProgress({ locale, active, complete = false, completed, total, error, onRetry }: {
  locale: MayaLocale; active: boolean; complete?: boolean; completed?: number; total?: number;
  error?: string; onRetry?: () => void;
}) {
  const en = locale === 'en';
  const label = useId();
  const root = useRef<HTMLElement>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    setElapsed(0);
    const start = Date.now();
    root.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setInterval(() => setElapsed((Date.now() - start) / 1000), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  const actual = Number.isFinite(total) && total! > 0 && Number.isFinite(completed);
  const percent = complete ? 100 : actual
    ? Math.min(99, Math.max(0, Math.floor(completed! / total! * 100)))
    : Math.min(90, Math.floor(90 * (1 - Math.exp(-elapsed / 45)) + 1));
  const stage = error ? (en ? 'Analysis paused' : '解析已暫停') : complete ? (en ? 'Report ready' : '報告已完成')
    : !active ? (en ? 'Paused; continue when ready' : '已暫停，請按繼續解析')
      : actual ? (en ? `Generating your reading · ${completed}/${total} sections complete` : `生成個人解讀 · 已完成 ${completed}/${total} 項`)
        : percent >= 90 ? (en ? 'Still analyzing. Your report will appear automatically.' : '仍在解析中，完成後會自動顯示')
          : (en ? 'Analyzing your report; detailed progress is unavailable.' : '正在解析報告，目前無法取得逐項進度。');
  return <section ref={root} className="w-full rounded-2xl border border-cyan-400/30 bg-slate-900 p-5 sm:p-7" aria-labelledby={label}>
    <h2 id={label} className="text-xl font-semibold text-cyan-100">{en ? 'Exploring Your Maya Life Code' : '正在為你解析馬雅生命密碼'}</h2>
    <p className="mt-2 text-slate-200">{en ? 'We are preparing your personal reading. Your report will appear automatically when ready.' : '我們正在整理你的個人解讀，完成後會自動顯示報告。'}</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 tabular-nums text-cyan-200">
      <span className="inline-flex items-center gap-2 text-sm">
        {active && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cyan-300 motion-safe:animate-pulse" />}
        {en ? `Elapsed: ${Math.floor(elapsed)} seconds` : `已等待 ${Math.floor(elapsed)} 秒`}
      </span>
      <span className="text-2xl font-semibold">{percent}%{!actual && !complete && <span className="text-sm">{en ? ' (estimated)' : '（預估）'}</span>}</span>
    </div>
    <div role="progressbar" aria-labelledby={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={`${percent}%${!actual && !complete ? (en ? ' estimated' : ' 預估') : ''} · ${stage}`}
      className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-700">
      <div className={`h-full rounded-full bg-cyan-300 ${active ? 'transition-[width] duration-1000 ease-out motion-reduce:transition-none' : ''}`} style={{ width: `${percent}%` }} />
    </div>
    <p role="status" className="mt-3 text-cyan-100">{stage}</p>
    {active && <p className="mt-2 text-sm text-slate-300">{en ? 'Your reading is being generated. Progress may pause while a section is prepared; please keep this page open.' : '正在生成你的解讀，請稍候。單項內容生成時百分比可能暫停，請保持頁面開啟。'}</p>}
    {active && elapsed >= 60 && <p className="mt-2 text-sm text-slate-300">{en ? 'This is taking longer. Please keep this page open; do not pay again.' : '解析時間較長，請保持頁面開啟，無需再次付款。'}</p>}
    {error && <p role="alert" className="mt-3 text-rose-200">{error}</p>}
    {!active && !complete && onRetry && <button type="button" className="mt-4 rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950" onClick={onRetry}>
      {en ? 'Retry / continue (no new payment)' : '重試／繼續解析（不重新付款）'}
    </button>}
  </section>;
}
