import { useState } from 'react';
import { Gem, Lock, Sparkles, X, Check } from 'lucide-react';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  onClose: () => void;
  onConfirm: (tier: PlanTier) => void;
  defaultTier?: PlanTier;
  currentTier: PlanTier;
}

const plans: {
  tier: PlanTier;
  name: string;
  price: string;
  color: string;
  features: string[];
  locked: string[];
}[] = [
  {
    tier: 1,
    name: '基礎版',
    price: 'NT$250',
    color: '#60a5fa',
    features: [
      '完整生命靈數解析',
      '缺失數字 × 水晶療癒方案',
    ],
    locked: [
      '靈魂藍圖 × 當下能量交叉指引',
      '當下靈數卡關點揭示',
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
  },
  {
    tier: 2,
    name: '進階版',
    price: 'NT$399',
    color: '#a78bfa',
    features: [
      '完整生命靈數解析',
      '缺失數字 × 水晶療癒方案',
      '靈魂藍圖 × 當下能量交叉指引',
      '當下靈數卡關點揭示',
    ],
    locked: [
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
  },
  {
    tier: 3,
    name: '完整靈魂版',
    price: 'NT$599',
    color: '#fbbf24',
    features: [
      '完整生命靈數解析',
      '缺失數字 × 水晶療癒方案',
      '靈魂藍圖 × 當下能量交叉指引',
      '當下靈數卡關點揭示',
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
    locked: [],
  },
];

export default function UpgradeModal({ onClose, onConfirm, defaultTier = 2, currentTier }: Props) {
  const [selected, setSelected] = useState<PlanTier>(
    defaultTier > currentTier ? defaultTier : Math.min(defaultTier + 1, 3) as PlanTier
  );

  const plan = plans.find(p => p.tier === selected)!;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7,4,15,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      } as React.CSSProperties}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 24,
          overflow: 'hidden',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 80px rgba(109,40,217,0.15)',
        }}
      >
        {/* Top strip */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, transparent, #7c3aed, #a78bfa, #fbbf24, #a78bfa, #7c3aed, transparent)',
        }} />

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(196,181,253,0.5)',
              touchAction: 'manipulation',
            } as React.CSSProperties}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{
                position: 'absolute',
                width: 90, height: 90,
                background: 'radial-gradient(circle, rgba(109,40,217,0.25) 0%, transparent 70%)',
                filter: 'blur(20px)',
                animation: 'breathe 4s ease-in-out infinite',
              }} />
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.25), rgba(96,165,250,0.08))',
                border: '1px solid rgba(167,139,250,0.3)',
                boxShadow: '0 0 28px rgba(109,40,217,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <Gem style={{ width: 24, height: 24, color: '#c4b5fd' }} />
              </div>
            </div>
            <h2 style={{
              margin: '0 0 6px',
              fontFamily: 'Playfair Display, serif', fontSize: 19,
              background: 'linear-gradient(135deg, #a78bfa, #c4b5fd, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            } as React.CSSProperties}>
              選擇你的靈魂解析方案
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(196,181,253,0.55)', lineHeight: 1.6 }}>
              選擇方案，解鎖你靈魂藍圖的完整詮釋
            </p>
          </div>

          {/* Plan selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plans.map(p => {
              const isActive = selected === p.tier;
              const isOwned = currentTier >= p.tier;
              return (
                <button
                  key={p.tier}
                  onClick={() => !isOwned && setSelected(p.tier)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: isActive
                      ? `1.5px solid ${p.color}55`
                      : '1px solid rgba(255,255,255,0.07)',
                    background: isActive
                      ? `linear-gradient(135deg, ${p.color}10, ${p.color}04)`
                      : 'rgba(255,255,255,0.02)',
                    cursor: isOwned ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s',
                    opacity: isOwned ? 0.55 : 1,
                    touchAction: 'manipulation',
                  } as React.CSSProperties}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isActive ? p.color : 'rgba(255,255,255,0.15)',
                        boxShadow: isActive ? `0 0 8px ${p.color}80` : 'none',
                        flexShrink: 0,
                        transition: 'all 0.18s',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? p.color : '#e9d5ff' }}>
                        {p.name}
                      </span>
                      {isOwned && (
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 999,
                          background: 'rgba(255,255,255,0.08)', color: 'rgba(196,181,253,0.5)',
                        }}>已擁有</span>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? p.color : 'rgba(196,181,253,0.55)' }}>
                      {p.price}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check style={{ width: 10, height: 10, color: p.color, opacity: 0.8, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'rgba(196,181,253,0.6)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm button */}
          <button
            onClick={() => onConfirm(selected)}
            style={{
              width: '100%', padding: 13,
              borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${plan.color}cc, ${plan.color}88)`,
              color: '#07040f', fontSize: 15, fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer', touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 4px 20px ${plan.color}40`,
            } as React.CSSProperties}
          >
            <Sparkles style={{ width: 15, height: 15 }} />
            立即解鎖 — {plan.name} {plan.price}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(167,139,250,0.15)',
              background: 'transparent',
              color: 'rgba(196,181,253,0.4)', fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer', touchAction: 'manipulation',
              marginTop: -8,
            } as React.CSSProperties}
          >
            稍後再說
          </button>

          <p style={{ margin: 0, fontSize: 11, color: 'rgba(167,139,250,0.28)', textAlign: 'center', lineHeight: 1.5 }}>
            <Lock style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            示範模式：點擊解鎖即可體驗對應方案內容
          </p>
        </div>
      </div>
    </div>
  );
}
