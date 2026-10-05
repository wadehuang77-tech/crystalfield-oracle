import type { PlanTier } from '../../hooks/usePremium';
import type { Language } from '../../lib/i18n';

interface ContentGateProps {
  currentTier: PlanTier;
  language?: Language;
  requiredTier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
  accentColor?: string;
  previewHeight?: number;
  children: React.ReactNode;
}

export default function ContentGate({
  currentTier,
  language = 'zh-Hant',
  requiredTier,
  onUpgrade,
  accentColor = '#a78bfa',
  previewHeight = 160,
  children,
}: ContentGateProps) {
  if (currentTier >= requiredTier) return <>{children}</>;

  const gateColor = accentColor;
  const label = language === 'en'
    ? requiredTier === 1
      ? 'Unlock the Basic plan to view the full content.'
      : requiredTier === 2
        ? 'Unlock the Advanced plan to view the full content.'
        : 'Unlock the full soul reading to view all content.'
    : requiredTier === 1
      ? '解鎖基礎版 NT$199，查看完整內容'
      : requiredTier === 2
        ? '解鎖進階版 NT$499，查看完整內容'
        : '解鎖完整靈魂版 NT$10，查看全部內容';

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          maxHeight: previewHeight,
          overflow: 'hidden',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
        }}
      >
        {children}
      </div>

      <div
        style={{
          marginTop: 6,
          padding: '14px 16px',
          borderRadius: 14,
          textAlign: 'center',
          background: 'rgba(7,4,15,0.88)',
          border: `1px solid ${gateColor}22`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 35% 30%, ${gateColor}20, ${gateColor}06)`,
          border: `1px solid ${gateColor}28`,
          fontSize: 13, flexShrink: 0,
          color: gateColor,
        }}>
          ✦
        </div>

        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.6,
          color: 'rgba(196,181,253,0.55)',
          fontFamily: 'Inter, sans-serif',
        }}>
          {label}
        </p>

        <button
          onClick={() => onUpgrade(requiredTier)}
          style={{
            padding: '9px 22px',
            borderRadius: 10,
            border: `1px solid ${gateColor}45`,
            background: `linear-gradient(135deg, ${gateColor}18, ${gateColor}06)`,
            color: gateColor,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            letterSpacing: '0.02em',
          } as React.CSSProperties}
        >
          {language === 'en' ? 'Unlock Full Reading' : '解鎖完整解析'}
          </button>
      </div>
    </div>
  );
}
