import { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, KeyRound, Loader2, Users, X, Save, Copy, Check,
  CheckCircle, XCircle, Link2,
} from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../../../services/api/userApi.js';
import { listTenants } from '../../../services/api/tenantApi.js';
import { listStudents } from '../../../services/api/studentApi.js';
import { listWardLinks, linkWard, unlinkWard } from '../../../services/api/guardianApi.js';
import Avatar from '../../../components/Avatar.jsx';

const ROLE_LABELS = {
  admin:      'Admin',
  accountant: 'Accountant',
  teacher:    'Teacher',
  student:    'Student',
  guardian:   'Guardian',
};

const ROLE_COLORS = {
  admin:      'bg-blue-100 text-blue-700',
  accountant: 'bg-teal-100 text-teal-700',
  teacher:    'bg-emerald-100 text-emerald-700',
  student:    'bg-purple-100 text-purple-700',
  guardian:   'bg-amber-100 text-amber-700',
};
const DEFAULT_ROLE_COLOR = 'bg-slate-100 text-slate-600';

// Teachers and students are created from their dedicated pages (with full profiles).
// This Users page manages admin, accountant, and guardian accounts.
const CREATABLE_ROLES = ['admin', 'accountant', 'guardian'];

/* ─── Confirmation dialog ─── */
function Confirm({ title, message, confirmLabel = 'Confirm', tone = 'rose', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              tone === 'rose' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Temp password dialog ─── */
function TempPasswordDialog({ name, password, onClose }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(password).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Temporary Password</h3>
            <p className="text-xs text-slate-400">{name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Share this password securely. The user should change it on first login.
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <code className="text-lg font-bold tracking-widest text-slate-800">{password}</code>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Manage wards modal ─── */
function WardsModal({ guardian, onClose }) {
  const [students, setStudents] = useState([]);
  const [linkedIds, setLinkedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listStudents(), listWardLinks(guardian.id)])
      .then(([sd, wd]) => {
        setStudents(sd.students || []);
        setLinkedIds(wd.studentUserIds || []);
      })
      .catch((err) => setError(err.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [guardian.id]);

  async function toggle(student) {
    const isLinked = linkedIds.includes(student.userId);
    setToggling(student.userId);
    setError('');
    try {
      const result = isLinked
        ? await unlinkWard(guardian.id, student.userId)
        : await linkWard(guardian.id, student.userId);
      setLinkedIds(result.studentUserIds || []);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Manage Wards</h2>
            <p className="text-xs text-slate-400">{guardian.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No students yet. Create students first from the Students page.</p>
          ) : (
            <ul className="space-y-1.5">
              {students.map((s) => {
                const checked = linkedIds.includes(s.userId);
                return (
                  <li key={s.userId}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {[s.className, s.section].filter(Boolean).join(' - ') || '—'}
                          {s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={toggling === s.userId}
                        onChange={() => toggle(s)}
                        className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── User form modal ─── */
function UserModal({ initial, actor, tenantsList, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const roles = CREATABLE_ROLES;
  const needsTenant = actor.role === 'system_developer' && !isEdit;

  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    password: '',
    role: initial?.role || roles[0],
    status: initial?.status || 'active',
    tenantId: initial?.tenantId || tenantsList[0]?.id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      if (needsTenant) payload.tenantId = form.tenantId;
      if (!isEdit) payload.password = form.password.trim(); // required on create

      const result = isEdit
        ? await updateUser(initial.id, payload)
        : await createUser(payload);
      onSaved(result.users);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">Full Name *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Rahim Uddin" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Email *</label>
              <input type="email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="rahim@school.edu.bd" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Password {isEdit ? <span className="font-normal text-slate-400">(leave blank to keep)</span> : '*'}
              </label>
              <input type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.password} onChange={(e) => set('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 chars, 1 uppercase, 1 number'}
                required={!isEdit} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Role</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.role} onChange={(e) => set('role', e.target.value)}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Status</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {needsTenant && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600">Organization *</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.tenantId} onChange={(e) => set('tenantId', e.target.value)} required>
                  <option value="">Select organization…</option>
                  {tenantsList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function UsersPage() {
  const { currentUser: actor } = useAuth();
  const isSystemDeveloper = actor?.role === 'system_developer';

  const [users, setUsers] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);         // null | 'create' | user object
  const [confirm, setConfirm] = useState(null);     // null | { type, user }
  const [tempPw, setTempPw] = useState(null);       // null | { name, password }
  const [actionId, setActionId] = useState(null);
  const [wardsModal, setWardsModal] = useState(null); // null | guardian user object

  useEffect(() => {
    const fetches = [listUsers()];
    if (isSystemDeveloper) fetches.push(listTenants());
    Promise.all(fetches)
      .then(([ud, td]) => {
        setUsers(ud.users || []);
        if (td) setTenantsList(td.tenants || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSystemDeveloper]);

  function handleSaved(users) {
    setUsers(users);
    setModal(null);
  }

  async function handleDelete(user) {
    setConfirm({ type: 'delete', user });
  }

  async function confirmDelete() {
    const user = confirm.user;
    setConfirm(null);
    setActionId(user.id);
    try {
      const result = await deleteUser(user.id);
      setUsers(result.users || []);
    } catch {}
    setActionId(null);
  }

  async function handleResetPassword(user) {
    setConfirm({ type: 'reset', user });
  }

  async function confirmReset() {
    const user = confirm.user;
    setConfirm(null);
    setActionId(user.id + '-reset');
    try {
      const result = await resetUserPassword(user.id);
      setUsers(result.users || []);
      setTempPw({ name: user.name, password: result.tempPassword });
    } catch {}
    setActionId(null);
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        This page manages <strong>Admin</strong>, <strong>Accountant</strong>, and <strong>Guardian</strong> accounts.
        To create teachers or students, use the <strong>Teachers</strong> and <strong>Students</strong> pages — they create the login account and full profile together.
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Users</h2>
          <p className="mt-0.5 text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <Users className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No users yet</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Create First User
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                {isSystemDeveloper && (
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Organization</th>
                )}
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user.name} photoUrl={user.photoUrl} size="h-8 w-8" textSize="text-xs" tone="bg-[var(--brand)]/10 text-[var(--brand)]" />
                      <span className="font-bold text-slate-800">{user.name}</span>
                      {user.id === actor?.id && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  {isSystemDeveloper && (
                    <td className="px-4 py-3 text-xs text-slate-500">{user.tenantName || '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_COLORS[user.role] || DEFAULT_ROLE_COLOR}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.status === 'active'
                        ? <CheckCircle className="h-3 w-3" />
                        : <XCircle className="h-3 w-3" />}
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal(user)} title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user.role === 'guardian' && actor?.role === 'admin' && (
                        <button onClick={() => setWardsModal(user)} title="Manage wards"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">
                          <Link2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleResetPassword(user)} title="Reset password"
                        disabled={actionId === user.id + '-reset'}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40">
                        {actionId === user.id + '-reset'
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <KeyRound className="h-4 w-4" />}
                      </button>
                      {user.id !== actor?.id && (
                        <button onClick={() => handleDelete(user)} title="Delete"
                          disabled={actionId === user.id}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                          {actionId === user.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          initial={modal === 'create' ? null : modal}
          actor={actor}
          tenantsList={tenantsList}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {confirm?.type === 'delete' && (
        <Confirm
          title="Delete User"
          message={`Are you sure you want to permanently delete ${confirm.user.name}? This action cannot be undone.`}
          confirmLabel="Delete"
          tone="rose"
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.type === 'reset' && (
        <Confirm
          title="Reset Password"
          message={`Generate a new temporary password for ${confirm.user.name}? They will need to use it on their next login.`}
          confirmLabel="Reset Password"
          tone="amber"
          onConfirm={confirmReset}
          onCancel={() => setConfirm(null)}
        />
      )}

      {tempPw && (
        <TempPasswordDialog name={tempPw.name} password={tempPw.password} onClose={() => setTempPw(null)} />
      )}

      {wardsModal && (
        <WardsModal guardian={wardsModal} onClose={() => setWardsModal(null)} />
      )}
    </div>
  );
}
