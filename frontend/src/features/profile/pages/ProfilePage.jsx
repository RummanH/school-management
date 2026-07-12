import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { changeMyPassword, getAccountProfile, updateAccountProfile } from '../../../services/api/authApi.js';
import DashboardSidebar from '../../dashboard/components/DashboardSidebar.jsx';
import DashboardHeader from '../../dashboard/components/DashboardHeader.jsx';
import StudentSidebar from '../../portal/components/StudentSidebar.jsx';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read the selected photo.'));
    reader.readAsDataURL(file);
  });
}

const ROLE_LABELS = {
  system_developer: 'System Developer',
  admin: 'Admin',
  accountant: 'Accountant',
  teacher: 'Teacher',
  student: 'Student',
  guardian: 'Guardian',
};

const DASHBOARD_ROLES = ['system_developer', 'admin', 'accountant', 'teacher'];

export default function ProfilePage() {
  const { currentUser, currentTenant, refreshAuth, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [profileType, setProfileType] = useState('user');
  const [photoData, setPhotoData] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    photoUrl: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    designation: '',
    department: '',
    subjects: '',
    qualification: '',
    className: '',
    section: '',
    rollNumber: '',
    studentId: '',
    employeeId: '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    getAccountProfile()
      .then((data) => {
        setProfileType(data.type || 'user');
        const profile = data.profile || {};
        setForm({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          photoUrl: profile.photoUrl || '',
          dateOfBirth: profile.dateOfBirth || '',
          gender: profile.gender || '',
          bloodGroup: profile.bloodGroup || '',
          guardianName: profile.guardianName || '',
          guardianPhone: profile.guardianPhone || '',
          guardianRelation: profile.guardianRelation || '',
          designation: profile.designation || '',
          department: profile.department || '',
          subjects: profile.subjects || '',
          qualification: profile.qualification || '',
          className: profile.className || '',
          section: profile.section || '',
          rollNumber: profile.rollNumber || '',
          studentId: profile.studentId || '',
          employeeId: profile.employeeId || '',
        });
      })
      .catch((err) => setError(err.message || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5MB or smaller.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoData(dataUrl);
      setRemovePhoto(false);
      setSuccess('');
      setError('');
    } catch (err) {
      setError(err.message || 'Could not read the selected photo.');
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianRelation: form.guardianRelation,
        designation: form.designation,
        department: form.department,
        subjects: form.subjects,
        qualification: form.qualification,
        photoData: photoData || undefined,
        removePhoto,
      };
      const data = await updateAccountProfile(payload);
      const profile = data.profile || {};
      setProfileType(data.type || 'user');
      setForm((prev) => ({
        ...prev,
        photoUrl: profile.photoUrl || '',
        name: profile.name || prev.name,
        email: profile.email || prev.email,
        phone: profile.phone || '',
        address: profile.address || '',
      }));
      setPhotoData('');
      setRemovePhoto(false);
      await refreshAuth().catch(() => {});
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  const roleLabel = ROLE_LABELS[currentUser?.role] || 'Account';
  const photoPreview = removePhoto ? '' : photoData || form.photoUrl || '';
  const backPath = currentUser?.role === 'guardian' ? '/portal' : DASHBOARD_ROLES.includes(currentUser?.role) ? '/dashboard' : '/portal';
  const useDashboardShell = DASHBOARD_ROLES.includes(currentUser?.role);
  const useStudentShell = currentUser?.role === 'student';

  const page = loading ? (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
    </div>
  ) : (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate(backPath)}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-black text-slate-900">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Update your profile, photo, and password.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Role</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{roleLabel}</p>
          {currentTenant?.name && <p className="mt-1 text-xs text-slate-400">{currentTenant.name}</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <form onSubmit={saveProfile} className="panel p-6">
          <div className="mb-6 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-6">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="h-24 w-24 rounded-3xl object-cover shadow-sm" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--brand-soft)] text-[var(--brand)] shadow-sm">
                  <User className="h-9 w-9" />
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 flex cursor-pointer items-center justify-center rounded-full bg-[var(--brand)] p-2 text-white shadow-lg hover:opacity-90">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>

            <div className="flex-1">
              <p className="text-lg font-black text-slate-900">{form.name || currentUser?.name}</p>
              <p className="mt-1 text-sm text-slate-500">{form.email || currentUser?.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <label className="btn-secondary cursor-pointer">
                  <Upload className="h-4 w-4" /> Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                {(form.photoUrl || photoData) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoData('');
                      setRemovePhoto(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="btn-ghost"
                  >
                    <Trash2 className="h-4 w-4" /> Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <Feedback tone="error">{error}</Feedback>}
          {success && <Feedback tone="success">{success}</Feedback>}

          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-base font-black text-slate-900">Basic Information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" icon={User} value={form.name} onChange={(v) => setField('name', v)} required />
                <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(v) => setField('email', v)} required />
                <Field label="Phone" icon={Phone} value={form.phone} onChange={(v) => setField('phone', v)} />
                <Field label="Address" icon={MapPin} value={form.address} onChange={(v) => setField('address', v)} />
              </div>
            </section>

            {profileType === 'student' && (
              <section>
                <h2 className="text-base font-black text-slate-900">Student Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} />
                  <Field label="Gender" value={form.gender} onChange={(v) => setField('gender', v)} />
                  <Field label="Blood Group" value={form.bloodGroup} onChange={(v) => setField('bloodGroup', v)} />
                  <Field label="Guardian Name" value={form.guardianName} onChange={(v) => setField('guardianName', v)} />
                  <Field label="Guardian Phone" value={form.guardianPhone} onChange={(v) => setField('guardianPhone', v)} />
                  <Field label="Guardian Relation" value={form.guardianRelation} onChange={(v) => setField('guardianRelation', v)} />
                </div>
              </section>
            )}

            {profileType === 'teacher' && (
              <section>
                <h2 className="text-base font-black text-slate-900">Teacher Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} />
                  <Field label="Gender" value={form.gender} onChange={(v) => setField('gender', v)} />
                  <Field label="Blood Group" value={form.bloodGroup} onChange={(v) => setField('bloodGroup', v)} />
                  <Field label="Designation" value={form.designation} onChange={(v) => setField('designation', v)} />
                  <Field label="Department" value={form.department} onChange={(v) => setField('department', v)} />
                  <Field label="Subjects" value={form.subjects} onChange={(v) => setField('subjects', v)} />
                  <Field label="Qualification" value={form.qualification} onChange={(v) => setField('qualification', v)} />
                </div>
              </section>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {(profileType === 'student' || profileType === 'teacher') && (
            <div className="panel p-6">
              <h2 className="text-base font-black text-slate-900">Reference Information</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {profileType === 'student' ? (
                  <>
                    <SummaryRow label="Student ID" value={form.studentId || '-'} />
                    <SummaryRow label="Class" value={form.className || '-'} />
                    <SummaryRow label="Section" value={form.section || '-'} />
                    <SummaryRow label="Roll Number" value={form.rollNumber || '-'} />
                  </>
                ) : (
                  <>
                    <SummaryRow label="Employee ID" value={form.employeeId || '-'} />
                    <SummaryRow label="Department" value={form.department || '-'} />
                    <SummaryRow label="Designation" value={form.designation || '-'} />
                    <SummaryRow label="Subjects" value={form.subjects || '-'} />
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={changePassword} className="panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">Change Password</h2>
                <p className="text-sm text-slate-500">Update your login password.</p>
              </div>
            </div>

            {passwordError && <Feedback tone="error">{passwordError}</Feedback>}
            {passwordSuccess && <Feedback tone="success">{passwordSuccess}</Feedback>}

            <div className="mt-4 space-y-4">
              <Field label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(v) => setPasswordForm((prev) => ({ ...prev, currentPassword: v }))} required />
              <Field label="New Password" type="password" value={passwordForm.newPassword} onChange={(v) => setPasswordForm((prev) => ({ ...prev, newPassword: v }))} required />
              <Field label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(v) => setPasswordForm((prev) => ({ ...prev, confirmPassword: v }))} required />
            </div>

            <p className="mt-4 text-xs text-slate-500">Password must be at least 8 characters and include one uppercase letter and one number.</p>

            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={passwordSaving} className="btn-primary disabled:opacity-60">
                {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          <div className="panel p-6">
            <h2 className="text-base font-black text-slate-900">Account Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <SummaryRow label="Role" value={roleLabel} />
              <SummaryRow label="Organization" value={currentTenant?.name || 'Platform'} />
              <SummaryRow label="Login Email" value={form.email || currentUser?.email || '-'} />
              <SummaryRow label="Contact Phone" value={form.phone || '-'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (useDashboardShell) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <div className="hidden lg:flex lg:shrink-0">
          <DashboardSidebar activePath="/account" />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex h-full">
              <DashboardSidebar activePath="/account" onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader title="Account Settings" onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{page}</main>
        </div>
      </div>
    );
  }

  if (useStudentShell) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <div className="hidden lg:flex lg:shrink-0">
          <StudentSidebar activePath="/account" />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex h-full">
              <StudentSidebar activePath="/account" onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader title="Account Settings" onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{page}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-black text-slate-800">Account Settings</p>
            <p className="text-[11px] text-slate-400">{currentUser?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/portal')} className="btn-ghost">Back to Portal</button>
            <button onClick={logout} className="btn-ghost">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{page}</main>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-800">{value}</span>
    </div>
  );
}

function Feedback({ tone, children }) {
  const classes = tone === 'success'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : 'border-red-100 bg-red-50 text-red-700';

  return <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>{children}</div>;
}


