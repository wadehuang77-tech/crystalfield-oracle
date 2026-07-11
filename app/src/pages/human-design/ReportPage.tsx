import { useState, useEffect, useRef } from 'react';
import { Lock, Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { humanDesignApi, type HumanDesignFullReportSection } from '../../lib/api';
import { generateFreeReport } from '../../data/human-design/humanDesignData';

interface ReportPageProps {
  chart: HDChart;
  chartId?: string;
  access?: 'locked' | 'email' | 'basic' | 'full' | 'bundle';
  checkoutLoading?: boolean;
  isFullUnlocked?: boolean;
  onStartBasicCheckout?: () => void;
  onStartFullCheckout?: () => void;
  onStartBundleCheckout?: () => void;
  onEnsureChartSaved?: () => Promise<boolean>;
  onNavigate: (page: string) => void;
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.05 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

const TYPE_COLORS: Record<string, string> = {
  'generator':             'from-emerald-950/40 to-teal-950/40   border-emerald-400/20',
  'manifesting-generator': 'from-blue-950/40   to-cyan-950/40    border-blue-400/20',
  'projector':             'from-violet-950/40 to-purple-950/40  border-violet-400/20',
  'manifestor':            'from-orange-950/40 to-amber-950/40   border-orange-400/20',
  'reflector':             'from-sky-950/40    to-indigo-950/40  border-sky-400/20',
};

const FALLBACK_COLOR = 'from-blue-950/40 to-cyan-950/40 border-blue-400/20';

const FULL_REPORT_TITLES = [
  '九大中心完整解析',
  '64 閘門分析',
  '通道分析',
  '深度人格分析',
  '能量處方',
  '職涯方向建議',
  '愛情關係分析',
  '財富能量模式',
  '靈魂使命',
];

const FULL_REPORT_LOADING_STEPS = [
  '確認付款完成',
  '建立你的人類圖能量資料',
  '整理固定知識與圖表結構',
  '生成深度解析內容',
  '準備完整報告畫面',
];

function displayFullReportTitle(title: string): string {
  return title.replace(/^AI\s+/, '');
}

function displayFullReportIcon(section: HumanDesignFullReportSection): string {
  return section.id === 'personality' ? '◇' : section.icon;
}

function FreeCard({
  section,
  chart,
  index,
  locked = false,
  onUnlock,
  checkoutLoading = false,
}: {
  section: ReturnType<typeof generateFreeReport>[number];
  chart: HDChart;
  index: number;
  locked?: boolean;
  onUnlock?: () => void;
  checkoutLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState(index <= 1 && !locked);
  const { ref, inView } = useInView();
  const colorClass = TYPE_COLORS[chart.type] ?? FALLBACK_COLOR;

  let content = '';
  try {
    content = section.content(chart) ?? '';
  } catch (err) {
    console.error('Section render error:', err);
    content = '內容載入中，請稍後再試。';
  }

  const previewLength = Math.max(42, Math.ceil(content.replace(/\s/g, '').length * 0.2));
  const previewContent = locked
    ? `${content.slice(0, previewLength).trim()}...`
    : content;
  const paragraphs = previewContent.split('\n\n').map(p => p.trim()).filter(Boolean);
  const displayParagraphs = paragraphs.length > 0 ? paragraphs : ['此區塊的詳細說明正在準備中。'];

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      style={{ transitionDelay: `${Math.min(index * 55, 330)}ms` }}
    >
      <div className={`relative rounded-2xl border overflow-hidden bg-gradient-to-br ${colorClass}`}>
        <button
          onClick={() => { if (!locked) setExpanded(e => !e); }}
          className="w-full flex items-center justify-between px-6 py-5 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-cyan-400/70 text-sm flex-shrink-0">{section.icon}</span>
            <span className="text-white font-semibold text-sm">{section.title}</span>
          </div>
          {locked
            ? <Lock className="w-4 h-4 text-cyan-300/60 flex-shrink-0" />
            : expanded
            ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
          }
        </button>
        {(expanded || locked) && (
          <div className="px-6 pb-6 border-t border-white/5 pt-4">
            <div className={`space-y-3.5 ${locked ? 'relative max-h-24 overflow-hidden' : ''}`}>
              {displayParagraphs.map((p, i) => (
                <p key={i} className="text-white/65 text-sm leading-[1.85]">{p}</p>
              ))}
              {locked && (
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/95 to-transparent" />
              )}
            </div>
            {locked && (
              <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-4 text-center">
                <p className="mb-3 text-xs leading-relaxed text-cyan-100/70">
                  已顯示約 20% 內容。解鎖基礎完整報告後，可查看這一區與其他基礎段落。
                </p>
                <button
                  type="button"
                  onClick={onUnlock}
                  disabled={checkoutLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Lock className="h-4 w-4" />
                  {checkoutLoading ? '前往付款中...' : '解鎖基礎完整報告 NT$199'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackReport({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <p className="text-white/50 text-sm mb-6">報告資料未載入，請重新計算。</p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-6 py-3 rounded-full text-sm text-white bg-white/10 hover:bg-white/15 transition-all"
        >
          重新開始
        </button>
      </div>
    </div>
  );
}

function FullReportLoadingCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, FULL_REPORT_LOADING_STEPS.length - 1));
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(92, 18 + step * 18);

  return (
    <div className="px-6 py-7">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 shadow-lg shadow-cyan-500/10">
        <Sparkles className="h-5 w-5 text-cyan-200 animate-pulse" />
      </div>
      <p className="mb-2 text-center text-sm font-semibold text-white/85">
        付款已完成，正在生成你的 Human Design Report
      </p>
      <p className="mx-auto mb-5 max-w-sm text-center text-xs leading-relaxed text-cyan-100/55">
        系統正在正常運作，請停留在此頁。完整深度解析需要整合圖表、固定知識與個人化解讀，通常會比一般摘要多等一點時間。
      </p>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {FULL_REPORT_LOADING_STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition ${
                active
                  ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                  : done
                    ? 'border-teal-300/15 bg-teal-300/5 text-teal-100/70'
                    : 'border-white/6 bg-white/3 text-white/35'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? 'bg-cyan-300 animate-pulse' : done ? 'bg-teal-300' : 'bg-white/20'}`} />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-white/35">
        若等待較久，請不要重新付款；報告完成後會自動顯示。
      </p>
    </div>
  );
}

export default function ReportPage({
  chart,
  chartId = '',
  access = 'email',
  checkoutLoading = false,
  isFullUnlocked = false,
  onStartBasicCheckout,
  onStartFullCheckout,
  onStartBundleCheckout,
  onEnsureChartSaved,
  onNavigate,
}: ReportPageProps) {
  const [visible, setVisible] = useState(false);
  const [fullReportSections, setFullReportSections] = useState<HumanDesignFullReportSection[] | null>(null);
  const [fullReportLoading, setFullReportLoading] = useState(false);
  const [fullReportError, setFullReportError] = useState('');
  const [reportVersion, setReportVersion] = useState('');
  const fullReportRef = useRef<HTMLDivElement>(null);
  const basicUnlocked = access === 'basic' || access === 'bundle';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isFullUnlocked) {
      setFullReportSections(null);
      setFullReportError('');
      setFullReportLoading(false);
      setReportVersion('');
      return;
    }
    if (!chartId) {
      setFullReportLoading(true);
      setReportVersion('');
      setFullReportError('');
      let cancelled = false;
      const timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setFullReportLoading(false);
        setFullReportError('人類圖資料尚未成功建立，無法讀取完整版報告。請重新計算一次。');
      }, 25000);

      const savePromise = onEnsureChartSaved?.() ?? Promise.resolve(false);
      void savePromise
        .then((saved) => {
          if (cancelled) return;
          if (saved) {
            return;
          }
          window.clearTimeout(timeoutId);
          setFullReportLoading(false);
          setFullReportError('人類圖資料尚未成功建立，無法讀取完整版報告。請重新計算一次。');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('HD chart save before full report failed:', err);
          window.clearTimeout(timeoutId);
          setFullReportLoading(false);
          setFullReportError('人類圖資料建立失敗，無法讀取完整版報告。請稍後再試。');
        });

      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    let cancelled = false;
    setFullReportLoading(true);
    setFullReportError('');
    setReportVersion('');

    humanDesignApi.getFullReport(chartId)
      .then(({ sections, report_version }) => {
        if (cancelled) return;
        if (!sections.length) {
          setFullReportError('完整版資料庫報告沒有回傳內容，請稍後再試。');
          setFullReportSections(null);
          setReportVersion('');
          return;
        }
        setReportVersion(report_version);
        setFullReportSections(sections);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('human design full report load failed:', err);
        setFullReportError('完整版資料庫報告暫時無法載入，請稍後再試。');
        setFullReportSections(null);
        setReportVersion('');
      })
      .finally(() => {
        if (!cancelled) setFullReportLoading(false);
      });

    return () => { cancelled = true; };
  }, [isFullUnlocked, chartId, onEnsureChartSaved]);

  useEffect(() => {
    if (!isFullUnlocked || basicUnlocked) return;
    const t = window.setTimeout(() => {
      fullReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => window.clearTimeout(t);
  }, [isFullUnlocked, basicUnlocked]);

  // Safety guard
  if (!chart || !chart.type || !chart.typeName) {
    return <FallbackReport onNavigate={onNavigate} />;
  }

  // All free sections — computed entirely from local Human Design Engine, no API
  let freeSections: ReturnType<typeof generateFreeReport> = [];
  try {
    freeSections = generateFreeReport(chart);
  } catch (err) {
    console.error('generateFreeReport error:', err);
  }

  const visibleSections = freeSections.filter(s => s.free);

  // Determine definition label from definedCenters count
  const definitionLabel =
    chart.definedCenters.length === 0 ? '無定義（反映者）' :
    chart.definedCenters.length <= 3 ? '單一定義' :
    chart.definedCenters.length <= 6 ? '雙重定義' : '多重定義';

  const handleDownload = () => window.print();
  const paidContent = fullReportSections ?? [];
  const isWaitingForFullReport = isFullUnlocked && !fullReportSections && !fullReportError && (fullReportLoading || !chartId);

  return (
    <div className="min-h-screen px-5 pt-24 pb-24">
      <div className="max-w-xl mx-auto">

        {/* ── Header ── */}
        <div
          className={`text-center mb-10 transition-all duration-600 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 mb-5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-400 tracking-widest uppercase font-medium">
              你的人類圖免費報告
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {basicUnlocked ? `${chart.typeName} · ${chart.profile}` : chart.typeName}
          </h1>
          <p className="text-white/35 text-sm">
            {basicUnlocked ? chart.authorityName : 'Email 免費解鎖：先查看你的類型'}
          </p>

          {/* Quick-glance chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {(basicUnlocked ? [
              { label: '類型',     value: chart.typeName },
              { label: '策略',     value: chart.strategy },
              { label: '內在權威', value: chart.authorityName },
              { label: '定義',     value: definitionLabel },
              { label: '人生角色', value: `${chart.profile} ${chart.profileName}` },
            ] : [
              { label: '類型', value: chart.typeName },
            ]).map(chip => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8"
              >
                <span className="text-white/30 text-xs">{chip.label}</span>
                <span className="text-white/70 text-xs font-medium">{chip.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Free sections (fully local, no API) ── */}
        {visibleSections.length > 0 ? (
          <div className="space-y-3 mb-8">
            {visibleSections.map((s, i) => (
              <FreeCard
                key={s.id}
                section={s}
                chart={chart}
                index={i}
                locked={!basicUnlocked && s.id !== 'type'}
                checkoutLoading={checkoutLoading}
                onUnlock={onStartBasicCheckout}
              />
            ))}
          </div>
        ) : (
          /* Absolute fallback if generateFreeReport returned nothing */
          <div className="space-y-3 mb-8">
            {([
              { id: 'fb-type',      title: `類型：${chart.typeName}`,      icon: '✦', content: () => chart.aiIntro || `你是${chart.typeName}，遵循「${chart.strategy}」的生命策略。` },
              { id: 'fb-authority', title: `內在權威：${chart.authorityName}`, icon: '⊕', content: () => `你的內在權威是${chart.authorityName}。` },
              { id: 'fb-profile',   title: `人生角色：${chart.profile} ${chart.profileName}`, icon: '◈', content: () => `你的人生角色是 ${chart.profile} ${chart.profileName}。` },
              { id: 'fb-definition',title: `定義：${definitionLabel}`,     icon: '◑', content: () => `你的定義是${definitionLabel}。` },
            ] as const).map((s, i) => (
              <FreeCard
                key={s.id}
                section={{ ...s, free: true, emailUnlock: false }}
                chart={chart}
                index={i}
              />
            ))}
          </div>
        )}

        {/* ── Full sections ── */}
        {isFullUnlocked ? (
          <div
            ref={fullReportRef}
            className={`mb-8 transition-all duration-600 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
          <p className="text-white/20 text-xs text-center mb-3 tracking-wider uppercase">
            專屬人生使用說明書
          </p>
          {isFullUnlocked && fullReportLoading && (
            <p className="text-cyan-300/60 text-xs text-center mb-3">報告生成中，完成後會自動顯示</p>
          )}
          {isFullUnlocked && reportVersion && (
            <p className="text-white/20 text-[11px] text-center mb-3">資料版本：{reportVersion}</p>
          )}
          {isFullUnlocked && fullReportError && (
            <p className="text-amber-300/70 text-xs text-center mb-3">{fullReportError}</p>
          )}
          <div className="relative rounded-2xl overflow-hidden border border-white/6">
            {isWaitingForFullReport ? (
              <FullReportLoadingCard />
            ) : fullReportError && paidContent.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-amber-200/75 text-sm leading-loose">
                  完整版內容目前沒有成功載入，系統不會再顯示舊版短文。請稍後重新整理，或確認後台 Worker 已部署最新版本。
                </p>
              </div>
            ) : (
              <div className="p-1 space-y-1">
                {paidContent.map(s => (
                  <div
                    key={s.id}
                    className="px-5 py-3.5 rounded-xl bg-white/2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white/30 text-sm">{displayFullReportIcon(s)}</span>
                        <span className="text-white/50 text-sm font-medium">{displayFullReportTitle(s.title)}</span>
                      </div>
                    </div>
                    {'body' in s && typeof s.body === 'string' && (
                      <p className="mt-3 pl-7 text-white/65 text-sm leading-[1.85]">{s.body}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        ) : (
          <div className={`mb-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 px-5 py-5 transition-all duration-600 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
              <Lock className="h-4 w-4 text-white/45" />
            </div>
            <p className="mb-2 text-center text-sm font-semibold text-white/80">專屬人生使用說明書</p>
            <p className="mb-4 text-center text-xs leading-relaxed text-white/45">
              解鎖後查看以下 9 項完整說明
            </p>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FULL_REPORT_TITLES.map((title) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2.5 text-sm font-medium text-white/70"
                >
                  {title}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onStartFullCheckout}
              disabled={checkoutLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Lock className="h-4 w-4" />
              {checkoutLoading ? '前往付款中...' : '解鎖你的專屬人生使用說明書 NT$399'}
            </button>
            <button
              type="button"
              onClick={onStartBundleCheckout}
              disabled={checkoutLoading}
              className="mt-3 inline-flex w-full flex-col items-center justify-center rounded-xl border border-yellow-100/60 bg-gradient-to-r from-yellow-200 via-amber-100 to-cyan-200 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>{checkoutLoading ? '前往付款中...' : '解鎖基礎報告 + 專屬人生使用說明書 NT$598'}</span>
            </button>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            下載報告 PDF
          </button>
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60 transition-all"
          >
            重新計算
          </button>
        </div>

      </div>
    </div>
  );
}
