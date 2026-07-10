import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { humanDesignApi, type HumanDesignFullReportSection } from '../../lib/api';
import { generateFreeReport } from '../../data/human-design/humanDesignData';

interface ReportPageProps {
  chart: HDChart;
  chartId?: string;
  birthDate: string;
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
      body: `你是 ${chart.typeName}，這代表你不是那種適合一直用意志力硬推人生的人。你的內在其實有一套很細緻的節奏，會透過 ${chart.authorityName}、身體感受、情緒沉澱或時間，慢慢告訴你什麼是真的適合你。你可能曾經覺得自己不夠快、不夠果斷，或和別人的運作方式不一樣，但這並不代表你有問題，而是你的能量本來就需要被溫柔地聽見。\n\n請記得，越貼近「${chart.strategy}」，你越能分辨哪些選擇是在保護你，哪些只是頭腦焦慮。當你走在對的位置，會更容易感到 ${chart.signature}；當你長期偏離自己，${chart.notSelf} 就會出現，像靈魂輕輕提醒你：該停下來照顧自己了。`,
    },
    {
      title: 'AI 能量處方',
      icon: '★',
      body: `你的能量處方不是要你更努力，而是讓你慢慢回到自己。接下來七天，請每天用一個小決策練習 ${chart.authorityName}。任何需要承諾時間、金錢或情感的事，都先不要急著答應。你可以停下來，呼吸三次，問自己：「這件事有讓我更靠近 ${chart.signature} 嗎？還是只是讓我害怕變成 ${chart.notSelf}？」\n\n你的身體其實一直在說話，只是過去可能被責任、焦慮或別人的期待蓋住了。每天留十分鐘給自己，不滑手機、不回訊息，只是感覺身體。這不是浪費時間，而是在把散出去的能量慢慢收回來。你不需要修理自己，你只是需要回到那個還沒被外界拉走的自己。`,
    },
    {
      title: 'AI 職涯方向建議',
      icon: '◎',
      body: `在職涯裡，你真正的天賦不只是技能，而是你用能量的方式。你的主要通道 ${chart.keyChannels.join('、')} 和關鍵閘門 ${chart.keyGates.join('、')}，都在提醒你：你有自己自然發光的方式，不需要靠過度消耗來證明價值。真正適合你的工作，應該能讓你比較穩定地感到 ${chart.signature}，而不是長期把你推進 ${chart.notSelf}。\n\n如果一份工作總是逼你違反自己的節奏、一直趕、一直配合、一直證明，即使外表看起來很有前途，也可能不是最滋養你的地方。請溫柔地相信，選擇適合自己的工作節奏不是逃避，而是一種深層的專業。當你的能量被放在對的位置，你的能力會更自然被看見。`,
    },
    {
      title: 'AI 愛情關係分析',
      icon: '◈',
      body: `在感情裡，你很需要一種被理解的安全感。你不是不願意愛，也不是故意慢熱或敏感，而是你的能量需要按照自己的節奏靠近。出生日期 ${birthDate} 對應的人生角色 ${chart.profile} ${chart.profileName}，提醒你在親密關係中，不只是在愛別人，也在學習如何不弄丟自己。\n\n你的開放中心包含 ${open}，這表示你可能很容易感受到對方的情緒、壓力或期待。請記得，界線不是冷漠，而是讓愛不要變成消耗。真正適合你的人，會願意理解你的等待、沉澱與確認，而不是催促你立刻變成他期待的樣子。當關係讓你更接近 ${chart.signature}，那份愛才會真正滋養你。`,
    },
    {
      title: 'AI 財富能量模式',
      icon: '◇',
      body: `你的財富能量不是只靠拼命累積，而是和「你的能量有沒有放在對的位置」很有關。當你用 ${chart.strategy} 選擇合作、工作或收入機會，再用 ${chart.authorityName} 確認是否承諾，金錢比較容易成為自然回流，而不是焦慮換來的成果。你不是不能賺錢，而是不能長期用背叛自己的方式賺錢。\n\n請特別留意 ${chart.notSelf} 如何影響你的金錢決定。你可能會為了安全感接下不適合的工作，為了被肯定而低估價格，或為了不讓人失望而接受消耗你的合作。真正的豐盛，是你的時間、天賦和身體都被尊重。當你越靠近 ${chart.signature}，財富也會更像支持，而不是壓迫。`,
    },
    {
      title: 'AI 靈魂使命',
      icon: '✦',
      body: `${chart.incarnationCross} 指向你此生反覆被帶回的主題。這不是一句高高在上的口號，而是你生命裡會一直出現的內在方向。你可能曾經覺得自己和別人不太一樣，某些選擇看起來合理，你的心卻無法安定；某些路大家都說好，你的身體卻一直感到抗拒。這些感覺不是麻煩，而是你的靈魂在提醒你：你不是來複製別人的人生。\n\n當你更接近使命時，不代表生活永遠輕鬆，但你會更常感到 ${chart.signature}。你的提醒是：少一點急著證明自己，多一點信任 ${chart.strategy} 和 ${chart.authorityName}。你的存在不需要成為所有人的答案；你只需要把自己的能量校準清楚，讓真正需要你的人和機會，自然認出你。`,
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
  chartId = '',
  birthDate,
  isFullUnlocked = false,
  onEnsureChartSaved,
  onNavigate,
}: ReportPageProps) {
  const [visible, setVisible] = useState(false);
  const [fullReportSections, setFullReportSections] = useState<HumanDesignFullReportSection[] | null>(null);
  const [fullReportLoading, setFullReportLoading] = useState(false);
  const [fullReportError, setFullReportError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isFullUnlocked) {
      setFullReportSections(null);
      setFullReportError('');
      setFullReportLoading(false);
      return;
    }
    if (!chartId) {
      setFullReportLoading(true);
      void onEnsureChartSaved?.();
      return;
    }

    let cancelled = false;
    setFullReportLoading(true);
    setFullReportError('');

    humanDesignApi.getFullReport(chartId)
      .then(({ sections }) => {
        if (cancelled) return;
        setFullReportSections(sections);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('human design full report load failed:', err);
        setFullReportError('完整版資料庫報告暫時無法載入，已先顯示備用內容。');
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
  const paidContent = fullReportSections ?? buildPaidContent(chart, birthDate);
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
