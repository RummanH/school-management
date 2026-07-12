import { useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, Users, LogOut, Globe, Loader2,
  User, Mail, Phone, MapPin, Calendar, Droplets, Baby,
  BookMarked, ClipboardList, Building2, Award, LayoutDashboard, Printer, FileText, BadgeCheck, IdCard, CreditCard, Send, Settings,
} from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';
import { getMyWards, getWardResults, getWardAttendance } from '../../../services/api/guardianApi.js';
import { Card, InfoRow } from '../components/Card.jsx';
import ResultsTable from '../components/ResultsTable.jsx';
import AttendanceStats from '../components/AttendanceStats.jsx';
import NoticesFeed from '../components/NoticesFeed.jsx';
import FeeLedger from '../components/FeeLedger.jsx';
import StudentDashboardPage from './StudentDashboardPage.jsx';
import MessagesPage from '../../communication/pages/MessagesPage.jsx';

const ROLE_CONFIG = {
  student:  { label: 'Student',  color: 'bg-purple-500',  Icon: GraduationCap },
  teacher:  { label: 'Teacher',  color: 'bg-emerald-500', Icon: BookOpen },
  guardian: { label: 'Guardian', color: 'bg-amber-500',   Icon: Users },
};

function TeacherProfile({ profile }) {
  return (
    <>
      <Card title="Professional">
        <InfoRow icon={ClipboardList} label="Employee ID"   value={profile.employeeId} />
        <InfoRow icon={Award}         label="Designation"   value={profile.designation} />
        <InfoRow icon={Building2}     label="Department"    value={profile.department} />
        <InfoRow icon={BookMarked}    label="Subjects"      value={profile.subjects} />
        <InfoRow icon={GraduationCap} label="Qualification" value={profile.qualification} />
        <InfoRow icon={Calendar}      label="Joining Date"  value={profile.joiningDate} />
      </Card>

      <Card title="Personal">
        <InfoRow icon={Calendar}  label="Date of Birth" value={profile.dateOfBirth} />
        <InfoRow icon={User}      label="Gender"        value={profile.gender} />
        <InfoRow icon={Droplets}  label="Blood Group"   value={profile.bloodGroup} />
        <InfoRow icon={Phone}     label="Phone"         value={profile.phone} />
        <InfoRow icon={MapPin}    label="Address"       value={profile.address} />
      </Card>
    </>
  );
}

function GuardianPortal() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getMyWards()
      .then((d) => {
        const list = d.wards || [];
        setWards(list);
        if (list.length) setSelectedId(list[0].userId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    Promise.all([getWardResults(selectedId), getWardAttendance(selectedId)])
      .then(([rd, ad]) => {
        setResults(rd.results || []);
        setAttendance(ad.summary || null);
      })
      .catch(() => { setResults([]); setAttendance(null); })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (!wards.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
        <Baby className="mx-auto mb-3 h-10 w-10" />
        <p className="text-sm font-medium">No students linked yet.</p>
        <p className="mt-1 text-xs">Contact your administrator to link your ward's account.</p>
      </div>
    );
  }

  const selectedWard = wards.find((w) => w.userId === selectedId);

  return (
    <div className="space-y-4">
      {wards.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {wards.map((w) => (
            <button
              key={w.userId}
              onClick={() => setSelectedId(w.userId)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedId === w.userId
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      {selectedWard && (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {[
              ['report-card', 'Report Card', Printer],
              ['certificate', 'Certificate', BadgeCheck],
              ['transfer-certificate', 'Transfer', Send],
              ['admit-card', 'Admit Card', FileText],
              ['id-card', 'ID Card', IdCard],
              ['fee-receipt', 'Receipt', CreditCard],
            ].map(([type, label, Icon]) => (
              <button
                key={type}
                onClick={() => navigate(`/portal/document?type=${type}&student=${selectedWard.userId}`)}
                className="btn-secondary"
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Ward Profile">
              <InfoRow icon={GraduationCap} label="Name"        value={selectedWard.name} />
              <InfoRow icon={BookMarked}    label="Class"       value={selectedWard.className} />
              <InfoRow icon={BookMarked}    label="Section"     value={selectedWard.section} />
              <InfoRow icon={ClipboardList} label="Roll Number" value={selectedWard.rollNumber} />
            </Card>

            {detailLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
              </div>
            ) : (
              <Card title="Attendance">
                {attendance && <AttendanceStats summary={attendance} />}
              </Card>
            )}
          </div>
        </>
      )}

      {!detailLoading && (
        <Card title="Exam Results">
          <ResultsTable results={results} />
        </Card>
      )}

      <Card title="Fees & Payments">
        <FeeLedger studentUserId={selectedId} />
      </Card>

      <MessagesPage />

      <Card title="Notices">
        <NoticesFeed />
      </Card>
    </div>
  );
}

export default function PortalPage() {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const role     = currentUser?.role || 'student';
  const config   = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  const { Icon } = config;

  useEffect(() => {
    getMyProfile()
      .then(d => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Students get a full dashboard shell (sidebar + sections), not the
  // single-page layout below - see StudentDashboardPage.jsx.
  if (role === 'student') {
    return <StudentDashboardPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${config.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">{currentUser?.name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{config.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === 'teacher' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 sm:flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </button>
            )}
            <button
              onClick={() => navigate('/account')}
              className="hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 sm:flex"
            >
              <Settings className="h-3.5 w-3.5" /> Account
            </button>
            <button
              onClick={() => navigate('/')}
              className="hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 sm:flex"
            >
              <Globe className="h-3.5 w-3.5" /> Website
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Profile hero */}
        <div className={`mb-6 flex items-center gap-5 rounded-2xl p-6 text-white ${config.color}`}>
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-xl font-black">{currentUser?.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{currentUser?.email}</span>
              {currentUser?.tenantId && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold capitalize">{config.label}</span>
              )}
            </div>
          </div>
        </div>

        {role === 'guardian' ? (
          <GuardianPortal />
        ) : loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
            <Icon className="mx-auto mb-3 h-10 w-10" />
            <p className="text-sm font-medium">Profile not set up yet.</p>
            <p className="mt-1 text-xs">Contact your administrator to complete your profile.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {role === 'teacher' && <TeacherProfile profile={profile} />}
          </div>
        )}
      </main>
    </div>
  );
}


