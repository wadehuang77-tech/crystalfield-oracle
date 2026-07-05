import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ACCENTS = {
  orange:  { border: 'rgba(249,115,22,0.30)',  text: '#fb923c' },
  cyan:    { border: 'rgba(6,182,212,0.30)',    text: '#22d3ee' },
  pink:    { border: 'rgba(236,72,153,0.30)',   text: '#f472b6' },
  emerald: { border: 'rgba(16,185,129,0.30)',   text: '#34d399' },
  yellow:  { border: 'rgba(234,179,8,0.30)',    text: '#facc15' },
  violet:  { border: 'rgba(139,92,246,0.30)',   text: '#a78bfa' },
  teal:    { border: 'rgba(20,184,166,0.30)',   text: '#2dd4bf' },
  purple:  { border: 'rgba(168,85,247,0.30)',   text: '#c084fc' },
  blue:    { border: 'rgba(59,130,246,0.30)',   text: '#60a5fa' },
  slate:   { border: 'rgba(148,163,184,0.20)',  text: '#94a3b8' },
} as const;

type Accent = keyof typeof ACCENTS;

interface PageHeaderProps {
  title?: string;
  accent?: Accent;
  onBack?: () => void;
  extraRight?: React.ReactNode;
}

export default function PageHeader({ title, accent = 'slate', onBack, extraRight }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { border, text } = ACCENTS[accent];

  const handleBack = onBack ?? (() => navigate('/'));

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(5, 2, 18, 0.90)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${border}`,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 20px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>

        {/* Back */}
        <button
          onClick={handleBack}
          style={{ color: text, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={2.2} />
          首頁
        </button>

        {/* Title */}
        {title && (
          <span style={{ fontFamily: 'serif', fontSize: 13, letterSpacing: '0.28em', color: `${text}bb`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
            {title}
          </span>
        )}

        {/* Right: extras + auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {extraRight}
          {!loading && (
            user ? (
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                overflow: 'hidden',
              }}>
                <span style={{ padding: '4px 8px 4px 12px', color: 'rgba(226,232,240,0.70)', fontSize: 11, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </span>
                <button onClick={signOut} style={{ padding: '4px 10px 4px 6px', background: 'none', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.10)', color: 'rgba(226,232,240,0.50)', fontSize: 11, cursor: 'pointer' }}>
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth?redirect=' + encodeURIComponent(location.pathname))}
                style={{ padding: '4px 14px', background: `${text}1a`, border: `1px solid ${border}`, borderRadius: 999, color: text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                登入
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
