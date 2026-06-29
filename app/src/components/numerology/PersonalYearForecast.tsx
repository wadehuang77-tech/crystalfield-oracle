import { useState } from 'react';
import { Sun, Briefcase, Heart, Sparkles, AlertTriangle, Gem, ChevronDown, ChevronUp, Lock, Check } from 'lucide-react';
import type { NumerologyReport } from '../../lib/numerology';
import { getPersonalYearData } from '../../lib/numerology';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  report: NumerologyReport;
  tier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
  forecastUnlocked: boolean;
  onForecastUnlock: () => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  career:   <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />,
  love:     <Heart className="w-3.5 h-3.5 flex-shrink-0" />,
  spiritual:<Sparkles className="w-3.5 h-3.5 flex-shrink-0" />,
  warning:  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />,
};

const SECTION_LABELS: Record<string, string> = {
  career:   '財運・事業運勢',
  love:     '感情・人際能量',
  spiritual:'靈性成長指引',
  warning:  '今年能量陷阱',
};

const UNLOCK_FEATURES = [
  '完整年度運勢解析',
  '專屬流年守護水晶',
  '財運與事業發展建議',
  '感情與人際關係提醒',
  '年度能量提升指南',
  '靈性成長方向建議',
];

const LOCKED_PREVIEW_ITEMS = [
  { icon: <Briefcase className="w-3 h-3" />, label: '完整流年運勢' },
  { icon: <Gem className="w-3 h-3" />, label: '流年守護水晶' },
  { icon: <Sun className="w-3 h-3" />, label: '年度能量提升建議' },
  { icon: <Heart className="w-3 h-3" />, label: '財運、事業、感情完整解析' },
];

function QuarterCard({ quarter, color }: { quarter: { label: string; energy: string; focus: string }; color: string }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: `${color}06`, border: `1px solid ${color}18` }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold" style={{ color }}>{quarter.label}</span>
        <span
          className="text-[10px] rounded-full px-2 py-0.5 font-medium"
          style={{ background: `${color}15`, color, border: `1px solid ${color}28` }}
        >
          {quarter.energy}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(233,213,255,0.65)' }}>{quarter.focus}</p>
    </div>
  );
}

