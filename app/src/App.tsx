import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import PageHeader from './components/PageHeader';

function RouterBody() {
  usePageViewTracking();
  return (
    <div className="flex flex-col min-h-screen bg-ink-950">
      <ScrollToTop />
      <PageHeader />
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
