import { useState } from 'react';
import { Zap, Gem, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { NumerologyReport, GridLine } from '../../lib/numerology';
import ContentGate from './ContentGate';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  report: NumerologyReport;
  tier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
}

const GRID_LAYOUT = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

function getCellCenter(num: number): [number, number] {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (GRID_LAYOUT[row][col] === num) {
        return [col * 33.333 + 16.667, row * 33.333 + 16.667];
      }
    }
  }
  return [0, 0];
}

const LINE_COLORS: Record<string, string> = {
  '1-2-3': '#a78bfa',
  '4-5-6': '#6ee7b7',
  '7-8-9': '#fbbf24',
  '1-4-7': '#fb923c',
  '2-5-8': '#fda4af',
  '3-6-9': '#60a5fa',
  '1-5-9': '#fbbf24',
  '3-5-7': '#f97316',
};

function GridVisual({ report, hoveredLine }: { report: NumerologyReport; hoveredLine: string | null }) {
  const { gridCounts, activeGridLines } = report;
  return (
    <div className="relative w-full aspect-square max-w-[240px] mx-auto select-none">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ zIndex: 2 }}
      >
        {activeGridLines.map(line => {
          const [ax, ay] = getCellCenter(line.numbers[0]);
          const [bx, by] = getCellCenter(line.numbers[1]);
          const [cx, cy] = getCellCenter(line.numbers[2]);
          void bx; void by;
          const color = LINE_COLORS[line.id] || '#fbbf24';
          const isHovered = hoveredLine === line.id;
          return (
            <g key={line.id}>
              <line x1={ax} y1={ay} x2={cx} y2={cy} stroke={color}
                strokeWidth={isHovered ? 3.5 : 1.5} strokeOpacity={isHovered ? 0.6 : 0.25}
                strokeLinecap="round" filter="url(#glow)" />
              <line x1={ax} y1={ay} x2={cx} y2={cy} stroke={color}
                strokeWidth={isHovered ? 1.5 : 0.8} strokeOpacity={isHovered ? 1 : 0.7}
                strokeLinecap="round" strokeDasharray={isHovered ? 'none' : '2 1'} />
              <circle cx={(ax + cx) / 2} cy={(ay + cy) / 2}
                r={isHovered ? 1.8 : 1.2} fill={color} opacity={isHovered ? 1 : 0.6} />
            </g>
          );
        })}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>
      <div className="relative grid grid-cols-3 gap-1.5 p-1.5 w-full h-full" style={{ zIndex: 1 }}>
        {GRID_LAYOUT.flat().map(num => {
          const count = gridCounts[num] || 0;
          const hasNum = count > 0;
          const isInHoveredLine = hoveredLine
            ? activeGridLines.find(l => l.id === hoveredLine)?.numbers.includes(num as 1|2|3|4|5|6|7|8|9)
            : false;
          return (
            <div
              key={num}
              className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                isInHoveredLine ? 'scale-105' : hasNum ? '' : 'opacity-40'
              }`}
              style={{
                background: hasNum
                  ? isInHoveredLine
                    ? `radial-gradient(circle at 35% 30%, ${LINE_COLORS[hoveredLine!] || '#fbbf24'}33, ${LINE_COLORS[hoveredLine!] || '#fbbf24'}11)`
                    : 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.02)',
                border: hasNum
                  ? isInHoveredLine
                    ? `1px solid ${LINE_COLORS[hoveredLine!] || '#fbbf24'}60`
                    : '1px solid rgba(255,255,255,0.12)'
                  : '1px dashed rgba(255,255,255,0.06)',
                boxShadow: isInHoveredLine
                  ? `0 0 16px ${LINE_COLORS[hoveredLine!] || '#fbbf24'}30`
                  : hasNum ? '0 0 8px rgba(251,191,36,0.08)' : 'none',
              }}
            >
              <span className={`text-base font-bold font-serif transition-colors duration-200 ${
                hasNum ? isInHoveredLine ? 'text-white' : 'text-gold-400' : 'text-gray-700'
              }`}>{num}</span>
              {hasNum && count > 1 && (
                <span className="text-[9px] font-medium mt-0.5 transition-colors duration-200"
                  style={{ color: isInHoveredLine ? LINE_COLORS[hoveredLine!] || '#fbbf24' : 'rgba(251,191,36,0.5)' }}>
                  ×{count}
                </span>
              )}
              {!hasNum && <span className="text-[8px] text-gray-700 mt-0.5">缺</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineCard({ line, isExpanded, onToggle, onHover, onLeave, tier, onUpgrade }: {
  line: GridLine;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: () => void;
  onLeave: () => void;
  tier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
}) {
  const color = LINE_COLORS[line.id] || '#fbbf24';

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        border: isExpanded ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.06)',
        background: isExpanded ? `linear-gradient(135deg, ${color}08, ${color}03)` : 'rgba(255,255,255,0.02)',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <div
          className="flex items-center gap-1 flex-shrink-0 rounded-xl px-2.5 py-1.5"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          {line.numbers.map((n, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-sm font-bold font-serif" style={{ color }}>{n}</span>
              {i < 2 && <span style={{ color: `${color}40` }} className="text-xs">—</span>}
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: `${color}20`, color }}>
              {line.tag}
            </span>
            <span className="text-sm font-medium" style={{ color: '#e9d5ff' }}>{line.name}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(167,139,250,0.45)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(167,139,250,0.45)' }} />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-6 space-y-5 border-t" style={{ borderColor: `${color}15` }}>

          {/* Soul Blueprint — always visible (free preview) */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'rgba(196,181,253,0.45)' }}>靈魂藍圖與脈輪狀態</p>
            </div>
            <p className="text-sm leading-[1.95] pl-3 border-l" style={{ color: '#e9d5ff', borderColor: `${color}25` }}>
              {line.soulBlueprint}
            </p>
          </div>

          <div className="h-px" style={{ background: `linear-gradient(to right, ${color}25, transparent)` }} />

          {/* Crystal Prescription + Ritual — gated (tier 1) */}
          <ContentGate currentTier={tier} requiredTier={1} onUpgrade={onUpgrade} accentColor={color} previewHeight={150}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gem className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>高頻水晶處方</p>
              </div>
              <p className="text-sm leading-[1.95] pl-3 border-l" style={{ color: '#e9d5ff', borderColor: `${color}25` }}>
                {line.crystalPrescription}
              </p>
              <div className="flex items-center gap-2 flex-wrap pl-3 pt-1">
                {line.crystals.map(c => (
                  <span key={c} className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-medium"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}28` }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    {c}
                  </span>
                ))}
                <span className="text-[10px] rounded-full px-2.5 py-1.5"
                  style={{ background: `${color}0c`, color: `${color}99`, border: `1px solid ${color}18` }}>
                  {line.crystalEnergy}
                </span>
              </div>
            </div>

            <div className="h-px my-5" style={{ background: `linear-gradient(to right, ${color}25, transparent)` }} />

            <div className="rounded-2xl p-5 space-y-3" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>
                  專屬光體能量修復儀式
                </p>
              </div>
              <p className="text-sm leading-[1.95]" style={{ color: '#e9d5ff' }}>{line.ritual}</p>
            </div>
          </ContentGate>
        </div>
      )}
    </div>
  );
}

