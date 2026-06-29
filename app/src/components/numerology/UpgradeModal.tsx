import { useState } from 'react';
import { Gem, Sparkles, X, Check, Minus, Star } from 'lucide-react';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  onClose: () => void;
  onConfirm: (tier: PlanTier) => void;
  onEmailUnlock?: (email: string) => Promise<void>;
  defaultTier?: PlanTier;
  currentTier: PlanTier;
}

type PlanKey = 'healing' | 'forecast' | 'full';

const PLANS: Record<PlanKey, {
  tier: PlanTier;
  name: string;
  price: string;
  priceNum: string;
  color: string;
  badge?: string;
  badgeIcon?: string;
  featured?: boolean;
  includes: string[];
  excludes: string[];
  buttonLabel: string;
}> = {
  healing: {
    tier: 2,
    name: '缺失數字療癒版',
    price: 'NT$199',
    priceNum: '199',
    color: '#5eead4',
    includes: [
      '缺失數字完整分析（100%）',
      '缺失能量解析',
      '性格盲點分析',
      '人生課題分析',
      '水晶療癒方案（100%）',
      '專屬推薦水晶',
      '水晶配戴建議',
      '能量平衡建議',
    ],
    excludes: [
      '流年完整報告',
      '靈魂藍圖',
      '當下能量交叉指引',
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
    buttonLabel: '立即解鎖 NT$199',
  },
  forecast: {
    tier: 2,
    name: '流年完整報告',
    price: 'NT$499',
    priceNum: '499',
    color: '#fbbf24',
    includes: [
      '流年運勢完整報告',
      '流年守護水晶',
      '流年財運分析',
      '流年事業分析',
      '流年感情分析',
      '流年挑戰與機會',
      '流年能量提升建議',
    ],
    excludes: [
      '缺失數字完整分析',
      '水晶療癒方案',
      '靈魂藍圖',
      '當下能量交叉指引',
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
    buttonLabel: '立即解鎖流年報告 NT$499',
  },
  full: {
    tier: 3,
    name: '完整靈魂版',
    price: 'NT$599',
    priceNum: '599',
    color: '#fbbf24',
    badge: '最多人選擇',
    badgeIcon: '🔥',
    featured: true,
    includes: [
      '缺失數字完整分析（100%）',
      '水晶療癒方案（100%）',
      '靈魂藍圖',
      '當下能量交叉指引',
      '神聖水晶陣指引',
      '靜心冥想儀式指引',
    ],
    excludes: [
      '流年完整報告（獨立商品 NT$499）',
    ],
    buttonLabel: '立即解鎖完整靈魂版 NT$599',
  },
};

const COMPARE_ROWS = [
  { label: '缺失數字完整分析', healing: true,  forecast: false, full: true  },
  { label: '水晶療癒方案',      healing: true,  forecast: false, full: true  },
  { label: '流年完整報告',      healing: false, forecast: true,  full: false },
  { label: '流年守護水晶',      healing: false, forecast: true,  full: false },
  { label: '靈魂藍圖',          healing: false, forecast: false, full: true  },
  { label: '當下能量交叉指引',  healing: false, forecast: false, full: true  },
  { label: '神聖水晶陣指引',    healing: false, forecast: false, full: true  },
  { label: '靜心冥想儀式指引',  healing: false, forecast: false, full: true  },
];

export default function UpgradeModal({ onClose, onConfirm, currentTier: _currentTier }: Props) {
  const [selected, setSelected] = useState<PlanKey>('full');
  const activePlan = PLANS[selected];

  const colColors: Record<PlanKey, string> = {
    healing: '#5eead4',
    forecast: '#fbbf24',
    full: '#fbbf24',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7,4,15,0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      } as React.CSSProperties}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          marginTop: 20, marginBottom: 20,
          background: 'linear-gradient(160deg, rgba(18,9,38,0.99), rgba(8,4,20,0.99))',
          border: '1px solid rgba(167,139,250,0.20)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 0 80px rgba(109,40,217,0.10)',
        }}
      >
        {/* Top strip */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, transparent, #7c3aed, #a78bfa, #fbbf24, #a78bfa, #7c3aed, transparent)',
        }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.2), rgba(96,165,250,0.06))',
              border: '1px solid rgba(167,139,250,0.25)',
              boxShadow: '0 0 20px rgba(109,40,217,0.18)',
            }}>
              <Gem style={{ width: 18, height: 18, color: '#c4b5fd' }} />
            </div>
            <div>
              <h2 style={{
                margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 17,
                background: 'linear-gradient(135deg, #a78bfa, #c4b5fd, #fbbf24)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              } as React.CSSProperties}>
                解鎖你的靈魂藍圖
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(196,181,253,0.45)' }}>選擇最適合你的探索深度</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(196,181,253,0.5)',
            } as React.CSSProperties}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        <div style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Plan Cards ─────────────────────────────────────────── */}
          {/* Featured plan (NT$599) on top, full width */}
          <PlanCard
            planKey="full"
            plan={PLANS.full}
            selected={selected === 'full'}
            onSelect={() => setSelected('full')}
          />

          {/* Two smaller plans side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PlanCard
              planKey="healing"
              plan={PLANS.healing}
              selected={selected === 'healing'}
              onSelect={() => setSelected('healing')}
              compact
            />
            <PlanCard
              planKey="forecast"
              plan={PLANS.forecast}
              selected={selected === 'forecast'}
              onSelect={() => setSelected('forecast')}
              compact
            />
          </div>

          {/* ── Feature detail for selected plan ─────────────────── */}
          <div style={{
            borderRadius: 14,
            border: `1px solid ${activePlan.color}20`,
            background: `linear-gradient(135deg, ${activePlan.color}07, ${activePlan.color}02)`,
            padding: '14px 16px',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: activePlan.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activePlan.name} · 解鎖內容
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 10 }}>
              {activePlan.includes.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Check style={{ width: 11, height: 11, color: activePlan.color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 11, color: 'rgba(233,213,255,0.75)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
            {activePlan.excludes.length > 0 && (
              <>
                <div style={{ height: 1, background: `${activePlan.color}15`, margin: '8px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
                  {activePlan.excludes.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Minus style={{ width: 10, height: 10, color: 'rgba(196,181,253,0.25)', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 10, color: 'rgba(196,181,253,0.35)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Comparison Table ──────────────────────────────────── */}
          <div style={{
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.07)',
            overflow: 'hidden',
            fontSize: 11,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 52px 52px 52px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: 'rgba(196,181,253,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>功能</span>
              <span style={{ textAlign: 'center', color: '#5eead4', fontWeight: 700, fontSize: 10 }}>199</span>
              <span style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700, fontSize: 10 }}>499</span>
              <span style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700, fontSize: 10 }}>599</span>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 52px 52px 52px',
                  padding: '6px 12px',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <span style={{ color: 'rgba(196,181,253,0.65)', fontSize: 11 }}>{row.label}</span>
                <span style={{ textAlign: 'center' }}>
                  {row.healing
                    ? <Check style={{ width: 12, height: 12, color: colColors.healing, display: 'inline' }} />
                    : <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>—</span>}
                </span>
                <span style={{ textAlign: 'center' }}>
                  {row.forecast
                    ? <Check style={{ width: 12, height: 12, color: colColors.forecast, display: 'inline' }} />
                    : <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>—</span>}
                </span>
                <span style={{ textAlign: 'center' }}>
                  {row.full
                    ? <Check style={{ width: 12, height: 12, color: '#fbbf24', display: 'inline' }} />
                    : <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>—</span>}
                </span>
              </div>
            ))}
          </div>

          {/* ── Confirm button ───────────────────────────────────── */}
          <button
            onClick={() => onConfirm(activePlan.tier)}
            style={{
              width: '100%', padding: 14,
              borderRadius: 13, border: selected === 'full' ? `1px solid ${activePlan.color}55` : 'none',
              background: selected === 'full'
                ? `linear-gradient(135deg, ${activePlan.color}ee, ${activePlan.color}aa)`
                : `linear-gradient(135deg, ${activePlan.color}cc, ${activePlan.color}88)`,
              color: '#07040f', fontSize: 15, fontWeight: 800,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: selected === 'full'
                ? `0 6px 32px ${activePlan.color}55, 0 0 60px ${activePlan.color}18`
                : `0 4px 20px ${activePlan.color}40`,
              transition: 'all 0.2s',
              letterSpacing: '0.01em',
            } as React.CSSProperties}
          >
            <Sparkles style={{ width: 15, height: 15 }} />
            {activePlan.buttonLabel}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid rgba(167,139,250,0.12)',
              background: 'transparent',
              color: 'rgba(196,181,253,0.35)', fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer', touchAction: 'manipulation',
              marginTop: -6,
            } as React.CSSProperties}
          >
            稍後再說
          </button>

          <p style={{ margin: 0, fontSize: 10, color: 'rgba(167,139,250,0.22)', textAlign: 'center', lineHeight: 1.5 }}>
            示範模式：點擊解鎖即可體驗對應方案內容
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  planKey: _planKey,
  plan,
  selected,
  onSelect,
  compact = false,
}: {
  planKey: PlanKey;
  plan: typeof PLANS[PlanKey];
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const isFeatured = plan.featured;

  const borderStyle = isFeatured
    ? selected
      ? `2px solid ${plan.color}bb`
      : `1.5px solid ${plan.color}55`
    : selected
      ? `1.5px solid ${plan.color}60`
      : '1px solid rgba(255,255,255,0.08)';

  const bgStyle = isFeatured
    ? selected
      ? `linear-gradient(135deg, rgba(251,191,36,0.13), rgba(251,191,36,0.04))`
      : `linear-gradient(135deg, rgba(251,191,36,0.07), rgba(251,191,36,0.02))`
    : selected
      ? `linear-gradient(135deg, ${plan.color}12, ${plan.color}04)`
      : 'rgba(255,255,255,0.02)';

  const glow = isFeatured
    ? selected
      ? `0 0 0 1px ${plan.color}30, 0 4px 24px ${plan.color}25`
      : `0 0 0 1px ${plan.color}18`
    : 'none';

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        padding: compact ? '13px 12px' : '16px 16px',
        borderRadius: 16,
        textAlign: 'left',
        border: borderStyle,
        background: bgStyle,
        boxShadow: glow,
        cursor: 'pointer',
        transition: 'all 0.18s',
        touchAction: 'manipulation',
        position: 'relative',
      } as React.CSSProperties}
    >
      {/* Featured glow overlay */}
      {isFeatured && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 15, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 0%, ${plan.color}12 0%, transparent 65%)`,
        }} />
      )}

      {/* Badges */}
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 999,
          background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
          color: '#07040f', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
          whiteSpace: 'nowrap', boxShadow: `0 2px 12px ${plan.color}50`,
        }}>
          {plan.badgeIcon && <span style={{ fontSize: 10 }}>{plan.badgeIcon}</span>}
          {plan.badge}
        </div>
      )}

      {/* Top row: radio dot + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? 6 : 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', marginTop: 4,
          background: selected ? plan.color : 'rgba(255,255,255,0.15)',
          boxShadow: selected ? `0 0 8px ${plan.color}bb` : 'none',
          flexShrink: 0, transition: 'all 0.18s',
        }} />
        <span style={{
          fontSize: isFeatured ? 22 : 16, fontWeight: 800,
          color: selected ? plan.color : `${plan.color}80`,
          textShadow: selected && isFeatured ? `0 0 20px ${plan.color}55` : 'none',
          transition: 'all 0.18s',
          fontFamily: 'Inter, sans-serif',
        }}>
          {plan.price}
        </span>
      </div>

      {/* Plan name */}
      <p style={{
        margin: compact ? '0 0 4px' : '0 0 6px',
        fontSize: compact ? 12 : 14, fontWeight: 700,
        color: selected ? (isFeatured ? '#fde68a' : '#e9d5ff') : 'rgba(196,181,253,0.6)',
        lineHeight: 1.3,
      }}>
        {plan.name}
      </p>

      {/* Star badge for featured */}
      {isFeatured && !compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star style={{ width: 10, height: 10, color: plan.color, fill: plan.color }} />
          <span style={{ fontSize: 10, color: `${plan.color}bb`, fontWeight: 600 }}>最超值</span>
        </div>
      )}
    </button>
  );
}
