import { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  InboxIcon,
  Megaphone,
  X,
  Loader2,
  Send,
  GraduationCap,
  BookOpen,
  BadgeDollarSign,
  CalendarDays,
  ArrowUpRight,
  BellRing,
  ClipboardList,
  CircleAlert,
  Users,
  Wallet,
  TrendingUp,
} from 'lucide-react';
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
import MessagesPage from '../../communication/pages/MessagesPage.jsx';
import HrPage from '../../hr/pages/HrPage.jsx';
import ReportsPage from '../../reports/pages/ReportsPage.jsx';
import SecurityPage from '../../security/pages/SecurityPage.jsx';
import AdminDocumentsPage from '../../documents/pages/AdminDocumentsPage.jsx';
import { getDashboardOverview, getContacts, getReports, getStats, markContactRead } from '../../../services/api/adminApi.js';
import { createNotice } from '../../../services/api/noticeApi.js';
import { useAuth, navigate } from '../../../app/App.jsx';

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

function DemoMetricCard({ icon: Icon, label, value, change, tone }) {
  const toneClasses = {
    brand: 'bg-[var(--brand-soft)] text-[var(--brand)]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{change}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, meta }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>}
        <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{title}</h3>
      </div>
      {meta && <div className="text-right text-xs font-semibold text-slate-400">{meta}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <span className="rounded-2xl bg-white p-3 text-slate-400 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
    </div>
  );
}

function ContactsTable({ contacts, onMarkRead }) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <InboxIcon className="mb-3 h-10 w-10" />
        <p className="text-sm font-medium">No contact messages yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Phone</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Message</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {contacts.map((c) => (
            <tr key={c.id} className={`transition hover:bg-slate-50 ${c.status === 'NEW' ? 'bg-emerald-50/40' : ''}`}>
              <td className="px-4 py-3 font-semibold text-slate-700">{c.name}</td>
              <td className="px-4 py-3 text-slate-500">{c.phone}</td>
              <td className="max-w-xs px-4 py-3 text-slate-600">
                <p className="line-clamp-2">{c.message}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(c.created_at)}</td>
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
                  <button
                    onClick={() => onMarkRead(c.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--brand)] transition hover:bg-emerald-50"
                  >
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

const TEACHER_NOTICE_AUDIENCES = {
  student: 'Students',
  teacher: 'Teachers',
  guardian: 'Guardians',
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
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Homework reminder"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Body</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                rows={4}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="Details..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                >
                  <option value="notice">Notice</option>
                  <option value="news">News</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Audience</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.audience}
                  onChange={(e) => set('audience', e.target.value)}
                >
                  {Object.entries(TEACHER_NOTICE_AUDIENCES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
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
function DashboardHome() {
  const { currentUser } = useAuth();
  const isTeacher = currentUser?.role === 'teacher';
  const [overview, setOverview] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);

  useEffect(() => {
    const canLoadReports = currentUser?.role === 'admin' || currentUser?.role === 'system_developer';
    const requests = [getDashboardOverview(), canLoadReports ? getReports() : Promise.resolve(null)];

    Promise.all(requests)
      .then(([nextOverview, nextReport]) => {
        setOverview(nextOverview);
        setReport(nextReport?.report || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser?.role]);

  async function handleMarkRead(id) {
    await markContactRead(id);
    setOverview((prev) => {
      if (!prev?.contacts) return prev;
      const wasNew = prev.contacts.items.some((item) => item.id === id && item.status === 'NEW');
      return {
        ...prev,
        contacts: {
          ...prev.contacts,
          items: prev.contacts.items.map((item) => item.id === id ? { ...item, status: 'READ' } : item),
          stats: {
            ...prev.contacts.stats,
            newCount: wasNew ? Math.max(0, prev.contacts.stats.newCount - 1) : prev.contacts.stats.newCount,
            readCount: wasNew ? prev.contacts.stats.readCount + 1 : prev.contacts.stats.readCount,
          },
        },
      };
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  const summary = overview?.summary || {
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    publishedNoticeCount: 0,
    attendanceToday: { total: 0, present: 0, absent: 0, percentage: 0 },
    fees: { outstandingAmount: 0, overdueInvoiceCount: 0, overdueAmount: 0 },
    upcomingExamCount: 0,
  };
  const finance = overview?.finance || { collectedThisMonth: 0, expensesThisMonth: 0, balance: 0 };
  const attention = overview?.attention || { lowAttendanceCount: 0, pendingLeaveCount: 0, pendingCorrectionCount: 0 };
  const contacts = overview?.contacts?.items || [];
  const contactStats = overview?.contacts?.stats || { total: 0, newCount: 0, readCount: 0, resolvedCount: 0 };

  const heroPriorities = [
    `${summary.upcomingExamCount} upcoming exams`,
    `${summary.fees.overdueInvoiceCount} overdue invoices`,
    `${attention.pendingLeaveCount} leave requests pending`,
  ].join(', ');

  const metricCards = [
    {
      icon: GraduationCap,
      label: 'Students',
      value: formatNumber(summary.studentCount),
      change: `${formatNumber(summary.classCount)} active class groups`,
      tone: 'brand',
    },
    {
      icon: BookOpen,
      label: 'Teachers',
      value: formatNumber(summary.teacherCount),
      change: `${formatNumber(summary.publishedNoticeCount)} published notices`,
      tone: 'blue',
    },
    {
      icon: ClipboardList,
      label: 'Attendance Today',
      value: formatPercent(summary.attendanceToday.percentage),
      change: `${formatNumber(summary.attendanceToday.absent)} students absent`,
      tone: 'emerald',
    },
    {
      icon: BadgeDollarSign,
      label: 'Pending Fees',
      value: formatCurrency(summary.fees.outstandingAmount),
      change: `${formatNumber(summary.fees.overdueInvoiceCount)} overdue invoices`,
      tone: 'amber',
    },
  ];

  const attentionItems = [
    { label: 'Students below 80% attendance', value: attention.lowAttendanceCount, tone: 'bg-rose-50 text-rose-600' },
    { label: 'Leave requests awaiting approval', value: attention.pendingLeaveCount, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Attendance corrections pending', value: attention.pendingCorrectionCount, tone: 'bg-blue-50 text-blue-700' },
  ];

  const financeTiles = [
    {
      icon: Wallet,
      label: 'Collected This Month',
      value: formatCurrency(finance.collectedThisMonth),
      note: `Payments recorded in ${formatMonthLabel(overview?.filters?.month)}`,
    },
    {
      icon: CircleAlert,
      label: 'Overdue Amount',
      value: formatCurrency(summary.fees.overdueAmount),
      note: `${formatNumber(summary.fees.overdueInvoiceCount)} invoices past due date`,
    },
    {
      icon: TrendingUp,
      label: 'Net Ledger Balance',
      value: formatCurrency(finance.balance),
      note: `${formatCurrency(finance.expensesThisMonth)} spent this month`,
    },
  ];

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_28%),linear-gradient(135deg,var(--brand-strong),var(--brand),#2f4f8f)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(32,27,70,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">School command center</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Good day, {currentUser?.name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
              Monitor live attendance, notices, routines, finances, and communication from one dashboard.
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Today</p>
              <p className="mt-2 text-sm font-semibold text-white/90">{formatLongDate(overview?.filters?.date)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Priority</p>
              <p className="mt-2 text-sm font-semibold text-white/90">{heroPriorities}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-secondary border-white/15 bg-white text-[var(--brand)] hover:bg-white/90">
            <CalendarDays className="h-4 w-4" />
            {overview?.filters?.weekday || 'Schedule'}
          </button>
          <button className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15">
            <ArrowUpRight className="mr-2 inline h-4 w-4" />
            {formatNumber(summary.upcomingExamCount)} exams in next 7 days
          </button>
          {isTeacher && (
            <button
              onClick={() => setNoticeModalOpen(true)}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Megaphone className="mr-2 inline h-4 w-4" />
              Publish Notice
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <DemoMetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="panel p-6">
          <SectionHeader eyebrow="Today" title="Schedule & operations" meta={overview?.filters?.weekday || ''} />
          {overview?.schedule?.length ? (
            <div className="space-y-4">
              {overview.schedule.map((item) => (
                <div key={item.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-[var(--brand)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{item.subject}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">
                        {item.startTime || `Period ${item.periodNumber}`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatScheduleDetail(item)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No routine entries for today" body="Add class routine rows in the academic section to populate this schedule automatically." />
          )}
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <SectionHeader eyebrow="Notices" title="Announcements" />
            {overview?.announcements?.length ? (
              <div className="space-y-3">
                {overview.announcements.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-600">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-400">{item.type} | {item.authorName} | {formatDateTime(item.publishedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={BellRing} title="No published notices" body="New notices will appear here as soon as they are published." />
            )}
          </div>

          <div className="panel p-6">
            <SectionHeader eyebrow="Watchlist" title="Needs attention" />
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${item.tone}`}>{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Academic</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Class performance overview</h3>
            </div>
            <span className="muted-chip">Live results</span>
          </div>
          {overview?.performance?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Class</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Students</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Attendance</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Avg. Score</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.performance.map((row) => (
                    <tr key={row.classId} className="border-b border-slate-50 last:border-b-0">
                      <td className="px-6 py-4 font-bold text-slate-800">{row.className}{row.section ? ` - ${row.section}` : ''}</td>
                      <td className="px-6 py-4 text-slate-600">{formatNumber(row.studentCount)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatPercent(row.attendancePct)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatPercent(row.averageMarks)}</td>
                      <td className={`px-6 py-4 font-bold ${row.passRate >= 75 ? 'text-emerald-600' : row.passRate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {formatPercent(row.passRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState icon={BookOpen} title="No performance data yet" body="Mark attendance and record exam results to populate class-level performance metrics." />
            </div>
          )}
        </div>

        <div className="panel p-6">
          <SectionHeader eyebrow="Quick actions" title="Frequently used" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { icon: GraduationCap, label: 'Add student', detail: 'Create a new student profile' },
              { icon: ClipboardList, label: 'Mark attendance', detail: 'Open the attendance workflow' },
              { icon: Megaphone, label: 'Create notice', detail: 'Publish a school announcement' },
              { icon: BadgeDollarSign, label: 'Collect fee', detail: 'Record payment and receipt' },
            ].map((item) => (
              <button key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition hover:border-slate-200 hover:bg-white">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-800">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{item.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-6">
          <SectionHeader eyebrow="Finance" title="Collection snapshot" meta={formatMonthLabel(overview?.filters?.month)} />
          <div className="space-y-4">
            {financeTiles.map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-800">Contact Messages</h3>
            <div className="flex gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {formatNumber(contactStats.newCount)} new
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                {formatNumber(contactStats.total)} total
              </span>
            </div>
          </div>
          <ContactsTable contacts={contacts} onMarkRead={handleMarkRead} />
        </div>
      </div>

      {report && (
        <>
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="panel overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Enrollment</p>
                  <h3 className="mt-1 font-bold text-slate-800">Class-wise student count</h3>
                </div>
                <span className="muted-chip">From reports</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Class</th>
                      <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Section</th>
                      <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Year</th>
                      <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.classWiseStudents || []).slice(0, 6).map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 last:border-b-0">
                        <td className="px-5 py-4 font-bold text-slate-800">{row.name}</td>
                        <td className="px-5 py-4 text-slate-600">{row.section || '-'}</td>
                        <td className="px-5 py-4 text-slate-600">{row.academicYear || '-'}</td>
                        <td className="px-5 py-4 text-slate-600">{formatNumber(row.studentCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Attendance</p>
                  <h3 className="mt-1 font-bold text-slate-800">Absent student list</h3>
                </div>
                <span className="muted-chip">{formatLongDate(report.filters?.date)}</span>
              </div>
              {(report.absentStudents || []).length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Student</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Class</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Roll</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.absentStudents || []).slice(0, 6).map((row) => (
                        <tr key={row.studentUserId} className="border-b border-slate-50 last:border-b-0">
                          <td className="px-5 py-4 font-bold text-slate-800">{row.studentName}</td>
                          <td className="px-5 py-4 text-slate-600">{row.className || '-'}</td>
                          <td className="px-5 py-4 text-slate-600">{row.rollNumber || '-'}</td>
                          <td className="px-5 py-4 text-slate-600">{row.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState icon={ClipboardList} title="No absent students today" body="Attendance looks clean for the selected report date." />
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="panel p-6">
              <SectionHeader eyebrow="Admissions" title="Application summary" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                <StatsCard icon={MessageSquare} label="Total" value={formatNumber(report.admissions?.total)} color="bg-slate-100 text-slate-600" />
                <StatsCard icon={Clock} label="Last 30 Days" value={formatNumber(report.admissions?.last30Days)} color="bg-blue-50 text-blue-600" />
                <StatsCard icon={Clock} label="Submitted" value={formatNumber(report.admissions?.submitted)} color="bg-amber-50 text-amber-600" />
                <StatsCard icon={CheckCircle} label="Accepted" value={formatNumber(report.admissions?.accepted)} color="bg-emerald-50 text-emerald-600" />
                <StatsCard icon={CalendarDays} label="Test Scheduled" value={formatNumber(report.admissions?.testScheduled)} color="bg-blue-50 text-blue-600" />
                <StatsCard icon={CircleAlert} label="Rejected" value={formatNumber(report.admissions?.rejected)} color="bg-rose-50 text-rose-600" />
              </div>
            </div>

            <div className="panel p-6">
              <SectionHeader eyebrow="Fees" title="Due and collection reports" />
              <div className="grid gap-3 sm:grid-cols-2">
                <StatsCard icon={BadgeDollarSign} label="Billed" value={formatCurrency(report.fees?.billed)} color="bg-blue-50 text-blue-600" />
                <StatsCard icon={BadgeDollarSign} label="Collected" value={formatCurrency(report.fees?.collected)} color="bg-emerald-50 text-emerald-600" />
                <StatsCard icon={BadgeDollarSign} label="Outstanding Due" value={formatCurrency(report.fees?.due)} color="bg-rose-50 text-rose-600" />
                <StatsCard icon={ClipboardList} label="Invoices" value={formatNumber(report.fees?.invoiceCount)} color="bg-amber-50 text-amber-600" />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Paid {formatNumber(report.fees?.paidCount)} | Partial {formatNumber(report.fees?.partialCount)} | Unpaid {formatNumber(report.fees?.unpaidCount)}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={MessageSquare} label="Total Messages" value={formatNumber(contactStats.total)} color="bg-emerald-50 text-[var(--brand)]" />
        <StatsCard icon={Clock} label="New Messages" value={formatNumber(contactStats.newCount)} color="bg-amber-50 text-amber-600" />
        <StatsCard icon={CheckCircle} label="Read" value={formatNumber(contactStats.readCount)} color="bg-slate-100 text-slate-500" />
        <StatsCard icon={Users} label="Resolved" value={formatNumber(contactStats.resolvedCount)} color="bg-blue-50 text-blue-600" />
      </div>

      {noticeModalOpen && <PublishNoticeModal onClose={() => setNoticeModalOpen(false)} />}
    </>
  );
}

function DashboardContactsPage() {
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getContacts({ limit: 50 })])
      .then(([nextStats, nextContacts]) => {
        setStats(nextStats);
        setContacts(nextContacts.contacts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkRead(id) {
    await markContactRead(id);
    setContacts((prev) => prev.map((item) => item.id === id ? { ...item, status: 'READ' } : item));
    setStats((prev) => prev ? {
      ...prev,
      new_count: Math.max(0, Number(prev.new_count || 0) - 1),
      read_count: Number(prev.read_count || 0) + 1,
    } : prev);
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={MessageSquare} label="Total Messages" value={formatNumber(stats?.total)} color="bg-emerald-50 text-[var(--brand)]" />
        <StatsCard icon={Clock} label="New Messages" value={formatNumber(stats?.new_count)} color="bg-amber-50 text-amber-600" />
        <StatsCard icon={CheckCircle} label="Read" value={formatNumber(stats?.read_count)} color="bg-slate-100 text-slate-500" />
        <StatsCard icon={Users} label="Resolved" value={formatNumber(stats?.resolved_count)} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="panel overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Inbox</p>
            <h3 className="mt-1 font-bold text-slate-800">Contact Messages</h3>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            {formatNumber(stats?.new_count)} new
          </span>
        </div>
        <ContactsTable contacts={contacts} onMarkRead={handleMarkRead} />
      </div>
    </div>
  );
}
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/dashboard/contacts': 'Contact Messages',
  '/dashboard/messages': 'Messages',
  '/dashboard/tenants': 'Organizations',
  '/dashboard/users': 'Users',
  '/dashboard/students': 'Students',
  '/dashboard/teachers': 'Teachers',
  '/dashboard/hr': 'HR & Staff',
  '/dashboard/academic': 'Academic Portal',
  '/dashboard/notices': 'Notices & News',
  '/dashboard/gallery': 'Gallery',
  '/dashboard/admissions': 'Admissions',
  '/dashboard/fees': 'Fees & Accounting',
  '/dashboard/reports': 'Reports',
  '/dashboard/security': 'Security & Audit',
  '/dashboard/documents': 'Documents',
};

const TEACHER_ALLOWED_PATHS = ['/dashboard/contacts', '/dashboard/messages', '/dashboard/academic', '/dashboard/documents'];
const ACCOUNTANT_ALLOWED_PATHS = ['/dashboard/fees', '/dashboard/hr', '/dashboard/messages', '/dashboard/documents'];

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
  const teacherAllowed = pathname === '/dashboard'
    || TEACHER_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isTeacher && !teacherAllowed) {
    navigate('/dashboard/academic');
    return null;
  }

  const isAccountant = currentUser?.role === 'accountant';
  const accountantAllowed = pathname === '/dashboard'
    || ACCOUNTANT_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isAccountant && !accountantAllowed) {
    navigate('/dashboard/fees');
    return null;
  }

  function renderContent() {
    if (pathname === '/dashboard/contacts') return <DashboardContactsPage />;
    if (pathname === '/dashboard/messages') return <MessagesPage />;
    if (pathname === '/dashboard/tenants') return <TenantsPage />;
    if (pathname === '/dashboard/users') return <UsersPage />;
    if (pathname === '/dashboard/students') return <StudentsPage />;
    if (pathname === '/dashboard/teachers') return <TeachersPage />;
    if (pathname === '/dashboard/hr') return <HrPage />;
    if (pathname.startsWith('/dashboard/academic')) return <AcademicPage />;
    if (pathname === '/dashboard/notices') return <NoticesPage />;
    if (pathname === '/dashboard/gallery') return <GalleryPage />;
    if (pathname === '/dashboard/admissions') return <AdmissionsPage />;
    if (pathname === '/dashboard/fees') return <FeesPage />;
    if (pathname === '/dashboard/reports') return <ReportsPage />;
    if (pathname === '/dashboard/security') return <SecurityPage />;
    if (pathname === '/dashboard/documents') return <AdminDocumentsPage />;
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
function formatNumber(value) {
  return new Intl.NumberFormat('en-BD').format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLongDate(value) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthLabel(value) {
  if (!value) return 'Current month';
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatScheduleDetail(item) {
  const parts = [];
  if (item.className) parts.push(item.className + (item.section ? ` - ${item.section}` : ''));
  if (item.teacherName) parts.push(item.teacherName);
  if (item.room) parts.push(`Room ${item.room}`);
  if (item.endTime) parts.push(`Ends ${item.endTime}`);
  return parts.join(' | ');
}







