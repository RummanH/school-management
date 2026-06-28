import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Loader2, Building2, CheckCircle, XCircle, X, Save,
} from 'lucide-react';
import { listTenants, createTenant, updateTenant, setTenantStatus } from '../../../services/api/tenantApi.js';

const INSTITUTION_TYPES = ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'MADRASA'];
const PLANS = ['free', 'basic', 'pro'];

const EMPTY_FORM = {
  name: '', slug: '', email: '', plan: 'free',
  institutionType: 'SCHOOL', address: '', phone: '',
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Badge({ status }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      {active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function PlanBadge({ plan }) {
  const colors = { free: 'bg-slate-100 text-slate-600', basic: 'bg-blue-100 text-blue-700', pro: 'bg-amber-100 text-amber-700' };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${colors[plan] ?? colors.free}`}>
      {plan}
    </span>
  );
}

function TenantModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? {
    name: initial.name, slug: initial.slug, email: initial.email,
    plan: initial.plan, institutionType: initial.institutionType,
    address: initial.address || '', phone: initial.phone || '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'name' && !isEdit) next.slug = slugify(value);
      return next;
    });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = isEdit
        ? await updateTenant(initial.id, form)
        : await createTenant(form);
      onSaved(result.tenant);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'Edit Organization' : 'New Organization'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">Institution Name *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Greenfield Academy"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Organization Code *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
                placeholder="greenfield-academy"
                required
                disabled={isEdit}
              />
              <p className="mt-1 text-[11px] text-slate-400">Used as login identifier. Cannot be changed after creation.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Email *</label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="admin@greenfield.edu.bd"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Institution Type</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.institutionType}
                onChange={(e) => set('institutionType', e.target.value)}
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Plan</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.plan}
                onChange={(e) => set('plan', e.target.value)}
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Phone</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+880 1700-000000"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">Address</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="123 Academy Road, Dhaka"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary disabled:opacity-60">
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | tenant object for edit
  const [togglingId, setTogglingId] = useState(null);

  async function load() {
    try {
      const data = await listTenants();
      setTenants(data.tenants);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSaved(tenant) {
    setTenants((prev) => {
      const exists = prev.find((t) => t.id === tenant.id);
      return exists ? prev.map((t) => t.id === tenant.id ? tenant : t) : [tenant, ...prev];
    });
    setModal(null);
  }

  async function handleToggleStatus(tenant) {
    setTogglingId(tenant.id);
    try {
      const next = tenant.status === 'active' ? 'inactive' : 'active';
      const data = await setTenantStatus(tenant.id, next);
      setTenants((prev) => prev.map((t) => t.id === tenant.id ? data.tenant : t));
    } catch {}
    setTogglingId(null);
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Organizations</h2>
          <p className="mt-0.5 text-sm text-slate-500">{tenants.length} institution{tenants.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus className="h-4 w-4" /> New Organization
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <Building2 className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No organizations yet</p>
          <p className="mt-1 text-xs">Create the first institution to get started.</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Create First Organization
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Institution</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Code</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Plan</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{tenant.name}</p>
                    <p className="text-xs text-slate-400">{tenant.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 capitalize">
                      {tenant.institutionType.charAt(0) + tenant.institutionType.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={tenant.plan} /></td>
                  <td className="px-4 py-3"><Badge status={tenant.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(tenant.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal(tenant)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Toggle switch */}
                      <button
                        role="switch"
                        aria-checked={tenant.status === 'active'}
                        disabled={togglingId === tenant.id}
                        onClick={() => handleToggleStatus(tenant)}
                        title={tenant.status === 'active' ? 'Deactivate' : 'Activate'}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                          tenant.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform ${
                          tenant.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                        }`}>
                          {togglingId === tenant.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                        </span>
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
        <TenantModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
