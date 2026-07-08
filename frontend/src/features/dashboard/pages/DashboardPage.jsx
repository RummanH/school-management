import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, InboxIcon, Megaphone, X, Loader2, Send } from 'lucide-react';
import DashboardSidebar from '../components/DashboardSidebar.jsx';
import DashboardHeader from '../components/DashboardHeader.jsx';
import TenantsPage from '../../platform/pages/TenantsPage.jsx';
import UsersPage from '../../platform/pages/UsersPage.jsx';
import StudentsPage from '../../students/pages/StudentsPage.jsx';
import TeachersPage from '../../teachers/pages/TeachersPage.jsx';
import AcademicPage from '../../academic/pages/AcademicPage.jsx';
import NoticesPage from '../../notices/pages/NoticesPage.jsx';
import GalleryPage from '../../gallery/pages/GalleryPage.jsx';
import AdmissionsPage from '../../admission/pages/AdmissionsPage.jsx';
import FeesPage from '../../fees/pages/FeesPage.jsx';
import ReportsPage from '../../reports/pages/ReportsPage.jsx';
import { getStats, getContacts, markContactRead } from '../../../services/api/adminApi.js';
import { createNotice } from '../../../services/api/noticeApi.js';
import { useAuth, navigate } from '../../../app/App.jsx';

/* Shared sub-components */

function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-black text-slate-800">{value ?? '-'}</p>
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

/* Publish notice (teacher quick action)
   Teachers can publish notices/news (backend already authorizes `staffAndAdmin`
      for POST /admin/notices), but unlike admin must not be able to post to
   the public website. The audience list here deliberately omits 'public'; the
   backend also enforces this (noticeService rejects a teacher posting with
   audience 'public'), so this is belt-and-suspenders, not the only guard. */
const TEACHER_NOTICE_AUDIENCES = {
  student:    'Students',
  teacher:    'Teachers',
  guardian:   'Guardians',
  all_portal: 'All portal users',
};

function PublishNoticeModal({ onClose }) {
  const [form, setForm] = useState({ title: '', body: '', type: 'notice', audience: 'student' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createNotice({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        audience: form.audience,
        isPublished: true,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Publish Notice</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Notice published.</p>
            <button onClick={onClose} className="btn-primary mx-auto">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Title *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Homework reminder" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Body</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                rows={4}
                value={form.body} onChange={(e) => set('body', e.target.value)}
                placeholder="Details..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="notice">Notice</option>
                  <option value="news">News</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Audience</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.audience} onChange={(e) => set('audience', e.target.value)}>
                  {Object.entries(TEACHER_NOTICE_AUDIENCES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={onClose} disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* Home view */

function DashboardHome() {
  const { currentUser } = useAuth();
  const isTeacher = currentUser?.role === 'teacher';
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[var(--brand-strong)] to-[var(--brand)] px-6 py-5 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Welcome back</p>
          <h2 className="mt-1 text-xl font-black">{currentUser?.name}</h2>
          <p className="mt-1 text-sm text-white/70">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setNoticeModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/25"
          >
            <Megaphone className="h-4 w-4" /> Publish Notice
          </button>
        )}
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

      {noticeModalOpen && <PublishNoticeModal onClose={() => setNoticeModalOpen(false)} />}
    </>
  );
}

/* Page titles per route */
const PAGE_TITLES = {
  '/dashboard':           'Dashboard',
  '/dashboard/contacts':  'Contact Messages',
  '/dashboard/tenants':   'Organizations',
  '/dashboard/users':     'Users',
  '/dashboard/students':  'Students',
  '/dashboard/teachers':  'Teachers',
  '/dashboard/academic':  'Academic Portal',
  '/dashboard/notices':   'Notices & News',
  '/dashboard/gallery':   'Gallery',
  '/dashboard/admissions':'Admissions',
  '/dashboard/fees':      'Fees & Accounting',
  '/dashboard/reports':   'Reports',
};

// Teachers only get the shared dashboard home/contacts plus Academic - every
// other sub-route (Students, Teachers, Users, Tenants, Notices, Gallery) is
// admin/system_developer only on the backend, so the UI must not even try to
// render them for a teacher (URL bar access, not just hidden nav links).
const TEACHER_ALLOWED_PATHS = ['/dashboard', '/dashboard/contacts', '/dashboard/academic'];

/* Root layout */

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  const isTeacher = currentUser?.role === 'teacher';
  const teacherAllowed = TEACHER_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isTeacher && !teacherAllowed) {
    navigate('/dashboard/academic');
    return null;
  }

  function renderContent() {
    if (pathname === '/dashboard/tenants')           return <TenantsPage />;
    if (pathname === '/dashboard/users')             return <UsersPage />;
    if (pathname === '/dashboard/students')          return <StudentsPage />;
    if (pathname === '/dashboard/teachers')          return <TeachersPage />;
    if (pathname.startsWith('/dashboard/academic'))  return <AcademicPage />;
    if (pathname === '/dashboard/notices')           return <NoticesPage />;
    if (pathname === '/dashboard/gallery')           return <GalleryPage />;
    if (pathname === '/dashboard/admissions')        return <AdmissionsPage />;
    if (pathname === '/dashboard/fees')              return <FeesPage />;
    if (pathname === '/dashboard/reports')           return <ReportsPage />;
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