export default function GridLines({ report, tier, onUpgrade }: Props) {
  const [expanded, setExpanded] = useState<string | null>(report.activeGridLines[0]?.id ?? null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeCount = report.activeGridLines.length;
  const totalLines = 8;

  return (
    <div
      className="rounded-3xl p-6 space-y-6"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>九宮格能量連線解析</h3>
          </div>
          <p className="text-xs" style={{ color: 'rgba(196,181,253,0.45)' }}>
            根據你的生命密碼，共啟動{' '}
            <span className="font-medium" style={{ color: '#fbbf24' }}>{activeCount}</span>
            {' '}/ {totalLines} 條能量連線
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <div className="flex gap-1">
            {Array.from({ length: totalLines }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm transition-all duration-300"
                style={{
                  background: i < activeCount ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                  boxShadow: i < activeCount ? '0 0 6px rgba(251,191,36,0.5)' : 'none',
                }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'rgba(196,181,253,0.35)' }}>能量啟動率 {Math.round(activeCount / totalLines * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <GridVisual report={report} hoveredLine={hovered ?? expanded} />
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(196,181,253,0.35)' }}>已啟動連線</p>
          {report.activeGridLines.length === 0 ? (
            <p className="text-sm text-gray-500">目前尚無完整連線，可透過水晶能量補充缺失數字的振頻。</p>
          ) : (
            <div className="space-y-1.5">
              {report.activeGridLines.map(line => {
                const color = LINE_COLORS[line.id] || '#fbbf24';
                return (
                  <button
                    key={line.id}
                    onClick={() => setExpanded(expanded === line.id ? null : line.id)}
                    onMouseEnter={() => setHovered(line.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-200 hover:bg-white/4"
                    style={{
                      background: expanded === line.id ? `${color}10` : undefined,
                      border: expanded === line.id ? `1px solid ${color}25` : '1px solid transparent',
                    }}
                  >
                    <Zap className="w-3 h-3 flex-shrink-0" style={{ color }} />
                    <span className="text-xs flex-1" style={{ color: 'rgba(233,213,255,0.75)' }}>{line.name}</span>
                    <span className="text-[9px] rounded-full px-2 py-0.5" style={{ background: `${color}15`, color }}>
                      {line.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {report.activeGridLines.length < totalLines && (
            <div className="pt-2 border-t border-white/5 space-y-1">
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(196,181,253,0.35)' }}>未啟動連線</p>
              {[...Array(8)].map((_, i) => {
                const allLines = ['1-2-3','4-5-6','7-8-9','1-4-7','2-5-8','3-6-9','1-5-9','3-5-7'];
                const lineId = allLines[i];
                if (report.activeGridLines.find(l => l.id === lineId)) return null;
                const color = LINE_COLORS[lineId];
                return (
                  <div key={lineId} className="flex items-center gap-2 px-3 py-1 opacity-40">
                    <div className="w-3 h-3 rounded-sm border border-dashed flex-shrink-0" style={{ borderColor: color }} />
                    <span className="text-[10px] text-gray-600">{lineId.replace(/-/g, '–')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {report.activeGridLines.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-widest pb-1">連線詳細解析</p>
          {report.activeGridLines.map(line => (
            <LineCard
              key={line.id}
              line={line}
              isExpanded={expanded === line.id}
              onToggle={() => setExpanded(expanded === line.id ? null : line.id)}
              onHover={() => setHovered(line.id)}
              onLeave={() => setHovered(null)}
              tier={tier}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>
      )}
    </div>
  );
}
