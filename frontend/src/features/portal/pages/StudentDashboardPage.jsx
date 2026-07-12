import { useState, useEffect } from 'react';
import { Loader2, ClipboardList, BookMarked, Calendar, FileText, Award, CreditCard, BadgeCheck, IdCard, Send } from 'lucide-react';
import { navigate } from '../../../app/App.jsx';
import DashboardHeader from '../../dashboard/components/DashboardHeader.jsx';
import StudentSidebar from '../components/StudentSidebar.jsx';
import { Card, InfoRow } from '../components/Card.jsx';
import StudentProfile from '../components/StudentProfile.jsx';
import ResultsTable from '../components/ResultsTable.jsx';
import AttendanceStats from '../components/AttendanceStats.jsx';
import RoutineList from '../components/RoutineList.jsx';
import NoticesFeed from '../components/NoticesFeed.jsx';
import FeeLedger from '../components/FeeLedger.jsx';
import MessagesPage from '../../communication/pages/MessagesPage.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';
import { getMyResults, getMyAttendance, getRoutine } from '../../../services/api/academicApi.js';

const PAGE_TITLES = {
  '/portal':            'Overview',
  '/portal/results':    'Exam Results',
  '/portal/attendance': 'Attendance',
  '/portal/routine':    'Class Routine',
  '/portal/notices':    'Notices',
  '/portal/messages':   'Messages',
  '/portal/fees':       'Fees',
  '/portal/documents':  'Documents',
  '/portal/profile':    'My Profile',
};

function SectionSpinner() {
  return (
    <div className="flex h-24 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
    </div>
  );
}

const DOCUMENTS = [
  { type: 'report-card', title: 'Designed Report Card', desc: 'Formal academic report with results, attendance, school header, and signatures.', icon: Award },
  { type: 'certificate', title: 'Certificate', desc: 'Enrollment and character certificate with official signature areas.', icon: BadgeCheck },
  { type: 'transfer-certificate', title: 'Transfer Certificate', desc: 'School leaving certificate with student register details and clearance notes.', icon: Send },
  { type: 'admit-card', title: 'Admit Card', desc: 'Exam admit card with student details, photo slot, rules, and authorization.', icon: FileText },
  { type: 'id-card', title: 'Student ID Card', desc: 'Compact identity card template with school branding and signature block.', icon: IdCard },
  { type: 'fee-receipt', title: 'Fee Receipt', desc: 'Printable receipt for the latest recorded payment.', icon: CreditCard },
];

function DocumentsCenter() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {DOCUMENTS.map(({ type, title, desc, icon: Icon }) => (
        <button
          key={type}
          onClick={() => navigate(`/portal/document?type=${type}`)}
          className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-lg"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--brand)]">
            <Icon className="h-5 w-5" />
          </span>
          <p className="mt-4 font-black text-slate-800">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
          <span className="mt-4 inline-flex text-xs font-black uppercase tracking-widest text-[var(--brand)]">Open template</span>
        </button>
      ))}
    </div>
  );
}

function Overview({ profile, attendance, academicLoading }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Academic">
        <InfoRow icon={ClipboardList} label="Student ID"     value={profile.studentId} />
        <InfoRow icon={BookMarked}    label="Class / Grade"  value={profile.className} />
        <InfoRow icon={BookMarked}    label="Section"        value={profile.section} />
        <InfoRow icon={ClipboardList} label="Roll Number"    value={profile.rollNumber} />
        <InfoRow icon={Calendar}      label="Admission Date" value={profile.admissionDate} />
      </Card>

      <Card title="Attendance">
        {academicLoading ? (
          <SectionSpinner />
        ) : attendance ? (
          <AttendanceStats summary={attendance} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">Not assigned to a class yet.</p>
        )}
      </Card>
    </div>
  );
}

export default function StudentDashboardPage() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [academicLoading, setAcademicLoading] = useState(false);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    getMyProfile()
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Fetch once up front and hand down to whichever section is active -
  // no re-fetching when the student clicks between nav items.
  useEffect(() => {
    if (!profile) return;
    setAcademicLoading(true);
    const classId = profile.classId;
    Promise.all([
      getMyResults(),
      classId ? getMyAttendance(classId) : Promise.resolve({ summary: null }),
      classId ? getRoutine(classId) : Promise.resolve({ routine: [] }),
    ])
      .then(([rd, ad, rt]) => {
        setResults(rd.results || []);
        setAttendance(ad.summary || null);
        setRoutine(rt.routine || []);
      })
      .catch(() => {})
      .finally(() => setAcademicLoading(false));
  }, [profile]);

  const title = PAGE_TITLES[pathname] ?? 'Overview';

  function renderContent() {
    if (profileLoading || !profile) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      );
    }

    if (pathname === '/portal/results') {
      return (
        <Card title="Exam Results">
          {academicLoading ? <SectionSpinner /> : <ResultsTable results={results} />}
        </Card>
      );
    }
    if (pathname === '/portal/attendance') {
      return (
        <Card title="Attendance">
          {academicLoading ? (
            <SectionSpinner />
          ) : attendance ? (
            <AttendanceStats summary={attendance} />
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">Not assigned to a class yet.</p>
          )}
        </Card>
      );
    }
    if (pathname === '/portal/routine') {
      return (
        <Card title="Class Routine">
          {academicLoading ? <SectionSpinner /> : <RoutineList routine={routine} />}
        </Card>
      );
    }
    if (pathname === '/portal/notices') {
      return (
        <Card title="Notices">
          <NoticesFeed />
        </Card>
      );
    }
    if (pathname === '/portal/messages') {
      return <MessagesPage />;
    }
    if (pathname === '/portal/fees') {
      return (
        <Card title="Fees & Payments">
          <FeeLedger />
        </Card>
      );
    }
    if (pathname === '/portal/documents') {
      return <DocumentsCenter />;
    }
    if (pathname === '/portal/profile') {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <StudentProfile profile={profile} />
        </div>
      );
    }
    return <Overview profile={profile} attendance={attendance} academicLoading={academicLoading} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:flex lg:shrink-0">
        <StudentSidebar activePath={pathname} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex h-full">
            <StudentSidebar activePath={pathname} onClose={() => setSidebarOpen(false)} />
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

