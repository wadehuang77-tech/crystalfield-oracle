import { Sun, Check, Sparkles, X, Lock } from 'lucide-react';

const UNLOCK_FEATURES = [
  '完整年度運勢解析',
  '專屬流年守護水晶',
  '財運與事業發展建議',
  '感情與人際關係提醒',
  '年度能量提升指南',
  '靈性成長方向建議',
];

interface Props {
  onClose: () => void;
  onConfirm: () => void;
  yearColor?: string;
  personalYear?: number;
  currentYear?: number;
}

export default function ForecastUnlockModal({
  onClose,
  onConfirm,
  yearColor = '#fbbf24',
  personalYear = 1,
  currentYear = 2026,
}: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7,4,15,0.93)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      } as React.CSSProperties}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          marginTop: 20, marginBottom: 20,
          background: 'linear-gradient(160deg, rgba(14,10,28,0.99), rgba(8,5,18,0.99))',
          border: `1px solid ${yearColor}35`,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: `0 40px 100px rgba(0,0,0,0.75), 0 0 60px ${yearColor}12`,
        }}
      >
        {/* Top accent strip */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${yearColor}80, ${yearColor}, ${yearColor}80, transparent)`,
        }} />

        <div style={{ padding: '24px 24px 28px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle at 35% 30%, ${yearColor}25, ${yearColor}06)`,
                border: `1px solid ${yearColor}35`,
                boxShadow: `0 0 24px ${yearColor}20`,
              }}>
                <Sun style={{ width: 22, height: 22, color: yearColor }} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'Playfair Display, serif', fontSize: 17,
                  color: yearColor,
                  lineHeight: 1.3,
                }}>
                  解鎖完整流年報告
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: `${yearColor}70`, letterSpacing: '0.04em' }}>
                  {currentYear} 年度 · 流年數字 {personalYear}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(196,181,253,0.5)',
              } as React.CSSProperties}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Price block */}
          <div style={{
            borderRadius: 18, padding: '20px 20px 18px',
            background: `linear-gradient(135deg, ${yearColor}10, ${yearColor}04)`,
            border: `1px solid ${yearColor}25`,
            marginBottom: 18,
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <Lock style={{ width: 14, height: 14, color: `${yearColor}70` }} />
              <span style={{ fontSize: 10, color: `${yearColor}70`, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
                一次付費 · 永久解鎖
              </span>
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 48, fontWeight: 800,
              color: yearColor, lineHeight: 1,
              textShadow: `0 0 30px ${yearColor}45`,
              marginBottom: 6,
            }}>
              NT$499
            </div>
            <p style={{ margin: 0, fontSize: 12, color: `${yearColor}65` }}>
              付款成功後立即解鎖完整流年報告
            </p>
          </div>

          {/* Feature checklist */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 10px',
            marginBottom: 22,
          }}>
            {UNLOCK_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${yearColor}15`,
                  border: `1px solid ${yearColor}30`,
                }}>
                  <Check style={{ width: 10, height: 10, color: yearColor }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(233,213,255,0.72)', lineHeight: 1.3 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onConfirm}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 13, border: 'none',
              background: `linear-gradient(135deg, ${yearColor}, ${yearColor}cc)`,
              color: '#07040f', fontSize: 15, fontWeight: 800,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 28px ${yearColor}40`,
              marginBottom: 10,
              letterSpacing: '0.01em',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <Sparkles style={{ width: 16, height: 16 }} />
            立即解鎖完整流年報告 NT$499
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 10,
              border: `1px solid ${yearColor}18`,
              background: 'transparent',
              color: 'rgba(196,181,253,0.35)', fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              marginBottom: 14,
              touchAction: 'manipulation',
            } as React.CSSProperties}
          >
            稍後再說
          </button>

          <p style={{ margin: 0, fontSize: 10, color: 'rgba(167,139,250,0.22)', textAlign: 'center', lineHeight: 1.6 }}>
            示範模式：點擊解鎖即可立即體驗完整內容
          </p>
        </div>
      </div>
    </div>
  );
}
