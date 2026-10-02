import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthProvider';
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
import { GoogleFormsAdminPage } from './pages/GoogleFormsAdminPage';
import { AdminMembersPage } from './pages/AdminMembersPage';
import CheckoutReturnPage from './pages/CheckoutReturnPage';
import LandingPage from './pages/LandingPage';
import NumerologyPage from './pages/NumerologyPage';
import MembershipPage from './pages/MembershipPage';
import PageHeader from './components/PageHeader';
import HumanDesignPage from './pages/HumanDesignPage';
import PrivacyPage from './pages/PrivacyPage';
import VedicAstrologyPage from './pages/VedicAstrologyPage';
import VedicAstrologyArticlePage from './pages/VedicAstrologyArticlePage';
import AdminVedicReviewsPage from './pages/AdminVedicReviewsPage';
import AdminTarotSubscriptionsPage from './pages/AdminTarotSubscriptionsPage';
import { TarotTrialStatusBanner } from './components/TarotTrialStatusBanner';
import SeoMetadata from './components/SeoMetadata';
import HumanDesignArticlePage from './pages/human-design/HumanDesignArticlePage';
import { getLanguageFromPath, getLocalizedPath } from './lib/i18n';

const routeConfig = [
  { path: '/', element: <LandingPage /> },
  { path: '/oracle', element: <HomePage /> },
  { path: '/home', element: <Navigate to="/oracle" replace /> },
  { path: '/auth', element: <LegacyAuthRedirect /> },
  { path: '/login', element: <AuthPage /> },
  { path: '/register', element: <AuthPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/admin', element: <ProtectedRoute><AdminPage /></ProtectedRoute> },
  { path: '/admin/settings', element: <ProtectedRoute><AdminSettingsPage /></ProtectedRoute> },
  { path: '/admin/kpi', element: <ProtectedRoute><AdminKpiPage /></ProtectedRoute> },
  { path: '/admin/google-forms', element: <ProtectedRoute><GoogleFormsAdminPage /></ProtectedRoute> },
  { path: '/admin/members', element: <ProtectedRoute><AdminMembersPage /></ProtectedRoute> },
  { path: '/admin/tarot-subscriptions', element: <ProtectedRoute><AdminTarotSubscriptionsPage /></ProtectedRoute> },
  { path: '/admin/vedic-reviews', element: <ProtectedRoute><AdminVedicReviewsPage /></ProtectedRoute> },
  { path: '/tarot', element: <TarotPage /> },
  { path: '/tarot-single', element: <TarotSinglePage /> },
  { path: '/lightworker', element: <LightworkerPage /> },
  { path: '/lightworker/celtic-cross', element: <LightworkerCelticCrossPage /> },
  { path: '/unicorns', element: <UnicornsPage /> },
  { path: '/dragons', element: <DragonsPage /> },
  { path: '/egyptian-gods', element: <EgyptianGodsPage /> },
  { path: '/work-your-light', element: <WorkYourLightPage /> },
  { path: '/work-your-light-single', element: <WorkYourLightSinglePage /> },
  { path: '/cosmic-cross', element: <CosmicCrossPage /> },
  { path: '/osho', element: <OshoPage /> },
  { path: '/osho/single', element: <OshoSinglePage /> },
  { path: '/osho/three', element: <OshoThreePage /> },
  { path: '/checkout/return', element: <CheckoutReturnPage /> },
  { path: '/membership', element: <ProtectedRoute><MembershipPage /></ProtectedRoute> },
  { path: '/numerology', element: <NumerologyPage /> },
  { path: '/human-design', element: <HumanDesignPage /> },
  { path: '/human-design/types', element: <HumanDesignArticlePage slug="types" /> },
  { path: '/human-design/generator', element: <HumanDesignArticlePage slug="generator" /> },
  { path: '/human-design/manifesting-generator', element: <HumanDesignArticlePage slug="manifesting-generator" /> },
  { path: '/human-design/projector', element: <HumanDesignArticlePage slug="projector" /> },
  { path: '/human-design/manifestor', element: <HumanDesignArticlePage slug="manifestor" /> },
  { path: '/human-design/reflector', element: <HumanDesignArticlePage slug="reflector" /> },
  { path: '/human-design/authority', element: <HumanDesignArticlePage slug="authority" /> },
  { path: '/human-design/profile', element: <HumanDesignArticlePage slug="profile" /> },
  { path: '/human-design/birth-time', element: <HumanDesignArticlePage slug="birth-time" /> },
  { path: '/vedic-astrology', element: <VedicAstrologyPage /> },
  { path: '/vedic-astrology/what-is-vedic-astrology', element: <VedicAstrologyArticlePage slug="what-is-vedic-astrology" /> },
  { path: '/vedic-astrology/vedic-vs-western', element: <VedicAstrologyArticlePage slug="vedic-vs-western" /> },
  { path: '/vedic-astrology/rahu-ketu', element: <VedicAstrologyArticlePage slug="rahu-ketu" /> },
  { path: '/vedic-astrology/dasha', element: <VedicAstrologyArticlePage slug="dasha" /> },
  { path: '/vedic-astrology/nakshatra', element: <VedicAstrologyArticlePage slug="nakshatra" /> },
  { path: '/vedic-astrology/d9-navamsa', element: <VedicAstrologyArticlePage slug="d9-navamsa" /> },
  { path: '/vedic-astrology/d10-dasamsa', element: <VedicAstrologyArticlePage slug="d10-dasamsa" /> },
  { path: '/vedic-astrology/birth-time', element: <VedicAstrologyArticlePage slug="birth-time" /> },
  { path: '/vedic-astrology/love-marriage', element: <VedicAstrologyArticlePage slug="love-marriage" /> },
  { path: '/vedic-astrology/career-wealth', element: <VedicAstrologyArticlePage slug="career-wealth" /> },
] as const;

function DocumentLanguage() {
  const location = useLocation();

  useEffect(() => {
    const language = getLanguageFromPath(location.pathname);
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
  }, [location.pathname]);

  return null;
}

function LegacyAuthRedirect() {
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const mode = new URLSearchParams(location.search).get('mode') === 'signup' ? 'register' : 'login';
  return <Navigate to={`${getLocalizedPath(`/${mode}`, language)}${location.search}${location.hash}`} replace state={location.state} />;
}

function RouterBody() {
  usePageViewTracking();

  return (
    <div className="flex flex-col min-h-screen bg-ink-950">
      <ScrollToTop />
      <DocumentLanguage />
      <SeoMetadata />
      <PageHeader />
      <TarotTrialStatusBanner />
      <div className="flex-1">
        <Routes>
          {routeConfig.flatMap(({ path, element }) => {
            const routes = [
              <Route key={`${path}-zh`} path={path} element={element} />,
            ];

            if (path === '/home') {
              routes.push(
                <Route key="/en/home" path="/en/home" element={<Navigate to="/en/oracle" replace />} />,
              );
            } else {
              routes.push(
                <Route key={`${path}-en`} path={path === '/' ? '/en' : `/en${path}`} element={element} />,
              );
            }

            return routes;
          })}
          <Route path="/en/*" element={<Navigate to="/" replace />} />
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
