import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { humanDesignApi, type HumanDesignFullReportSection } from '../../lib/api';
import { generateFreeReport } from '../../data/human-design/humanDesignData';

interface ReportPageProps {
  chart: HDChart;
  chartId?: string;
  isFullUnlocked?: boolean;
  onEnsureChartSaved?: () => Promise<void>;
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

function FreeCard({
  section,
  chart,
  index,
}: {
  section: ReturnType<typeof generateFreeReport>[number];
  chart: HDChart;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index <= 1);
  const { ref, inView } = useInView();
  const colorClass = TYPE_COLORS[chart.type] ?? FALLBACK_COLOR;

  let content = '';
  try {
    content = section.content(chart) ?? '';
  } catch (err) {
    console.error('Section render error:', err);
    content = '內容載入中，請稍後再試。';
  }

  const paragraphs = content.split('\n\n').map(p => p.trim()).filter(Boolean);
  const displayParagraphs = paragraphs.length > 0 ? paragraphs : ['此區塊的詳細說明正在準備中。'];

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      style={{ transitionDelay: `${Math.min(index * 55, 330)}ms` }}
    >
      <div className={`relative rounded-2xl border overflow-hidden bg-gradient-to-br ${colorClass}`}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-6 py-5 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-cyan-400/70 text-sm flex-shrink-0">{section.icon}</span>
            <span className="text-white font-semibold text-sm">{section.title}</span>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
          }
        </button>
        {expanded && (
          <div className="px-6 pb-6 border-t border-white/5 pt-4">
            <div className="space-y-3.5">
              {displayParagraphs.map((p, i) => (
                <p key={i} className="text-white/65 text-sm leading-[1.85]">{p}</p>
              ))}
            </div>
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

export default function ReportPage({
  chart,
  chartId = '',
  isFullUnlocked = false,
  onEnsureChartSaved,
  onNavigate,
}: ReportPageProps) {
  const [visible, setVisible] = useState(false);
  const [fullReportSections, setFullReportSections] = useState<HumanDesignFullReportSection[] | null>(null);
  const [fullReportLoading, setFullReportLoading] = useState(false);
  const [fullReportError, setFullReportError] = useState('');
  const [reportVersion, setReportVersion] = useState('');

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
      void onEnsureChartSaved?.();
      return;
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

  // Show every free section (free: true) directly — no email gate
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
            {chart.typeName} · {chart.profile}
          </h1>
          <p className="text-white/35 text-sm">{chart.authorityName}</p>

          {/* Quick-glance chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {[
              { label: '類型',     value: chart.typeName },
              { label: '策略',     value: chart.strategy },
              { label: '內在權威', value: chart.authorityName },
              { label: '定義',     value: definitionLabel },
              { label: '人生角色', value: `${chart.profile} ${chart.profileName}` },
            ].map(chip => (
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
              <FreeCard key={s.id} section={s} chart={chart} index={i} />
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
        <div
          className={`mb-8 transition-all duration-600 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p className="text-white/20 text-xs text-center mb-3 tracking-wider uppercase">
            完整版 AI 深度解析
          </p>
          {isFullUnlocked && fullReportLoading && (
            <p className="text-cyan-300/60 text-xs text-center mb-3">正在讀取資料庫完整版報告...</p>
          )}
          {isFullUnlocked && reportVersion && (
            <p className="text-white/20 text-[11px] text-center mb-3">資料版本：{reportVersion}</p>
          )}
          {isFullUnlocked && fullReportError && (
            <p className="text-amber-300/70 text-xs text-center mb-3">{fullReportError}</p>
          )}
          <div className="relative rounded-2xl overflow-hidden border border-white/6">
            {isWaitingForFullReport ? (
              <div className="px-6 py-8 text-center">
                <p className="text-cyan-200/75 text-sm leading-loose">
                  正在生成你的完整 AI 靈魂藍圖，這會比一般摘要更細緻一些...
                </p>
              </div>
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
                    key={s.title}
                    className="px-5 py-3.5 rounded-xl bg-white/2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white/30 text-sm">{s.icon}</span>
                        <span className="text-white/50 text-sm font-medium">{s.title}</span>
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
