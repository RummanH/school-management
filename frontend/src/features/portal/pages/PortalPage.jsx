import { useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, Users, LogOut, Globe, Loader2,
  User, Mail, Phone, MapPin, Calendar, Droplets, Baby,
  BookMarked, ClipboardList, Building2, Award,
} from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';

const ROLE_CONFIG = {
  student:  { label: 'Student',  color: 'bg-purple-500',  Icon: GraduationCap },
  teacher:  { label: 'Teacher',  color: 'bg-emerald-500', Icon: BookOpen },
  guardian: { label: 'Guardian', color: 'bg-amber-500',   Icon: Users },
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-700 break-words">{value}</p>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function StudentProfile({ profile }) {
  return (
    <>
      <Card title="Academic">
        <InfoRow icon={ClipboardList} label="Student ID"     value={profile.studentId} />
        <InfoRow icon={BookMarked}   label="Class / Grade"   value={profile.className} />
        <InfoRow icon={BookMarked}   label="Section"         value={profile.section} />
        <InfoRow icon={ClipboardList} label="Roll Number"    value={profile.rollNumber} />
        <InfoRow icon={Calendar}     label="Admission Date"  value={profile.admissionDate} />
      </Card>

      <Card title="Personal">
        <InfoRow icon={Calendar}  label="Date of Birth" value={profile.dateOfBirth} />
        <InfoRow icon={User}      label="Gender"        value={profile.gender} />
        <InfoRow icon={Droplets}  label="Blood Group"   value={profile.bloodGroup} />
        <InfoRow icon={Phone}     label="Phone"         value={profile.phone} />
        <InfoRow icon={MapPin}    label="Address"       value={profile.address} />
      </Card>

      {(profile.guardianName || profile.guardianPhone) && (
        <Card title="Guardian">
          <InfoRow icon={User}  label="Name"     value={profile.guardianName} />
          <InfoRow icon={Phone} label="Phone"    value={profile.guardianPhone} />
          <InfoRow icon={Users} label="Relation" value={profile.guardianRelation} />
        </Card>
      )}
    </>
  );
}

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

        {loading ? (
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
            {role === 'student'  && <StudentProfile profile={profile} />}
            {role === 'teacher'  && <TeacherProfile profile={profile} />}
          </div>
        )}
      </main>
    </div>
  );
}
