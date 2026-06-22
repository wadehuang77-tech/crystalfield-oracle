import type { PlanTier } from '../../hooks/usePremium';

interface ContentGateProps {
  currentTier: PlanTier;
  requiredTier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
  accentColor?: string;
  previewHeight?: number;
  children: React.ReactNode;
}

export default function ContentGate({
  currentTier,
  requiredTier,
  onUpgrade,
  accentColor = '#a78bfa',
  previewHeight = 160,
  children,
}: ContentGateProps) {
  if (currentTier >= requiredTier) return <>{children}</>;

  const planLabels: Record<PlanTier, string> = {
    0: '免費版',
    1: '基礎版 NT$250',
    2: '進階版 NT$399',
    3: '完整靈魂版 NT$599',
  };

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
          padding: '16px',
          borderRadius: 14,
          textAlign: 'center',
          background: 'rgba(7,4,15,0.85)',
          border: `1px solid ${accentColor}20`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 35% 30%, ${accentColor}20, ${accentColor}06)`,
          border: `1px solid ${accentColor}25`,
          fontSize: 15, flexShrink: 0,
          color: accentColor,
        }}>
          ✦
        </div>

        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.65,
          color: 'rgba(196,181,253,0.6)',
          fontFamily: 'Inter, sans-serif',
        }}>
          需要 <span style={{ color: accentColor, fontWeight: 600 }}>{planLabels[requiredTier]}</span> 才能解鎖此內容
        </p>

        <button
          onClick={() => onUpgrade(requiredTier)}
          style={{
            padding: '10px 28px',
            borderRadius: 10,
            border: `1px solid ${accentColor}45`,
            background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}06)`,
            color: accentColor,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            letterSpacing: '0.02em',
          } as React.CSSProperties}
        >
          解鎖完整解析
        </button>
      </div>
    </div>
  );
}
