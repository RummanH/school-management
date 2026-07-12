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
import ProfilePage from '../features/profile/pages/ProfilePage.jsx';

const LanguageContext = createContext(null);
const AuthContext = createContext(null);

export function useLanguage() { return useContext(LanguageContext); }
export function useAuth() { return useContext(AuthContext); }

export function navigate(path) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

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
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [lastSeenByUserId, setLastSeenByUserId] = useState({});

  useEffect(() => {
    if (!currentUser) { setSocket(null); setOnlineUserIds(new Set()); setLastSeenByUserId({}); return; }
    const s = getSocket();
    s.connect();
    setSocket(s);

    // Presence for the whole school (see backend/realtime.js): a snapshot on
    // connect for who's already online, then live online/offline events.
    function handleSnapshot({ onlineUserIds: ids }) { setOnlineUserIds(new Set(ids)); }
    function handleOnline({ userId }) { setOnlineUserIds((prev) => new Set(prev).add(userId)); }
    function handleOffline({ userId, lastSeenAt }) {
      setOnlineUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
      setLastSeenByUserId((prev) => ({ ...prev, [userId]: lastSeenAt }));
    }
    s.on('presence:snapshot', handleSnapshot);
    s.on('presence:online', handleOnline);
    s.on('presence:offline', handleOffline);

    return () => {
      s.off('presence:snapshot', handleSnapshot);
      s.off('presence:online', handleOnline);
      s.off('presence:offline', handleOffline);
      s.disconnect();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const refreshAuth = useCallback(async () => {
    const data = await getMe();
    setCurrentUser(data.user);
    setCurrentTenant(data.tenant);
    return data;
  }, []);

  useEffect(() => {
    refreshAuth()
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, [refreshAuth]);

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
  const isPortal = pathname.startsWith('/portal');
  const isReport = pathname.startsWith('/portal/report');
  const isDocument = pathname.startsWith('/portal/document');
  const isAdmission = pathname.startsWith('/admission');
  const isLogin = pathname === '/login';
  const isAccount = pathname.startsWith('/account');
  const isReservedRoute = isDashboard || isPortal || isAdmission || isLogin || isAccount;

  const pathSegments = pathname.split('/').filter(Boolean);
  const siteSlug = isReservedRoute || pathSegments.length === 0 ? DEFAULT_SITE_SLUG : pathSegments[0];
  const site = SITES[siteSlug];

  const t = createTranslator(language, site || SITES[DEFAULT_SITE_SLUG]);

  if ((isDashboard || isPortal || isAccount) && !currentUser) { navigate('/login'); return null; }
  if (isLogin && currentUser) { navigate(homePathForRole(currentUser.role)); return null; }

  if (isDashboard && currentUser && !DASHBOARD_ROLES.includes(currentUser.role)) {
    navigate('/portal'); return null;
  }
  if (isPortal && currentUser && DASHBOARD_ONLY_ROLES.includes(currentUser.role)) {
    navigate('/dashboard'); return null;
  }

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t, siteSlug }}>
      <AuthContext.Provider value={{ currentUser, currentTenant, login, logout, refreshAuth, socket, onlineUserIds, lastSeenByUserId }}>
        {isDashboard ? <DashboardPage />
          : isAccount ? <ProfilePage />
          : isDocument ? <DocumentPage />
          : isReport ? <ProgressReportPage />
          : isPortal ? <PortalPage />
          : isAdmission ? <AdmissionPage />
          : isLogin ? <LoginPage />
          : !site ? <SiteNotFound slug={siteSlug} />
          : <LandingPage />}
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
}
