import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createTranslator, supportedLanguages } from '../i18n/translations.js';
import { SITES, DEFAULT_SITE_SLUG } from '../features/landing/sites/index.js';
import { getMe, logout as apiLogout } from '../services/api/authApi.js';
import { getSocket } from '../services/realtime/socket.js';
import LandingPage from '../features/landing/pages/LandingPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import PortalPage from '../features/portal/pages/PortalPage.jsx';
import ProgressReportPage from '../features/portal/pages/ProgressReportPage.jsx';
import DocumentPage from '../features/portal/pages/DocumentPage.jsx';
import AdmissionPage from '../features/admission/pages/AdmissionPage.jsx';

const LanguageContext = createContext(null);
const AuthContext = createContext(null);

export function useLanguage() { return useContext(LanguageContext); }
export function useAuth() { return useContext(AuthContext); }

export function navigate(path) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Roles that land in the admin dashboard shell.
// Teachers use the dashboard for academic management (classes/routine/syllabus/
// attendance/results) but also keep access to /portal for their own profile —
// see the cross-role guards below, where only system_developer/admin are fully
// barred from /portal.
const DASHBOARD_ROLES = ['system_developer', 'admin', 'accountant', 'teacher'];
const DASHBOARD_ONLY_ROLES = ['system_developer', 'admin', 'accountant'];

function homePathForRole(role) {
  return DASHBOARD_ROLES.includes(role) ? '/dashboard' : '/portal';
}

function SiteNotFound({ slug }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white px-4 text-center">
      <p className="text-lg font-bold text-slate-800">School site not found</p>
      <p className="text-sm text-slate-500">There is no school registered at "/{slug}".</p>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('sm.language') || 'en');
  const [pathname, setPathname] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Connects once a user is known (fresh login or a restored session via
  // getMe()) and disconnects on logout — one shared socket for the whole
  // app, authenticated the same way as every HTTP request (session cookie).
  useEffect(() => {
    if (!currentUser) { setSocket(null); return; }
    const s = getSocket();
    s.connect();
    setSocket(s);
    return () => { s.disconnect(); };
  }, [currentUser?.id]);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    getMe()
      .then((data) => { setCurrentUser(data.user); setCurrentTenant(data.tenant); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const login = useCallback((user, tenant) => {
    setCurrentUser(user);
    setCurrentTenant(tenant);
    navigate(homePathForRole(user?.role));
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    setCurrentUser(null);
    setCurrentTenant(null);
    navigate('/');
  }, []);

  function switchLanguage(lang) {
    if (supportedLanguages.includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('sm.language', lang);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  const isDashboard = pathname.startsWith('/dashboard');
  const isPortal    = pathname.startsWith('/portal');
  const isReport    = pathname.startsWith('/portal/report');
  const isDocument  = pathname.startsWith('/portal/document');
  const isAdmission = pathname.startsWith('/admission');
  const isLogin     = pathname === '/login';
  const isReservedRoute = isDashboard || isPortal || isAdmission || isLogin;

  // Public landing site resolution: "/" (or any reserved app route) shows the
  // default demo site; any other single path segment is looked up as a
  // school/madrasah slug (see features/landing/sites/index.js) so multiple
  // schools' landing pages can live side by side in this one deployment.
  const pathSegments = pathname.split('/').filter(Boolean);
  const siteSlug = isReservedRoute || pathSegments.length === 0 ? DEFAULT_SITE_SLUG : pathSegments[0];
  const site = SITES[siteSlug];

  const t = createTranslator(language, site || SITES[DEFAULT_SITE_SLUG]);

  // Unauthenticated guards
  if ((isDashboard || isPortal) && !currentUser) { navigate('/login'); return null; }

  // Authenticated redirect from login
  if (isLogin && currentUser) { navigate(homePathForRole(currentUser.role)); return null; }

  // Cross-role guards: students/guardians never see the dashboard; system_developer/admin
  // never see the portal (they have no student/teacher profile to show there). Teachers are
  // allowed on both — /dashboard for academic management, /portal for their own profile.
  if (isDashboard && currentUser && !DASHBOARD_ROLES.includes(currentUser.role)) {
    navigate('/portal'); return null;
  }
  if (isPortal && currentUser && DASHBOARD_ONLY_ROLES.includes(currentUser.role)) {
    navigate('/dashboard'); return null;
  }

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t, siteSlug }}>
      <AuthContext.Provider value={{ currentUser, currentTenant, login, logout, socket }}>
        {isDashboard ? <DashboardPage />
          : isDocument  ? <DocumentPage />
          : isReport    ? <ProgressReportPage />
          : isPortal    ? <PortalPage />
          : isAdmission ? <AdmissionPage />
          : isLogin     ? <LoginPage />
          : !site       ? <SiteNotFound slug={siteSlug} />
          : <LandingPage />}
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
}
