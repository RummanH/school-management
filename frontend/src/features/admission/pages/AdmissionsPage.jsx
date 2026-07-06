import { useState, useEffect } from 'react';
import { Loader2, ClipboardList, X, Save, Eye } from 'lucide-react';
import { listAdmissions, getAdmission, updateAdmissionStatus } from '../../../services/api/admissionApi.js';
import { STATUS_LABELS, STATUS_COLORS, STATUS_VALUES } from '../constants.js';

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ─── Detail / status-update modal ─── */
function DetailModal({ id, onClose, onUpdated }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ status: '', notes: '', admissionTestDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdmission(id)
      .then((d) => {
        setApplication(d.application);
        setForm({
          status: d.application.status,
          notes: d.application.notes || '',
          admissionTestDate: d.application.admissionTestDate || '',
        });
      })
      .catch((err) => setError(err.message || 'Failed to load application.'))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const result = await updateAdmissionStatus(id, form);
      onUpdated(result.application);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Application Detail</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
          ) : !application ? (
            <p className="text-sm text-red-600">{error || 'Application not found.'}</p>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex items-start gap-4">
                {application.photoData && (
                  <img src={application.photoData} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                )}
                <div>
                  <p className="text-lg font-black text-slate-800">{application.applicantName}</p>
                  <p className="text-xs text-slate-400">Reference: {application.referenceCode}</p>
                  <p className="mt-1 text-sm text-slate-600">Applying for {application.applyingForClass}</p>
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-slate-400">Date of Birth:</span> <span className="text-slate-700">{application.dateOfBirth || '—'}</span></p>
                <p><span className="font-bold text-slate-400">Gender:</span> <span className="text-slate-700">{application.gender || '—'}</span></p>
                <p><span className="font-bold text-slate-400">Previous School:</span> <span className="text-slate-700">{application.previousSchool || '—'}</span></p>
                <p><span className="font-bold text-slate-400">Submitted:</span> <span className="text-slate-700">
                  {new Date(application.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span></p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Guardian</p>
                <p className="font-semibold text-slate-700">{application.guardianName} · {application.guardianPhone}</p>
                {application.guardianEmail && <p className="text-slate-500">{application.guardianEmail}</p>}
              </div>

              <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <label className="label-sm">Status</label>
                  <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Admission Test Date</label>
                  <input type="date" className="input" value={form.admissionTestDate}
                    onChange={(e) => set('admissionTestDate', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-sm">Internal Notes</label>
                  <textarea className="input min-h-[80px]" value={form.notes}
                    onChange={(e) => set('notes', e.target.value)} placeholder="Not visible to the applicant" />
                </div>
              </div>
            </div>
          )}
        </div>

        {application && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdmissionsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    setLoading(true);
    listAdmissions(filter === 'all' ? undefined : filter)
      .then((d) => setApplications(d.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  function handleUpdated(updated) {
    setApplications((list) => list.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    setDetailId(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Admissions</h2>
          <p className="mt-0.5 text-sm text-slate-500">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {['all', ...STATUS_VALUES].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filter === f ? 'bg-[var(--brand)] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <ClipboardList className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No applications yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Applicant</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Class</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Guardian</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {applications.map((a) => (
                <tr key={a.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{a.applicantName}</p>
                    <p className="text-xs text-slate-400">{a.referenceCode}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.applyingForClass}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{a.guardianName}</p>
                    <p className="text-xs text-slate-400">{a.guardianPhone}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetailId(a.id)} title="View / Update"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailId && (
        <DetailModal id={detailId} onClose={() => setDetailId(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
