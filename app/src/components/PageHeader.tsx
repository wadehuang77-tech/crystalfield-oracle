import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

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

const ROUTES: Record<string, { title: string; accent: Accent }> = {
  '/':                           { title: '水晶場',              accent: 'slate'   },
  '/oracle':                     { title: '塔羅神諭',            accent: 'slate'   },
  '/tarot':                      { title: '偉特塔羅',            accent: 'orange'  },
  '/tarot-single':               { title: '偉特塔羅 · 單張',     accent: 'orange'  },
  '/lightworker':                { title: '光行者神諭',           accent: 'cyan'    },
  '/lightworker/celtic-cross':   { title: '十字交叉使命陣',       accent: 'cyan'    },
  '/unicorns':                   { title: '獨角獸塔羅',           accent: 'pink'    },
  '/dragons':                    { title: '龍族塔羅',             accent: 'emerald' },
  '/egyptian-gods':              { title: '埃及神諭',             accent: 'yellow'  },
  '/work-your-light':            { title: '光之訊息',             accent: 'violet'  },
  '/work-your-light-single':     { title: '光之訊息 · 深度解說',  accent: 'violet'  },
  '/cosmic-cross':               { title: '宇宙十字陣',           accent: 'orange'  },
  '/osho':                       { title: '奧修禪卡',             accent: 'teal'    },
  '/osho/single':                { title: '奧修禪卡 · 單張',      accent: 'teal'    },
  '/osho/three':                 { title: '奧修禪卡 · 三張',      accent: 'teal'    },
  '/numerology':                 { title: '生命靈數',             accent: 'purple'  },
  '/checkout/return':            { title: '付款結果',             accent: 'blue'    },
  '/membership':                 { title: '月費會員',             accent: 'slate'   },
  '/admin':                      { title: '管理後台',             accent: 'slate'   },
  '/admin/settings':             { title: '設定',                 accent: 'slate'   },
  '/admin/kpi':                  { title: 'KPI',                  accent: 'slate'   },
};

const HIDDEN_ON = new Set(['/auth']);

const ORACLE_BACK_ROUTES = new Set([
  '/tarot',
  '/tarot-single',
  '/lightworker',
  '/lightworker/celtic-cross',
  '/unicorns',
  '/dragons',
  '/egyptian-gods',
  '/work-your-light',
  '/work-your-light-single',
  '/cosmic-cross',
  '/osho',
  '/osho/single',
  '/osho/three',
]);

export default function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    adminApi.check().then(({ isAdmin }) => setIsAdmin(isAdmin)).catch(() => {});
  }, [user]);

  if (HIDDEN_ON.has(location.pathname)) return null;

  const isHome = location.pathname === '/';
  const route = ROUTES[location.pathname] ?? { title: '', accent: 'slate' as Accent };
  const { border, text } = ACCENTS[route.accent];
  const backTarget = ORACLE_BACK_ROUTES.has(location.pathname) ? '/oracle' : '/';
  const backLabel = ORACLE_BACK_ROUTES.has(location.pathname) ? '塔羅主頁' : '首頁';

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
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
      }}>

        {/* Left: back button (empty on home) */}
        <div>
          {!isHome && (
            <button
              onClick={() => navigate(backTarget)}
              style={{ color: text, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={2.2} />
              {backLabel}
            </button>
          )}
        </div>

        {/* Center: page title — always truly centered */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {route.title && (
            <span style={{ fontFamily: 'serif', fontSize: 15, letterSpacing: '0.25em', color: text, whiteSpace: 'nowrap' }}>
              {route.title}
            </span>
          )}
        </div>

        {/* Right: admin link + auth */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {isAdmin && (
            <Link
              to="/admin"
              title="管理後台"
              style={{ color: text, opacity: 0.6, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Shield style={{ width: 14, height: 14 }} />
            </Link>
          )}
          {user && (
            <Link
              to="/membership"
              title="月費會員"
              style={{ color: text, opacity: 0.75, fontSize: 11, textDecoration: 'none', flexShrink: 0 }}
            >
              會員
            </Link>
          )}
          {!loading && (
            user ? (
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                overflow: 'hidden',
                flexShrink: 0,
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
                style={{ padding: '4px 14px', background: `${text}1a`, border: `1px solid ${border}`, borderRadius: 999, color: text, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
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
