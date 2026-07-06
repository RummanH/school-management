import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Bell, X, Save, CheckCircle, XCircle } from 'lucide-react';
import { listAllNotices, createNotice, updateNotice, deleteNotice } from '../../../services/api/noticeApi.js';

const TYPE_LABELS = { notice: 'Notice', news: 'News' };
const TYPE_COLORS = { notice: 'bg-emerald-100 text-emerald-700', news: 'bg-blue-100 text-blue-700' };

const AUDIENCE_LABELS = {
  public:     'Public website',
  student:    'Students',
  teacher:    'Teachers',
  guardian:   'Guardians',
  all_portal: 'All portal users',
};

/* ─── Confirmation dialog ─── */
function Confirm({ title, message, onConfirm, onCancel }) {
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
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Notice form modal ─── */
function NoticeModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    title:       initial?.title || '',
    body:        initial?.body || '',
    type:        initial?.type || 'notice',
    audience:    initial?.audience || 'public',
    isPublished: initial?.isPublished ?? true,
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
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        audience: form.audience,
        isPublished: form.isPublished,
      };
      const result = isEdit
        ? await updateNotice(initial.id, payload)
        : await createNotice(payload);
      onSaved(result.notices);
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
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Notice' : 'New Notice'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Title *</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Winter vacation notice" required />
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
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]"
              checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
            Published (visible immediately)
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);      // null | 'create' | notice object
  const [confirm, setConfirm] = useState(null);  // null | notice object
  const [actionId, setActionId] = useState(null);
  const [filter, setFilter] = useState('all');   // all | notice | news

  useEffect(() => {
    listAllNotices()
      .then((d) => setNotices(d.notices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(list) {
    setNotices(list);
    setModal(null);
  }

  async function confirmDelete() {
    const notice = confirm;
    setConfirm(null);
    setActionId(notice.id);
    try {
      const result = await deleteNotice(notice.id);
      setNotices(result.notices || []);
    } catch {}
    setActionId(null);
  }

  const visible = filter === 'all' ? notices : notices.filter((n) => n.type === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Notices &amp; News</h2>
          <p className="mt-0.5 text-sm text-slate-500">{notices.length} item{notices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {['all', 'notice', 'news'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  filter === f ? 'bg-[var(--brand)] text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <Bell className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No {filter === 'all' ? 'notices or news' : filter} yet</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Create First One
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Title</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Audience</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((n) => (
                <tr key={n.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{n.body}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TYPE_COLORS[n.type]}`}>
                      {TYPE_LABELS[n.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{AUDIENCE_LABELS[n.audience] || n.audience}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      n.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {n.isPublished ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {n.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(n.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal(n)} title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirm(n)} title="Delete"
                        disabled={actionId === n.id}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                        {actionId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
        <NoticeModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {confirm && (
        <Confirm
          title="Delete Notice"
          message={`Are you sure you want to permanently delete "${confirm.title}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
