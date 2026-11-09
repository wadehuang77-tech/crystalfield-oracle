import { numerologyArticles, type NumerologySlug } from './lib/numerologySeo';
import { Routes, Route, Navigate, matchRoutes, useLocation } from 'react-router-dom';
import { Suspense, isValidElement, useEffect, type ReactNode } from 'react';
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
import CheckoutReturnPage from './pages/CheckoutReturnPage';
import LandingPage from './pages/LandingPage';
import MembershipPage from './pages/MembershipPage';
import PageHeader from './components/PageHeader';
import MayaCalendarPage from './pages/MayaCalendarPage';
import MayaAnnualPage from './pages/MayaAnnualPage';
import MayaProPage from './pages/MayaProPage';
import MayaRelationshipPage from './pages/MayaRelationshipPage';
import PrivacyPage from './pages/PrivacyPage';
import VedicAstrologyPage from './pages/VedicAstrologyPage';
import VedicAnnualPage from './pages/VedicAnnualPage';
import VedicAstrologyArticlePage from './pages/VedicAstrologyArticlePage';
import { TarotTrialStatusBanner } from './components/TarotTrialStatusBanner';
import SeoMetadata from './components/SeoMetadata';
import { getLanguageFromPath, getLocalizedPath } from './lib/i18n';
import { RenderYearProvider } from './contexts/RenderYearContext';
import AdminReviewsPage from './pages/AdminReviewsPage';
import { ReviewHomeSection } from './components/ReviewHomeSection';
import { RouteFallback, RouteLoadErrorBoundary, lazyRoute, ssrRoutesReady } from './lib/lazyRoute';
import { startRoutePrefetch } from './lib/routePrefetch';
// Keep this stylesheet in the entry CSS: loading it with the lazy chunk would restyle the prerendered page after first paint.
import './pages/NumerologyPage.css';

// Admin pages are not part of the public first load, so each is split into its own chunk.
const AdminPage = lazyRoute(() => import('./pages/AdminPage'), 'AdminPage');
const AdminSettingsPage = lazyRoute(() => import('./pages/AdminSettingsPage'), 'AdminSettingsPage');
const AdminKpiPage = lazyRoute(() => import('./pages/AdminKpiPage'), 'AdminKpiPage');
const GoogleFormsAdminPage = lazyRoute(() => import('./pages/GoogleFormsAdminPage'), 'GoogleFormsAdminPage');
const AdminMembersPage = lazyRoute(() => import('./pages/AdminMembersPage'), 'AdminMembersPage');
const AdminVedicReviewsPage = lazyRoute(() => import('./pages/AdminVedicReviewsPage'), 'default');
const AdminTarotSubscriptionsPage = lazyRoute(() => import('./pages/AdminTarotSubscriptionsPage'), 'default');

// Numerology and Human Design are only needed once a visitor opens those tools or their articles.
const NumerologyPage = lazyRoute(() => import('./pages/NumerologyPage'), 'default');
const NumerologyArticlePage = lazyRoute(() => import('./pages/NumerologyArticlePage'), 'default');
const HumanDesignPage = lazyRoute(() => import('./pages/HumanDesignPage'), 'default');
const HumanDesignArticlePage = lazyRoute(() => import('./pages/human-design/HumanDesignArticlePage'), 'default');

// Prerender renders synchronously, so lazy routes must be resolved before App is used (server only).
if (import.meta.env.SSR) await ssrRoutesReady();

