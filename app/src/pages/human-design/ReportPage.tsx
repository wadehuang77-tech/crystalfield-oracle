import { useState, useEffect, useRef } from 'react';
import { Lock, Sparkles, ChevronDown, ChevronUp, ArrowRight, Download } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { generateFreeReport } from '../../data/human-design/humanDesignData';

interface ReportPageProps {
  chart: HDChart;
  birthDate: string;
  isFullUnlocked?: boolean;
  unlocking?: boolean;
  onUnlockFull?: () => void;
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

// All paid content — requires OpenAI and payment
const PAID_SECTIONS = [
  { title: '九大中心完整解析', icon: '◉' },
  { title: '64 閘門分析', icon: '✦' },
  { title: '通道分析', icon: '◈' },
  { title: 'AI 深度人格分析', icon: '◇' },
  { title: 'AI 能量處方', icon: '★' },
  { title: 'AI 職涯方向建議', icon: '◎' },
  { title: 'AI 愛情關係分析', icon: '◈' },
  { title: 'AI 財富能量模式', icon: '◇' },
  { title: 'AI 靈魂使命', icon: '✦' },
];

function buildPaidContent(chart: HDChart, birthDate: string) {
  const defined = chart.definedCenters.join('、') || '無固定定義中心';
  const open = chart.undefinedCenters.join('、') || '開放中心很少';
  return [
    {
      title: '九大中心完整解析',
      icon: '◉',
      body: `你的定義中心集中在 ${defined}，這些是你較穩定、可被信任的能量來源。開放中心包含 ${open}，代表你容易讀取環境與他人的頻率，也需要練習分辨哪些感受不是自己的。`,
    },
    {
      title: '64 閘門分析',
      icon: '✦',
      body: `目前最鮮明的閘門訊號是 ${chart.keyGates.join('、')}。它們像是你的內在語彙，會影響你吸引機會、表達天賦，以及在壓力下重複出現的生命題目。`,
    },
    {
      title: '通道分析',
      icon: '◈',
      body: `你的主要通道為 ${chart.keyChannels.join('、')}。通道代表兩個中心之間穩定流動的能量，適合被當成長期優勢，而不是短期情緒。`,
    },
    {
      title: 'AI 深度人格分析',
      icon: '◇',
      body: `${chart.typeName} 的你不需要用意志力硬推人生。越貼近「${chart.strategy}」，越能看見哪些邀請、回應或等待其實是在保護你的能量品質。`,
    },
    {
      title: 'AI 能量處方',
      icon: '★',
      body: `接下來七天，請每天用一個小決策練習 ${chart.authorityName}。不要急著說服自己，用身體的穩定感、情緒的清明或直覺的乾淨程度來做最後確認。`,
    },
    {
      title: 'AI 職涯方向建議',
      icon: '◎',
      body: `你的職涯關鍵不是追逐所有機會，而是找到能讓 ${chart.signature} 出現的工作節奏。當你開始長期感到 ${chart.notSelf}，通常代表能量交換已經失衡。`,
    },
    {
      title: 'AI 愛情關係分析',
      icon: '◈',
      body: `關係裡最重要的是讓對方理解你的決策節奏。出生日期 ${birthDate} 對應的人生角色 ${chart.profile}，也提醒你在親密關係中需要同時保留學習與示範的空間。`,
    },
    {
      title: 'AI 財富能量模式',
      icon: '◇',
      body: `財富對你來說更像能量校準後的結果。當你用 ${chart.strategy} 篩選合作與產品，並用 ${chart.authorityName} 決定承諾，就比較不容易把錢賺成消耗。`,
    },
    {
      title: 'AI 靈魂使命',
      icon: '✦',
      body: `${chart.incarnationCross} 指向你此生反覆被推回的主題。它不是壓力題，而是你越活越順時，會自然散發出來的生命方向。`,
    },
  ];
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
  birthDate,
  isFullUnlocked = false,
  unlocking = false,
  onUnlockFull,
  onNavigate,
}: ReportPageProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

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
  const paidContent = buildPaidContent(chart, birthDate);

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

        {/* ── Paid / full sections ── */}
        <div
          className={`mb-8 transition-all duration-600 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p className="text-white/20 text-xs text-center mb-3 tracking-wider uppercase">
            {isFullUnlocked ? '完整版 AI 深度解析' : '付費完整版 AI 深度解析'}
          </p>
          <div className="relative rounded-2xl overflow-hidden border border-white/6">
            <div className="p-1 space-y-1">
              {(isFullUnlocked ? paidContent : PAID_SECTIONS).map(s => (
                <div
                  key={s.title}
                  className="px-5 py-3.5 rounded-xl bg-white/2"
                >
                  <div className={`flex items-center justify-between gap-3 ${isFullUnlocked ? '' : 'opacity-45'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-sm">{s.icon}</span>
                      <span className="text-white/50 text-sm font-medium">{s.title}</span>
                    </div>
                    {!isFullUnlocked && <Lock className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                  </div>
                  {'body' in s && typeof s.body === 'string' && (
                    <p className="mt-3 pl-7 text-white/65 text-sm leading-[1.85]">{s.body}</p>
                  )}
                </div>
              ))}
            </div>
            {!isFullUnlocked && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0E17] to-transparent pointer-events-none" />}
          </div>
        </div>

        {/* ── Paid CTA ── */}
        {!isFullUnlocked && (
          <div
            className={`relative rounded-2xl overflow-hidden p-7 text-center mb-8 transition-all duration-600 delay-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/12 via-[#0A0E17]/80 to-cyan-600/12" />
            <div className="absolute inset-0 border border-white/8 rounded-2xl" />
            <div className="relative">
              <p className="text-white/40 text-xs mb-2 tracking-wider">解鎖完整 AI 靈魂藍圖</p>
              <h3 className="text-white font-bold text-lg mb-1">完整版 Human Design AI Report</h3>
              <p className="text-white/30 text-xs mb-5">
                64 閘門 · 通道解析 · 九大中心 · AI 行動建議 · 職涯 / 愛情 / 財富模式
              </p>
              <button
                onClick={onUnlockFull}
                disabled={unlocking}
                className="group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold overflow-hidden disabled:opacity-60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <span className="relative text-white">{unlocking ? '前往付款中...' : 'NT$10 解鎖完整報告'}</span>
                <ArrowRight className="relative w-4 h-4 text-white" />
              </button>
            </div>
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
