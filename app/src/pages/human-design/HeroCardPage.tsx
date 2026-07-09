import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';

interface HeroCardPageProps {
  chart: HDChart;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  onViewReport: () => void;
}

const TYPE_COLORS: Record<string, { badge: string; glow: string; text: string; border: string }> = {
  'generator':            { badge: 'from-emerald-500 to-teal-500',    glow: 'bg-emerald-500/15', text: 'text-emerald-300',  border: 'border-emerald-400/25' },
  'manifesting-generator':{ badge: 'from-blue-500 to-cyan-500',       glow: 'bg-blue-500/15',    text: 'text-blue-300',     border: 'border-blue-400/25'    },
  'projector':            { badge: 'from-violet-500 to-purple-500',   glow: 'bg-violet-500/15',  text: 'text-violet-300',   border: 'border-violet-400/25'  },
  'manifestor':           { badge: 'from-orange-500 to-amber-500',    glow: 'bg-orange-500/15',  text: 'text-orange-300',   border: 'border-orange-400/25'  },
  'reflector':            { badge: 'from-sky-400 to-indigo-400',      glow: 'bg-sky-500/15',     text: 'text-sky-300',      border: 'border-sky-400/25'     },
};

function CenterDot({ defined }: { defined: boolean }) {
  return (
    <div
      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
        defined
          ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
          : 'bg-transparent border-white/20'
      }`}
    />
  );
}

export default function HeroCardPage({ chart, birthDate, birthTime, birthCity, onViewReport }: HeroCardPageProps) {
  const [visible, setVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const colors = TYPE_COLORS[chart.type] ?? TYPE_COLORS['generator'];

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setCardVisible(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const centerGroups = [
    { label: '頭頂', key: 'head' as const },
    { label: '邏輯', key: 'ajna' as const },
    { label: '喉嚨', key: 'throat' as const },
    { label: 'G 中心', key: 'g' as const },
    { label: '心臟', key: 'heart' as const },
    { label: '薦骨', key: 'sacral' as const },
    { label: '情緒', key: 'solar-plexus' as const },
    { label: '脾臟', key: 'spleen' as const },
    { label: '根部', key: 'root' as const },
  ];

  const metaRows = [
    { label: '人生角色', value: `${chart.profile}  ${chart.profileName}` },
    { label: '內在權威', value: chart.authorityName },
    { label: '策略', value: chart.strategy },
    { label: '本命十字', value: chart.incarnationCross },
    { label: '最高狀態', value: chart.signature },
    { label: '非自我主題', value: chart.notSelf },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-20">
      <div className="w-full max-w-lg">

        {/* Header announcement */}
        <div
          className={`text-center mb-7 transition-all duration-600 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 mb-4">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-400 tracking-widest font-medium uppercase">
              你的 AI 人類圖已完成
            </span>
          </div>
          <div className="text-white/30 text-xs">
            {birthDate} · {birthTime} · {birthCity}
          </div>
        </div>

        {/* Main Hero Card */}
        <div
          className={`relative rounded-3xl overflow-hidden transition-all duration-700 ease-out mb-5 ${
            cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
          }`}
        >
          {/* Card background */}
          <div className="absolute inset-0 bg-white/3 backdrop-blur-sm" />
          <div className={`absolute inset-0 ${colors.glow} opacity-60`} />
          <div className={`absolute inset-0 border ${colors.border} rounded-3xl`} />

          <div className="relative p-7">
            {/* Type Badge */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-white/35 text-xs mb-1.5 font-medium tracking-widest uppercase">
                  你的類型
                </p>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex px-4 py-1.5 rounded-full bg-gradient-to-r ${colors.badge} shadow-lg`}>
                    <span className="text-white font-bold text-sm tracking-wide">
                      {chart.typeName}
                    </span>
                  </div>
                </div>
              </div>
              {/* Center diagram */}
              <div className="flex flex-col items-center gap-1.5">
                {centerGroups.map(cg => (
                  <div key={cg.key} className="flex items-center gap-1.5">
                    <span className="text-white/20 text-[9px] w-9 text-right">{cg.label}</span>
                    <CenterDot defined={chart.definedCenters.includes(cg.key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Key info rows */}
            <div className="space-y-3 mb-6">
              {metaRows.map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-white/30 text-xs flex-shrink-0 pt-0.5 w-20">{row.label}</span>
                  <span className={`text-sm font-medium text-right ${colors.text}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/8 mb-5" />

            {/* AI Intro */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-white/30 text-xs font-medium">AI 人生使命解析</span>
              </div>
              <p className="text-white/75 text-sm leading-[1.8] pl-7 italic">
                "{chart.aiIntro}"
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div
          className={`transition-all duration-700 delay-300 ease-out ${cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <button
            onClick={onViewReport}
            className="group relative w-full py-4 rounded-2xl text-sm font-semibold overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative flex items-center justify-center gap-2 text-white">
              <Sparkles className="w-4 h-4" />
              查看我的免費報告
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* Channels tag cloud */}
        <div
          className={`mt-6 transition-all duration-700 delay-500 ease-out ${cardVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <p className="text-white/20 text-xs text-center mb-3">偵測到的主要通道</p>
          <div className="flex flex-wrap justify-center gap-2">
            {chart.keyChannels.map(ch => (
              <span key={ch} className="px-2.5 py-1 rounded-full text-xs text-white/30 border border-white/8 bg-white/3">
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