const routeConfig = [
  { path: '/maya-calendar', element: <><MayaCalendarPage /><ReviewHomeSection source="maya" /></> },
  { path: '/maya-calendar/relationship', element: <MayaRelationshipPage /> },
  { path: '/maya-calendar/pro', element: <MayaProPage /> },
  { path: '/maya-calendar/pro/reports/:id', element: <MayaProPage /> },
  { path: '/maya-calendar/member', element: <MayaCalendarPage /> },
  { path: '/maya-calendar/annual', element: <MayaAnnualPage /> },
  { path: '/maya-calendar/results', element: <MayaCalendarPage /> },
  { path: '/maya-calendar/daily', element: <MayaCalendarPage /> },
  { path: '/maya-calendar/reports', element: <MayaCalendarPage /> },
  { path: '/maya-calendar/reports/:id', element: <MayaCalendarPage /> },
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
  { path: '/admin/reviews', element: <ProtectedRoute><AdminReviewsPage /></ProtectedRoute> },
  { path: '/tarot', element: <TarotPage /> },
  { path: '/tarot-single', element: <TarotSinglePage /> },
  { path: '/lightworker', element: <><LightworkerPage /><ReviewHomeSection source="tarot" referenceId="lightworker" title="光行者神諭使用者評價" /></> },
  { path: '/lightworker/celtic-cross', element: <><LightworkerCelticCrossPage /><ReviewHomeSection source="tarot" referenceId="lightworker" title="光行者神諭使用者評價" /></> },
  { path: '/unicorns', element: <><UnicornsPage /><ReviewHomeSection source="tarot" referenceId="unicorns" title="獨角獸塔羅使用者評價" /></> },
  { path: '/dragons', element: <><DragonsPage /><ReviewHomeSection source="tarot" referenceId="dragons" title="龍族塔羅使用者評價" /></> },
  { path: '/egyptian-gods', element: <><EgyptianGodsPage /><ReviewHomeSection source="tarot" referenceId="egyptian_gods" title="埃及神諭使用者評價" /></> },
  { path: '/work-your-light', element: <><WorkYourLightPage /><ReviewHomeSection source="tarot" referenceId="work_your_light" title="光之訊息使用者評價" /></> },
  { path: '/work-your-light-single', element: <><WorkYourLightSinglePage /><ReviewHomeSection source="tarot" referenceId="work_your_light" title="光之訊息使用者評價" /></> },
  { path: '/cosmic-cross', element: <><CosmicCrossPage /><ReviewHomeSection source="tarot" referenceId="work_your_light" title="光之訊息使用者評價" /></> },
  { path: '/osho', element: <><OshoPage /><ReviewHomeSection source="tarot" referenceId="osho" title="奧修禪卡使用者評價" /></> },
  { path: '/osho/single', element: <><OshoSinglePage /><ReviewHomeSection source="tarot" referenceId="osho" title="奧修禪卡使用者評價" /></> },
  { path: '/osho/three', element: <><OshoThreePage /><ReviewHomeSection source="tarot" referenceId="osho" title="奧修禪卡使用者評價" /></> },
  { path: '/checkout/return', element: <CheckoutReturnPage /> },
  { path: '/membership', element: <ProtectedRoute><MembershipPage /></ProtectedRoute> },
  { path: '/numerology', element: <><NumerologyPage /><ReviewHomeSection source="numerology" /></> },
  { path: '/human-design', element: <><HumanDesignPage /><ReviewHomeSection source="human-design" /></> },
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
  { path: '/vedic-astrology/annual', element: <VedicAnnualPage /> },
  { path: '/vedic-astrology/nakshatra', element: <VedicAstrologyArticlePage slug="nakshatra" /> },
  { path: '/vedic-astrology/d9-navamsa', element: <VedicAstrologyArticlePage slug="d9-navamsa" /> },
  { path: '/vedic-astrology/d10-dasamsa', element: <VedicAstrologyArticlePage slug="d10-dasamsa" /> },
  { path: '/vedic-astrology/birth-time', element: <VedicAstrologyArticlePage slug="birth-time" /> },
  { path: '/vedic-astrology/love-marriage', element: <VedicAstrologyArticlePage slug="love-marriage" /> },
  { path: '/vedic-astrology/career-wealth', element: <VedicAstrologyArticlePage slug="career-wealth" /> },
] as const;

const numerologyArticlePaths = Object.keys(numerologyArticles).map(slug => `/numerology/${slug}`);
export const appRoutePaths = routeConfig.flatMap(({ path }) => (
  path === '/home'
    ? [path, '/en/home']
    : [path, getLocalizedPath(path, 'en')]
)).concat(numerologyArticlePaths, ['/human-design/how-to-read']);