export default function PersonalYearForecast({ report, tier, onUpgrade: _onUpgrade, forecastUnlocked, onForecastUnlock }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const data = getPersonalYearData(report.personalYearNumber);
  const color = data.color;
  const CURRENT_YEAR = 2026;
  const sections = ['career', 'love', 'spiritual', 'warning'] as const;
  const showFull = forecastUnlocked || tier >= 3;

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${color}20`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 60px ${color}08`,
      }}
    >
      {/* Top accent strip */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, transparent, ${color}80, ${color}, ${color}80, transparent)`,
      }} />

      <div className="p-6 space-y-5">

        {/* Hero Header — always free */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full animate-breathe-ring"
              style={{
                background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                filter: 'blur(8px)',
              }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
              style={{
                background: `radial-gradient(circle at 30% 25%, ${color}cc, ${color}55)`,
                boxShadow: `0 0 30px ${color}45, inset 0 1px 3px rgba(255,255,255,0.2)`,
              }}
            >
              <span className="font-serif font-bold text-2xl text-obsidian-950">{data.number}</span>
              <span className="text-[8px] text-obsidian-950 font-semibold opacity-70">流年</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
              >
                {CURRENT_YEAR} 流年運勢
              </span>
              {!showFull && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 999, background: `${color}12`,
                  border: `1px solid ${color}25`, color,
                }}>25% 免費</span>
              )}
            </div>
            <h3 className="font-serif text-xl font-semibold mb-1" style={{ color }}>
              {data.keyword}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{data.theme}</p>
          </div>
        </div>

        {/* Overview — always free */}
        <div
          className="rounded-2xl p-5"
          style={{ background: `${color}08`, border: `1px solid ${color}18` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>
              {CURRENT_YEAR} 流年能量總覽
            </span>
          </div>
          <p className="text-sm leading-[1.9]" style={{ color: '#e9d5ff' }}>{data.overview}</p>
        </div>

        {/* Progress bar — shown when locked */}
        {!showFull && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 11, color: `${color}cc`, fontWeight: 500 }}>
                您已查看 25% 流年運勢解析
              </p>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>25%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: `${color}14`, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: '25%', borderRadius: 999,
                background: `linear-gradient(90deg, ${color}cc, ${color})`,
                boxShadow: `0 0 10px ${color}55`,
              }} />
            </div>
            <p style={{ margin: '5px 0 0', fontSize: 10, color: `${color}60` }}>
              解鎖完整年度運勢與守護水晶指引
            </p>
          </div>
        )}

        {showFull ? (
          /* ─── Unlocked: full content ─── */
          <>
            {/* Detailed Sections */}
            <div className="space-y-2">
              {sections.map(key => {
                const isOpen = expandedSection === key;
                const sectionColor = key === 'warning' ? '#fca5a5' : color;
                return (
                  <div
                    key={key}
                    className="rounded-2xl overflow-hidden transition-all duration-200"
                    style={{
                      border: isOpen ? `1px solid ${sectionColor}30` : '1px solid rgba(255,255,255,0.07)',
                      background: isOpen ? `${sectionColor}06` : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <button
                      onClick={() => setExpandedSection(isOpen ? null : key)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${sectionColor}15`, border: `1px solid ${sectionColor}25`, color: sectionColor }}
                      >
                        {SECTION_ICONS[key]}
                      </div>
                      <span className="flex-1 text-sm font-medium" style={{ color: '#e9d5ff' }}>
                        {SECTION_LABELS[key]}
                      </span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(167,139,250,0.4)' }} />
                        : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(167,139,250,0.4)' }} />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1" style={{ borderTop: `1px solid ${sectionColor}12` }}>
                        <p className="text-sm leading-[1.9] pt-3" style={{ color: '#e9d5ff' }}>
                          {data[key as 'career' | 'love' | 'spiritual' | 'warning']}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Crystal Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gem className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>
                  {CURRENT_YEAR} 流年守護水晶
                </span>
              </div>
              <div className="space-y-2">
                {data.crystals.map(c => (
                  <div
                    key={c.nameZh}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${c.hex}cc, ${c.hex}44)`,
                        boxShadow: `0 0 12px ${c.hex}35, inset 0 1px 0 rgba(255,255,255,0.2)`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: '#e9d5ff' }}>
                        {c.nameZh}
                        <span className="font-normal text-xs ml-1.5" style={{ color: 'rgba(196,181,253,0.4)' }}>{c.name}</span>
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(233,213,255,0.55)' }}>{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affirmation */}
            <div
              className="rounded-xl p-4"
              style={{ background: `${color}06`, border: `1px solid ${color}20` }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: `${color}80` }}>
                {CURRENT_YEAR} 流年宣言
              </p>
              <p className="text-sm italic leading-relaxed" style={{ color: '#e9d5ff' }}>
                「{data.affirmation}」
              </p>
            </div>

            {/* Quarterly Breakdown */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.35)' }}>
                {CURRENT_YEAR} 季度能量預報
              </p>
              {data.quarters.map(q => (
                <QuarterCard key={q.label} quarter={q} color={color} />
              ))}
            </div>
          </>
        ) : (
          /* ─── Locked: blurred preview + conversion gate ─── */
          <div>
            {/* Locked items teaser grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
              marginBottom: 14,
            }}>
              {LOCKED_PREVIEW_ITEMS.map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 12px', borderRadius: 10,
                  background: `${color}07`,
                  border: `1px solid ${color}18`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${color}12`, border: `1px solid ${color}25`,
                    color,
                  }}>
                    <Lock style={{ width: 10, height: 10 }} />
                  </div>
                  <span style={{ fontSize: 11, color: `${color}90`, fontWeight: 500, lineHeight: 1.3 }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Blurred preview of actual content */}
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', minHeight: 150 }}>
              {/* Blurred content */}
              <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', maxHeight: 200, overflow: 'hidden' }}>
                <div className="space-y-2">
                  {sections.map(key => {
                    const sectionColor = key === 'warning' ? '#fca5a5' : color;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="flex items-center gap-3 p-4">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${sectionColor}15`, border: `1px solid ${sectionColor}25`, color: sectionColor }}
                          >
                            {SECTION_ICONS[key]}
                          </div>
                          <span className="flex-1 text-sm font-medium" style={{ color: '#e9d5ff' }}>
                            {SECTION_LABELS[key]}
                          </span>
                          <ChevronDown className="w-4 h-4" style={{ color: 'rgba(167,139,250,0.4)' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-start gap-3 rounded-xl p-3 mt-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${color}44` }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#e9d5ff' }}>流年守護水晶</p>
                      <p className="text-xs" style={{ color: 'rgba(233,213,255,0.55)' }}>專屬水晶能量加持</p>
                    </div>
                  </div>
                  {data.quarters.slice(0, 2).map(q => (
                    <div key={q.label} className="rounded-xl p-3"
                      style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
                      <span className="text-xs font-semibold" style={{ color }}>{q.label}</span>
                      <p className="text-xs mt-1" style={{ color: 'rgba(233,213,255,0.55)' }}>{q.focus}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(9,5,20,0.20) 0%, rgba(9,5,20,0.70) 45%, rgba(9,5,20,0.97) 100%)',
              }} />

              {/* Lock icon */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -56%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${color}18`,
                  border: `1px solid ${color}38`,
                  boxShadow: `0 0 20px ${color}25`,
                }}>
                  <Lock style={{ width: 18, height: 18, color }} />
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: `${color}cc` }}>
                  完整流年報告已鎖定
                </p>
              </div>
            </div>

            {/* Conversion card */}
            <div style={{
              marginTop: 14,
              borderRadius: 16, padding: '18px',
              background: `linear-gradient(135deg, ${color}08, ${color}03)`,
              border: `1px solid ${color}22`,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>
                  解鎖完整年度流年報告
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: `${color}70` }}>
                  一次付費 NT$499 永久查看
                </p>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 10px',
                marginBottom: 16,
              }}>
                {UNLOCK_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check style={{ width: 11, height: 11, color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(196,181,253,0.68)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={onForecastUnlock}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: 11, border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#ffffff', fontSize: 13, fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: '0 4px 20px rgba(249,115,22,0.45)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  letterSpacing: '0.01em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                } as React.CSSProperties}
              >
                <Lock style={{ width: 13, height: 13 }} />
                立即解鎖完整流年報告 NT$499
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
