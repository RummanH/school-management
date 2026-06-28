import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createTranslator, supportedLanguages } from '../i18n/translations.js';
import { getMe, logout as apiLogout } from '../services/api/authApi.js';
import LandingPage from '../features/landing/pages/LandingPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import PortalPage from '../features/portal/pages/PortalPage.jsx';

const LanguageContext = createContext(null);
const AuthContext = createContext(null);

export function useLanguage() { return useContext(LanguageContext); }
export function useAuth() { return useContext(AuthContext); }

export function navigate(path) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Roles that use the full admin dashboard
const ADMIN_ROLES = ['system_developer', 'admin'];

function homePathForRole(role) {
  return ADMIN_ROLES.includes(role) ? '/dashboard' : '/portal';
}

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('sm.language') || 'en');
  const [pathname, setPathname] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  const t = createTranslator(language);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  const isDashboard = pathname.startsWith('/dashboard');
  const isPortal    = pathname.startsWith('/portal');
  const isLogin     = pathname === '/login';

  // Unauthenticated guards
  if ((isDashboard || isPortal) && !currentUser) { navigate('/login'); return null; }

  // Authenticated redirect from login
  if (isLogin && currentUser) { navigate(homePathForRole(currentUser.role)); return null; }

  // Cross-role guards: prevent non-admin accessing /dashboard and admin accessing /portal
  if (isDashboard && currentUser && !ADMIN_ROLES.includes(currentUser.role)) {
    navigate('/portal'); return null;
  }
  if (isPortal && currentUser && ADMIN_ROLES.includes(currentUser.role)) {
    navigate('/dashboard'); return null;
  }

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      <AuthContext.Provider value={{ currentUser, currentTenant, login, logout }}>
        {isDashboard ? <DashboardPage />
          : isPortal  ? <PortalPage />
          : isLogin   ? <LoginPage />
          : <LandingPage />}
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
}
