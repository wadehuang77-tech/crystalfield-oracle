import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import SiteFooter from './components/SiteFooter';
import ScrollToTop from './components/ScrollToTop';
import { usePageViewTracking } from './hooks/usePageViewTracking';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import TarotPage from './pages/TarotPage';
import TarotSinglePage from './pages/TarotSinglePage';
import LightworkerPage from './pages/LightworkerPage';
import LightworkerCelticCrossPage from './pages/LightworkerCelticCrossPage';
import UnicornsPage from './pages/UnicornsPage';
import DragonsPage from './pages/DragonsPage';
import EgyptianGodsPage from './pages/EgyptianGodsPage';
import WorkYourLightPage from './pages/WorkYourLightPage';
import WorkYourLightSinglePage from './pages/WorkYourLightSinglePage';
import CosmicCrossPage from './pages/CosmicCrossPage';
import OshoPage from './pages/OshoPage';
import OshoSinglePage from './pages/OshoSinglePage';
import OshoThreePage from './pages/OshoThreePage';
import { AdminPage } from './pages/AdminPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminKpiPage } from './pages/AdminKpiPage';
import CheckoutReturnPage from './pages/CheckoutReturnPage';
import LandingPage from './pages/LandingPage';
import NumerologyPage from './pages/NumerologyPage';

// ── Global floating nav (back button + auth status) ─────────────────────────
// Excluded from /auth (has its own) and /numerology (has integrated header nav)
function GlobalNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  if (location.pathname === '/auth' || location.pathname === '/numerology') return null;

  const isRoot = location.pathname === '/';

  const pill: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 13px',
    borderRadius: 999,
    background: 'rgba(5, 2, 18, 0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(167,139,250,0.20)',
    color: 'rgba(196,181,253,0.65)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
    letterSpacing: '0.02em',
  };

  return (
    <>
      {!isRoot && (
        <button onClick={() => navigate('/')} style={{ ...pill, top: 14, left: 14 }}>
          ‹&nbsp;首頁
        </button>
      )}
      {!loading && (
        user ? (
          <div style={{
            position: 'fixed', top: 14, right: 14, zIndex: 1000,
            display: 'flex', alignItems: 'center',
            background: 'rgba(5, 2, 18, 0.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(167,139,250,0.20)',
            borderRadius: 999,
            boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            <span style={{
              padding: '6px 8px 6px 14px',
              color: 'rgba(196,181,253,0.55)',
              fontSize: 11,
              maxWidth: 96,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email?.split('@')[0]}
            </span>
            <button
              onClick={signOut}
              style={{
                padding: '6px 13px 6px 8px',
                background: 'none',
                border: 'none',
                borderLeft: '1px solid rgba(167,139,250,0.14)',
                color: 'rgba(196,181,253,0.38)',
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              登出
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`)}
            style={{ ...pill, top: 14, right: 14 }}
          >
            登入
          </button>
        )
      )}
    </>
  );
}

function RouterBody() {
  usePageViewTracking();
  return (
    <div className="flex flex-col min-h-screen bg-ink-950">
      <ScrollToTop />
      <GlobalNav />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/kpi" element={<ProtectedRoute><AdminKpiPage /></ProtectedRoute>} />
          <Route path="/tarot" element={<TarotPage />} />
          <Route path="/tarot-single" element={<TarotSinglePage />} />
          <Route path="/lightworker" element={<LightworkerPage />} />
          <Route path="/lightworker/celtic-cross" element={<LightworkerCelticCrossPage />} />
          <Route path="/unicorns" element={<UnicornsPage />} />
          <Route path="/dragons" element={<DragonsPage />} />
          <Route path="/egyptian-gods" element={<EgyptianGodsPage />} />
          <Route path="/work-your-light" element={<WorkYourLightPage />} />
          <Route path="/work-your-light-single" element={<WorkYourLightSinglePage />} />
          <Route path="/cosmic-cross" element={<CosmicCrossPage />} />
          <Route path="/osho" element={<OshoPage />} />
          <Route path="/osho/single" element={<OshoSinglePage />} />
          <Route path="/osho/three" element={<OshoThreePage />} />
          <Route path="/checkout/return" element={<ProtectedRoute><CheckoutReturnPage /></ProtectedRoute>} />
          <Route path="/numerology" element={<NumerologyPage />} />
          <Route path="/human-design" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <RouterBody />
      </Router>
    </AuthProvider>
  );
}

export default App;
