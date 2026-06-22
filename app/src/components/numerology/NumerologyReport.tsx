import { useState } from 'react';
import { Gem, Heart, DollarSign, Star, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { NumerologyReport as Report, OracleCard } from '../../lib/numerology';
import { missingNumberData, lifePathCrystals } from '../../lib/numerology';
import CrystalBracelet from './CrystalBracelet';
import GridLines from './GridLines';
import OracleReading from './OracleReading';
import ContentGate from './ContentGate';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  report: Report;
  oracleCard?: OracleCard | null;
  onReset: () => void;
  tier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-4 space-y-2 transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#e9d5ff' }}>{value}</p>
    </div>
  );
}

function CrystalChip({ name, nameZh, hex }: { name: string; nameZh: string; hex: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }} />
      <span className="font-medium" style={{ color: '#e9d5ff' }}>{nameZh}</span>
      <span className="text-xs" style={{ color: 'rgba(196,181,253,0.45)' }}>{name}</span>
    </div>
  );
}

export default function NumerologyReport({ report, oracleCard, onReset, tier, onUpgrade }: Props) {
  const [expandedMissing, setExpandedMissing] = useState<number | null>(null);

  const lpCrystals = lifePathCrystals[report.lifePathNumber] || [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Life Path Hero */}
      <div
        className="rounded-3xl p-6 md:p-8 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.10) 0%, transparent 60%)' }}
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(251,191,36,0.55)' }}>生命靈數</p>
          <div className="relative inline-flex items-center justify-center mb-4" style={{ width: 120, height: 120 }}>
            <div
              className="absolute inset-0 rounded-full animate-breathe-ring"
              style={{
                background: `radial-gradient(circle, ${report.chakraColor}28 0%, transparent 70%)`,
                boxShadow: `0 0 60px ${report.chakraColor}35`,
              }}
            />
            <div
              className="absolute rounded-full animate-breathe-slow"
              style={{ width: 110, height: 110, border: `1px solid ${report.chakraColor}38` }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-serif font-bold text-obsidian-950 animate-breathe"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${report.chakraColor}, ${report.chakraColor}bb)`,
                boxShadow: `0 0 40px ${report.chakraColor}70, 0 0 80px ${report.chakraColor}28, inset 0 1px 3px rgba(255,255,255,0.25)`,
              }}
            >
              {report.lifePathNumber}
            </div>
          </div>
          <h2 className="font-serif text-2xl text-gradient-gold mb-3">{report.personality}</h2>
          <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'rgba(233,213,255,0.75)' }}>{report.lifePathDescription}</p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {lpCrystals.map(c => <CrystalChip key={c.nameZh} {...c} />)}
          </div>
        </div>
      </div>

      {/* Digit grid */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'rgba(196,181,253,0.45)' }}>生命靈數方格</h3>
        <div className="grid grid-cols-9 gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const count = report.digits.filter(d => d === n).length;
            const missing = !report.digits.includes(n);
            return (
              <div
                key={n}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
                style={missing ? {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(167,139,250,0.15)',
                } : {
                  background: 'rgba(167,139,250,0.12)',
                  border: '1px solid rgba(167,139,250,0.28)',
                  boxShadow: '0 0 10px rgba(167,139,250,0.10)',
                }}
              >
                <span className="text-sm font-bold" style={{ color: missing ? 'rgba(167,139,250,0.25)' : '#c4b5fd' }}>{n}</span>
                {!missing && <span className="text-[8px]" style={{ color: 'rgba(196,181,253,0.45)' }}>×{count}</span>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)' }} />
            已有能量
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(167,139,250,0.15)' }} />
            缺失能量
          </span>
        </div>
      </div>

      {/* Soul Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard icon={<Heart className="w-4 h-4" />} label="情感模式" value={report.emotionalPattern} color="#fda4af" />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="財運能量" value={report.wealthEnergy} color="#fbbf24" />
        <StatCard icon={<Star className="w-4 h-4" />} label="靈魂課題" value={report.soulLesson} color="#a78bfa" />
        <StatCard icon={<Zap className="w-4 h-4" />} label="對應脈輪" value={report.chakra} color={report.chakraColor} />
      </div>

      {/* Grid Lines */}
      <GridLines report={report} tier={tier} onUpgrade={onUpgrade} />

      {/* Missing Numbers */}
      {report.missingNumbers.length > 0 && (
        <div
          className="rounded-3xl p-6 space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Gem className="w-4 h-4" style={{ color: '#5eead4' }} />
            <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>缺失數字 × 水晶療癒方案</h3>
          </div>
          <div className="space-y-3">
            {report.missingNumbers.map(n => {
              const data = missingNumberData[n];
              if (!data) return null;
              const isOpen = expandedMissing === n;
              return (
                <div
                  key={n}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <button
                    onClick={() => setExpandedMissing(isOpen ? null : n)}
                    className="w-full flex items-center gap-3 p-4 text-left transition-colors"
                    style={{ background: 'transparent' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(167,139,250,0.12)',
                        border: '1px solid rgba(167,139,250,0.22)',
                      }}
                    >
                      <span className="font-bold text-sm" style={{ color: '#c4b5fd' }}>{n}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#e9d5ff' }}>缺失數字 {n}・{data.challenge}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.45)' }}>{data.traits.slice(0, 2).join('・')}</p>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(167,139,250,0.45)' }} />
                      : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(167,139,250,0.45)' }} />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 space-y-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Trait tags */}
                      <div className="flex flex-wrap gap-2">
                        {data.traits.map(t => (
                          <span
                            key={t}
                            className="text-xs rounded-full px-3 py-1"
                            style={{
                              background: 'rgba(167,139,250,0.08)',
                              border: '1px solid rgba(167,139,250,0.15)',
                              color: 'rgba(196,181,253,0.7)',
                            }}
                          >{t}</span>
                        ))}
                      </div>

                      {/* Blind Spot */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ background: 'rgba(251,191,36,0.6)' }} />
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'rgba(196,181,253,0.45)' }}>能量盲點</p>
                        </div>
                        <p className="text-sm leading-[1.9] pl-3 border-l" style={{ color: '#e9d5ff', borderColor: 'rgba(251,191,36,0.2)' }}>
                          {data.blindspot}
                        </p>
                      </div>

                      <div className="divider-gold" />

                      {/* Crystal Fix + Affirmation — gated */}
                      <ContentGate currentTier={tier} requiredTier={1} onUpgrade={onUpgrade} accentColor="#5eead4" previewHeight={140}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Gem className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5eead4' }} />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#5eead4' }}>高頻水晶修復方案</p>
                          </div>
                          <p className="text-sm leading-[1.9] pl-3 border-l" style={{ color: '#e9d5ff', borderColor: 'rgba(94,234,212,0.2)' }}>
                            {data.crystalFix}
                          </p>
                          <div className="space-y-3 pl-3 pt-1">
                            {data.crystals.map(c => (
                              <div
                                key={c.nameZh}
                                className="rounded-xl p-4 space-y-2"
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  backdropFilter: 'blur(8px)',
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-9 h-9 rounded-lg flex-shrink-0"
                                    style={{
                                      background: `radial-gradient(circle at 30% 30%, ${c.hex}cc, ${c.hex}44)`,
                                      boxShadow: `0 0 14px ${c.hex}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium" style={{ color: '#e9d5ff' }}>
                                      {c.nameZh}
                                      <span className="font-normal text-xs ml-1.5" style={{ color: 'rgba(196,181,253,0.45)' }}>{c.name}</span>
                                    </p>
                                    <p className="text-xs leading-snug" style={{ color: 'rgba(233,213,255,0.6)' }}>{c.energy}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(196,181,253,0.35)' }}>{c.chakra}</p>
                                  </div>
                                </div>
                                {c.reason && (
                                  <p className="text-xs leading-relaxed border-l-2 pl-3" style={{ color: 'rgba(233,213,255,0.55)', borderColor: `${c.hex}50` }}>
                                    {c.reason}
                                  </p>
                                )}
                                {c.usage && (
                                  <div className="rounded-lg p-2.5" style={{ background: `${c.hex}08`, border: `1px solid ${c.hex}18` }}>
                                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: `${c.hex}aa` }}>建議使用方式</p>
                                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(233,213,255,0.65)' }}>{c.usage}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          className="rounded-xl p-4 mt-4"
                          style={{
                            background: 'rgba(251,191,36,0.05)',
                            border: '1px solid rgba(251,191,36,0.18)',
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(251,191,36,0.6)' }}>能量宣言</p>
                          <p className="text-sm italic leading-relaxed" style={{ color: '#e9d5ff' }}>「{data.affirmation}」</p>
                        </div>
                      </ContentGate>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Oracle Cross Analysis */}
      {oracleCard && (
        <OracleReading report={report} card={oracleCard} tier={tier} onUpgrade={onUpgrade} />
      )}

      {/* Crystal Bracelet Recommendation */}
      <CrystalBracelet report={report} />

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl text-sm transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(196,181,253,0.45)',
        }}
      >
        重新輸入生日
      </button>
    </div>
  );
}
