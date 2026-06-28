import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, InboxIcon } from 'lucide-react';
import DashboardSidebar from '../components/DashboardSidebar.jsx';
import DashboardHeader from '../components/DashboardHeader.jsx';
import TenantsPage from '../../platform/pages/TenantsPage.jsx';
import UsersPage from '../../platform/pages/UsersPage.jsx';
import StudentsPage from '../../students/pages/StudentsPage.jsx';
import TeachersPage from '../../teachers/pages/TeachersPage.jsx';
import AcademicPage from '../../academic/pages/AcademicPage.jsx';
import { getStats, getContacts, markContactRead } from '../../../services/api/adminApi.js';
import { useAuth } from '../../../app/App.jsx';

/* ─── Shared sub-components ─── */

function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-black text-slate-800">{value ?? '—'}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ContactsTable({ contacts, onMarkRead }) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <InboxIcon className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">No contact messages yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Message</th>
            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {contacts.map((c) => (
            <tr key={c.id} className={`transition hover:bg-slate-50 ${c.status === 'NEW' ? 'bg-emerald-50/40' : ''}`}>
              <td className="px-4 py-3 font-semibold text-slate-700">{c.name}</td>
              <td className="px-4 py-3 text-slate-500">{c.phone}</td>
              <td className="px-4 py-3 text-slate-600 max-w-xs">
                <p className="line-clamp-2">{c.message}</p>
              </td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  c.status === 'NEW' ? 'bg-emerald-100 text-emerald-700'
                  : c.status === 'READ' ? 'bg-slate-100 text-slate-500'
                  : 'bg-blue-100 text-blue-700'
                }`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {c.status === 'NEW' && (
                  <button onClick={() => onMarkRead(c.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--brand)] transition hover:bg-emerald-50">
                    Mark Read
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Home view ─── */

function DashboardHome() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getContacts({ limit: 20 })])
      .then(([s, c]) => { setStats(s); setContacts(c.contacts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkRead(id) {
    await markContactRead(id);
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'READ' } : c));
    setStats((s) => s ? { ...s, new_count: Math.max(0, s.new_count - 1), read_count: s.read_count + 1 } : s);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[var(--brand-strong)] to-[var(--brand)] px-6 py-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Welcome back</p>
        <h2 className="mt-1 text-xl font-black">{currentUser?.name}</h2>
        <p className="mt-1 text-sm text-white/70">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={MessageSquare} label="Total Messages"  value={stats?.total}          color="bg-emerald-50 text-[var(--brand)]" />
        <StatsCard icon={Clock}         label="New Messages"    value={stats?.new_count}      color="bg-amber-50 text-amber-600" />
        <StatsCard icon={CheckCircle}   label="Read"            value={stats?.read_count}     color="bg-slate-100 text-slate-500" />
        <StatsCard icon={CheckCircle}   label="Resolved"        value={stats?.resolved_count} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-800">Contact Messages</h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            {stats?.new_count ?? 0} new
          </span>
        </div>
        <ContactsTable contacts={contacts} onMarkRead={handleMarkRead} />
      </div>
    </>
  );
}

/* ─── Page titles per route ─── */
const PAGE_TITLES = {
  '/dashboard':           'Dashboard',
  '/dashboard/contacts':  'Contact Messages',
  '/dashboard/tenants':   'Organizations',
  '/dashboard/users':     'Users',
  '/dashboard/students':  'Students',
  '/dashboard/teachers':  'Teachers',
  '/dashboard/academic':  'Academic Portal',
};

/* ─── Root layout ─── */

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  function renderContent() {
    if (pathname === '/dashboard/tenants')           return <TenantsPage />;
    if (pathname === '/dashboard/users')             return <UsersPage />;
    if (pathname === '/dashboard/students')          return <StudentsPage />;
    if (pathname === '/dashboard/teachers')          return <TeachersPage />;
    if (pathname.startsWith('/dashboard/academic'))  return <AcademicPage />;
    return <DashboardHome />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:flex lg:shrink-0">
        <DashboardSidebar activePath={pathname} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex h-full">
            <DashboardSidebar activePath={pathname} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