// Routes as rendered below, used only to find which lazy chunk the current URL needs.
const preloadableRoutes = [
  ...routeConfig.flatMap(({ path, element }) => (
    path === '/home' ? [{ path, element }] : [{ path, element }, { path: getLocalizedPath(path, 'en'), element }]
  )),
  ...Object.keys(numerologyArticles).map(slug => ({ path: `/numerology/${slug}`, element: <NumerologyArticlePage slug={slug as NumerologySlug} /> })),
  { path: '/human-design/how-to-read', element: <HumanDesignArticlePage slug="how-to-read" /> },
];

function collectPreloads(node: ReactNode, found: Array<() => Promise<unknown>> = []) {
  if (Array.isArray(node)) node.forEach(child => collectPreloads(child, found));
  else if (isValidElement(node)) {
    const preload = (node.type as { preload?: () => Promise<unknown> }).preload;
    if (typeof preload === 'function') found.push(preload);
    collectPreloads((node.props as { children?: ReactNode }).children, found);
  }
  return found;
}

function routePreloadsForPath(pathname: string) {
  const matches = matchRoutes(preloadableRoutes, pathname) ?? [];
  return matches.flatMap(({ route }) => collectPreloads(route.element));
}

// Prerendered pages are hydrated only after their route chunk has loaded. Otherwise an update that arrives first
// (for example the session check) hits the still-dehydrated Suspense boundary and React discards the server HTML.
// eslint-disable-next-line react-refresh/only-export-components
export function preloadRouteForPath(pathname: string) {
  return Promise.all(routePreloadsForPath(pathname).map(preload => preload()));
}

// Only these routes are prefetched from links; other lazy routes still load on navigation.
const prefetchablePreloads = new Set([NumerologyPage, NumerologyArticlePage, HumanDesignPage, HumanDesignArticlePage].map(page => page.preload));
const prefetchablePreloadsForPath = (pathname: string) => routePreloadsForPath(pathname).filter(preload => prefetchablePreloads.has(preload));
const isHomePath = (pathname: string) => pathname === '/' || pathname === '/en' || pathname === '/en/';

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
  const location = useLocation();

  useEffect(() => startRoutePrefetch({
    resolve: prefetchablePreloadsForPath,
    prefetchVisibleLinks: isHomePath(location.pathname),
  }), [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-ink-950">
      <ScrollToTop />
      <DocumentLanguage />
      <SeoMetadata />
      <PageHeader />
      <TarotTrialStatusBanner />
      <div className="flex-1">
        <RouteLoadErrorBoundary resetKey={location.pathname}>
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
                  <Route key={`${path}-en`} path={getLocalizedPath(path, 'en')} element={element} />,
                );
              }

              return routes;
            })}
            {Object.keys(numerologyArticles).map(slug => <Route key={slug} path={`/numerology/${slug}`} element={<NumerologyArticlePage slug={slug as NumerologySlug} />} />)}
            <Route path="/human-design/how-to-read" element={<HumanDesignArticlePage slug="how-to-read" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </RouteLoadErrorBoundary>
      </div>
      <SiteFooter />
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-20 text-center text-white">
      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-white/60">404</p>
      <h1 className="mb-5 text-3xl font-semibold">找不到這個頁面</h1>
      <p className="mb-8 text-white/75">The page you requested could not be found.</p>
      <nav className="flex justify-center gap-6">
        <a className="underline underline-offset-4" href="/">返回首頁</a>
        <a className="underline underline-offset-4" href="/en/">English home</a>
      </nav>
    </main>
  );
}

function App({ renderYear }: { renderYear: number }) {
  return (
    <RenderYearProvider year={renderYear}>
      {/* One boundary above the stateful providers: nothing can update it before it has hydrated. */}
      <Suspense fallback={<RouteFallback />}>
        <AuthProvider>
          <RouterBody />
        </AuthProvider>
      </Suspense>
    </RenderYearProvider>
  );
}

export default App;
