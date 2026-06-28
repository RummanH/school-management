import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, BookOpen, X, Save, CheckCircle, XCircle } from 'lucide-react';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher } from '../../../services/api/teacherApi.js';

const GENDERS        = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS   = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
const DESIGNATIONS   = ['Head Teacher', 'Senior Teacher', 'Assistant Teacher', 'Subject Teacher', 'Class Teacher', 'Lecturer', 'Professor', 'Other'];
const DEPARTMENTS    = ['Science', 'Arts', 'Commerce', 'Mathematics', 'Languages', 'Social Studies', 'Religious Studies', 'Physical Education', 'ICT', 'General'];
const QUALIFICATIONS = ['B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'B.A', 'M.A', 'B.B.A', 'M.B.A', 'PhD', 'Other'];

const EMPTY = {
  name: '', email: '', password: '', status: 'active',
  employeeId: '', designation: '', department: '', subjects: '',
  qualification: '', joiningDate: '', dateOfBirth: '',
  gender: '', bloodGroup: '', phone: '', address: '',
};

function FieldLabel({ children, required }) {
  return (
    <label className="mb-1 block text-xs font-bold text-slate-600">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none
        focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none
        focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
      {...props}
    >
      {children}
    </select>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}

function Confirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">Delete Teacher</h3>
          <p className="mt-1 text-sm text-slate-500">Delete <strong>{name}</strong> and their profile? This cannot be undone.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

function TeacherModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.userId);
  const [form, setForm] = useState(isEdit ? {
    name: initial.name, email: initial.email, password: '', status: initial.status,
    employeeId: initial.employeeId || '', designation: initial.designation || '',
    department: initial.department || '', subjects: initial.subjects || '',
    qualification: initial.qualification || '', joiningDate: initial.joiningDate || '',
    dateOfBirth: initial.dateOfBirth || '', gender: initial.gender || '',
    bloodGroup: initial.bloodGroup || '', phone: initial.phone || '', address: initial.address || '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const result = isEdit
        ? await updateTeacher(initial.userId, payload)
        : await createTeacher(payload);
      onSaved(result.teachers);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Teacher' : 'New Teacher'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {/* Login credentials */}
            <SectionDivider label="Login Credentials" />
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
              The teacher will use this email and password to log in to their portal.
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <FieldLabel required>Full Name</FieldLabel>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Mahbub Islam" required />
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mahbub@school.edu.bd" required />
              </div>
              <div>
                <FieldLabel required={!isEdit}>Password</FieldLabel>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 chars, 1 upper, 1 number'} required={!isEdit} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </div>

            {/* Professional */}
            <SectionDivider label="Professional" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Employee ID</FieldLabel>
                <Input value={form.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="e.g. TCH-001" />
              </div>
              <div>
                <FieldLabel>Designation</FieldLabel>
                <Select value={form.designation} onChange={e => set('designation', e.target.value)}>
                  <option value="">Select…</option>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Department</FieldLabel>
                <Select value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Subjects</FieldLabel>
                <Input value={form.subjects} onChange={e => set('subjects', e.target.value)} placeholder="e.g. Physics, Chemistry, Mathematics" />
              </div>
              <div>
                <FieldLabel>Qualification</FieldLabel>
                <Select value={form.qualification} onChange={e => set('qualification', e.target.value)}>
                  <option value="">Select…</option>
                  {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Joining Date</FieldLabel>
                <Input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} />
              </div>
            </div>

            {/* Personal */}
            <SectionDivider label="Personal" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Date of Birth</FieldLabel>
                <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Blood Group</FieldLabel>
                <Select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                  <option value="">Select…</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+880 1700-000000" />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Address</FieldLabel>
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Village, Upazila, District" />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    listTeachers()
      .then(d => setTeachers(d.teachers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(teachers) { setTeachers(teachers); setModal(null); }

  async function confirmAndDelete() {
    const t = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(t.userId);
    try {
      const result = await deleteTeacher(t.userId);
      setTeachers(result.teachers || []);
    } catch {}
    setDeletingId(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Teachers</h2>
          <p className="mt-0.5 text-sm text-slate-500">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus className="h-4 w-4" /> New Teacher
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <BookOpen className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No teachers yet</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5"><Plus className="h-4 w-4" /> Add First Teacher</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Teacher</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Designation</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Department</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Subjects</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Phone</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {teachers.map(t => (
                <tr key={t.userId} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                        {t.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.designation || '—'}</td>
                  <td className="px-4 py-3">
                    {t.department ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{t.department}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px]">
                    <p className="truncate">{t.subjects || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {t.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {t.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal(t)} title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(t)} disabled={deletingId === t.userId} title="Delete"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                        {deletingId === t.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TeacherModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {confirmDelete && (
        <Confirm name={confirmDelete.name} onConfirm={confirmAndDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}
