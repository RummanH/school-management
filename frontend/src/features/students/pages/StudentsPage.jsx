import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, GraduationCap, X, Save, CheckCircle, XCircle } from 'lucide-react';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../../../services/api/studentApi.js';
import { listClasses } from '../../../services/api/academicApi.js';
import { listUsers } from '../../../services/api/userApi.js';
import { listGuardiansForStudent, linkWard, unlinkWard } from '../../../services/api/guardianApi.js';

const GENDERS      = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
const RELATIONS    = ['Father', 'Mother', 'Guardian', 'Other'];

const EMPTY = {
  name: '', email: '', password: '', status: 'active',
  classId: '',
  studentId: '', className: '', section: '', rollNumber: '',
  admissionDate: '', dateOfBirth: '', gender: '', bloodGroup: '',
  phone: '', address: '',
  guardianName: '', guardianPhone: '', guardianRelation: '',
};

function FieldLabel({ children, required }) {
  return (
    <label className="mb-1 block text-xs font-bold text-slate-600">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none
        focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 ${className}`}
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

/* ─── Confirm dialog ─── */
function Confirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">Delete Student</h3>
          <p className="mt-1 text-sm text-slate-500">
            Delete <strong>{name}</strong> and their entire profile? This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Student form modal ─── */
function StudentModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.userId);
  const [form, setForm] = useState(isEdit ? {
    name: initial.name, email: initial.email, password: '', status: initial.status,
    classId: initial.classId || '',
    studentId: initial.studentId || '', className: initial.className || '',
    section: initial.section || '', rollNumber: initial.rollNumber || '',
    admissionDate: initial.admissionDate || '', dateOfBirth: initial.dateOfBirth || '',
    gender: initial.gender || '', bloodGroup: initial.bloodGroup || '',
    phone: initial.phone || '', address: initial.address || '',
    guardianName: initial.guardianName || '', guardianPhone: initial.guardianPhone || '',
    guardianRelation: initial.guardianRelation || '',
  } : { ...EMPTY });
  const [classes, setClasses] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [previousGuardianId, setPreviousGuardianId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listClasses().then(c => setClasses(c.classes || [])).catch(() => {});
    listUsers().then(d => setGuardians((d.users || []).filter(u => u.role === 'guardian'))).catch(() => {});
    if (isEdit) {
      listGuardiansForStudent(initial.userId)
        .then(d => {
          const linked = (d.guardians || [])[0]?.id || '';
          setSelectedGuardianId(linked);
          setPreviousGuardianId(linked);
        })
        .catch(() => {});
    }
  }, []);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const result = isEdit
        ? await updateStudent(initial.userId, payload)
        : await createStudent(payload);

      const studentUserId = isEdit ? initial.userId : result.userId;
      if (selectedGuardianId !== previousGuardianId) {
        try {
          if (previousGuardianId) await unlinkWard(previousGuardianId, studentUserId);
          if (selectedGuardianId) await linkWard(selectedGuardianId, studentUserId);
        } catch (linkErr) {
          onSaved(result.students);
          alert(`Student saved, but linking the guardian account failed: ${linkErr.message || 'Unknown error'}. You can link it later from Users → Manage Wards.`);
          return;
        }
      }
      onSaved(result.students);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Student' : 'New Student'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {/* Login credentials */}
            <SectionDivider label="Login Credentials" />
            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-2.5 text-xs text-purple-700">
              The student will use this email and password to log in to their portal.
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <FieldLabel required>Full Name</FieldLabel>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rahim Uddin" required />
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="rahim@school.edu.bd" required />
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

            {/* Academic */}
            <SectionDivider label="Academic" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <FieldLabel>Enroll in Class</FieldLabel>
                <Select value={form.classId} onChange={e => set('classId', e.target.value)}>
                  <option value="">— Not assigned —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}{c.academicYear ? ` (${c.academicYear})` : ''}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Student ID</FieldLabel>
                <Input value={form.studentId} onChange={e => set('studentId', e.target.value)} placeholder="e.g. STU-001" />
              </div>
              <div>
                <FieldLabel>Class / Grade</FieldLabel>
                <Input value={form.className} onChange={e => set('className', e.target.value)} placeholder="e.g. Class 8, 1st Year" />
              </div>
              <div>
                <FieldLabel>Section</FieldLabel>
                <Input value={form.section} onChange={e => set('section', e.target.value)} placeholder="e.g. A, B" />
              </div>
              <div>
                <FieldLabel>Roll Number</FieldLabel>
                <Input value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} placeholder="e.g. 12" />
              </div>
              <div>
                <FieldLabel>Admission Date</FieldLabel>
                <Input type="date" value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} />
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

            {/* Guardian */}
            <SectionDivider label="Guardian" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Guardian Name</FieldLabel>
                <Input value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="e.g. Karim Uddin" />
              </div>
              <div>
                <FieldLabel>Guardian Phone</FieldLabel>
                <Input value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} placeholder="+880 1800-000000" />
              </div>
              <div>
                <FieldLabel>Relation</FieldLabel>
                <Select value={form.guardianRelation} onChange={e => set('guardianRelation', e.target.value)}>
                  <option value="">Select…</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
              <div className="sm:col-span-3">
                <FieldLabel>Linked Guardian Account</FieldLabel>
                <Select value={selectedGuardianId} onChange={e => setSelectedGuardianId(e.target.value)}>
                  <option value="">— No linked account —</option>
                  {guardians.map(g => <option key={g.id} value={g.id}>{g.name} ({g.email})</option>)}
                </Select>
                <p className="mt-1 text-xs text-slate-400">
                  Optional — link an existing guardian login so they can see this student's results,
                  attendance, and notices in the Guardian Portal. Guardian accounts are created from the Users page.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    listStudents()
      .then(d => setStudents(d.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(students) { setStudents(students); setModal(null); }

  async function confirmAndDelete() {
    const s = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(s.userId);
    try {
      const result = await deleteStudent(s.userId);
      setStudents(result.students || []);
    } catch {}
    setDeletingId(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Students</h2>
          <p className="mt-0.5 text-sm text-slate-500">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus className="h-4 w-4" /> New Student
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <GraduationCap className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No students yet</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5"><Plus className="h-4 w-4" /> Add First Student</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Student</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Class</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Roll</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Guardian</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Phone</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(s => (
                <tr key={s.userId} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-700">{s.className || '—'}</p>
                      {s.section && <p className="text-xs text-slate-400">Section {s.section}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.rollNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-slate-700">{s.guardianName || '—'}</p>
                      {s.guardianPhone && <p className="text-xs text-slate-400">{s.guardianPhone}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {s.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal(s)} title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} disabled={deletingId === s.userId} title="Delete"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                        {deletingId === s.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
        <StudentModal
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
