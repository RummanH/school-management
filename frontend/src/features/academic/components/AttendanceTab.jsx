import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, Upload, FileBarChart, Bell, ClipboardCheck, X, AlertTriangle, CheckCheck } from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import {
  listClasses,
  getAttendance,
  saveAttendance,
  importAttendance,
  getMonthlyAttendanceReport,
  getAttendanceCorrections,
  requestAttendanceCorrection,
  reviewAttendanceCorrection,
  getRoutine,
} from '../../../services/api/academicApi.js';

const STATUSES = [
  { value: 'present', label: 'P', title: 'Present', icon: CheckCircle2, color: 'bg-green-500 text-white', ring: 'ring-green-400' },
  { value: 'absent', label: 'A', title: 'Absent', icon: XCircle, color: 'bg-red-500 text-white', ring: 'ring-red-400' },
  { value: 'late', label: 'L', title: 'Late', icon: Clock, color: 'bg-amber-500 text-white', ring: 'ring-amber-400' },
  { value: 'excused', label: 'E', title: 'Excused', icon: AlertCircle, color: 'bg-slate-400 text-white', ring: 'ring-slate-300' },
];

// Same order as RoutineTab.jsx so periodNumber lines up with `date`'s
// actual weekday (Date#getDay(): 0 = Sunday ... 6 = Saturday).
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const dayOfWeekFor = (dateStr) => DAYS[new Date(`${dateStr}T00:00:00`).getDay()];

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
      isError ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
    }`}>
      {isError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCheck className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="rounded-lg p-1 hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function DiscardConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">Discard Unsaved Changes?</h3>
          <p className="mt-1 text-sm text-slate-500">
            You've marked attendance that hasn't been saved yet. Switching now will discard those changes.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Keep Editing</button>
          <button onClick={onConfirm} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Discard</button>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceTab() {
  const { currentUser } = useAuth();
  const isAdmin = ['admin', 'system_developer'].includes(currentUser?.role);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [periodNumber, setPeriodNumber] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingChange, setPendingChange] = useState(null);
  const [routine, setRoutine] = useState([]);

  useEffect(() => {
    listClasses().then(c => {
      const cls = c.classes || [];
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
    loadCorrections();
  }, []);

  useEffect(() => {
    if (!classId) { setRoutine([]); return; }
    getRoutine(classId).then(r => setRoutine(r.routine || [])).catch(() => setRoutine([]));
  }, [classId]);

  useEffect(() => {
    if (!classId || !date) return;
    loadAttendance();
  }, [classId, date, periodNumber]);

  useEffect(() => {
    if (!classId || !month) return;
    loadMonthlyReport();
  }, [classId, month]);

  async function loadAttendance() {
    setLoading(true);
    try {
      const response = await getAttendance(classId, date, periodNumber);
      setRows(response.records || []);
      setDirty(false);
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to load attendance.' });
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyReport() {
    const response = await getMonthlyAttendanceReport(classId, month);
    setReport(response.report || []);
  }

  async function loadCorrections() {
    try {
      const response = await getAttendanceCorrections('pending');
      setCorrections(response.corrections || []);
    } catch {
      setCorrections([]);
    }
  }

  function updateRow(studentUserId, patch) {
    setRows(rs => rs.map(r => r.studentUserId === studentUserId ? { ...r, ...patch } : r));
    setDirty(true);
  }

  function markAll(status) {
    setRows(rs => rs.map(r => ({ ...r, status, absenceReason: status === 'absent' ? r.absenceReason : '' })));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await saveAttendance(classId, date, periodNumber, rows.map(r => ({
        studentUserId: r.studentUserId,
        periodNumber,
        status: r.status,
        note: r.note || '',
        absenceReason: r.status === 'absent' ? (r.absenceReason || '') : '',
      })));
      await loadAttendance();
      await loadMonthlyReport();
      setToast({
        type: 'success',
        message: response.alertedCount
          ? `Attendance saved. ${response.alertedCount} guardian absence alert(s) sent.`
          : 'Attendance saved.',
      });
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to save attendance.' });
    } finally { setSaving(false); }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const response = await importAttendance(classId, { date, periodNumber, csv });
      await loadAttendance();
      await loadMonthlyReport();
      setCsv('');
      setToast({ type: 'success', message: `${response.importedCount || 0} attendance row(s) imported.` });
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Import failed.' });
    } finally { setImporting(false); }
  }

  async function submitCorrection(row) {
    try {
      const response = await requestAttendanceCorrection({
        attendanceId: row.recordId,
        classId,
        studentUserId: row.studentUserId,
        attendanceDate: date,
        periodNumber,
        requestedStatus: row.status,
        requestedReason: row.absenceReason || '',
        requestNote: row.note || '',
      });
      setCorrections(response.corrections || []);
      setToast({ type: 'success', message: 'Correction request submitted.' });
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to submit correction.' });
    }
  }

  async function reviewCorrection(id, decision) {
    try {
      const response = await reviewAttendanceCorrection(id, { decision });
      setCorrections(response.corrections || []);
      await loadAttendance();
      await loadMonthlyReport();
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to review correction.' });
    }
  }

  // Changing class/date/period discards any unsaved edits (a fresh fetch
  // overwrites `rows`), so route those changes through a confirm step
  // whenever there's unsaved work.
  function guardedChange(apply) {
    if (dirty) { setPendingChange(() => apply); return; }
    apply();
  }
  function confirmPendingChange() {
    pendingChange?.();
    setPendingChange(null);
  }

  const summary = STATUSES.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length;
    return acc;
  }, {});

  const dayOfWeek = date ? dayOfWeekFor(date) : '';
  const periodsToday = routine
    .filter(r => r.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.periodNumber - b.periodNumber);
  const selectedPeriod = periodsToday.find(p => p.periodNumber === periodNumber);

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="card space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-xs" value={classId} disabled={saving}
            onChange={e => { const v = e.target.value; guardedChange(() => setClassId(v)); }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
          </select>
          <input type="date" className="input" value={date} disabled={saving}
            onChange={e => { const v = e.target.value; guardedChange(() => setDate(v)); }} />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            Period
            <select className="input w-64" value={periodNumber} disabled={saving}
              onChange={e => { const v = Number(e.target.value); guardedChange(() => setPeriodNumber(v)); }}>
              <option value={0}>Daily / Homeroom (no specific period)</option>
              {periodsToday.map(p => (
                <option key={p.id} value={p.periodNumber}>
                  Period {p.periodNumber} — {p.subject}{p.startTime ? ` (${p.startTime}${p.endTime ? `–${p.endTime}` : ''})` : ''}
                </option>
              ))}
              {/* Keep an already-selected period visible even if it fell off today's routine (e.g. date changed after picking it) */}
              {periodNumber !== 0 && !selectedPeriod && (
                <option value={periodNumber}>Period {periodNumber} (not on {dayOfWeek}'s routine)</option>
              )}
            </select>
          </label>
          {selectedPeriod && (
            <span className="text-xs text-slate-400">
              {selectedPeriod.teacherName ? `${selectedPeriod.teacherName} · ` : ''}{dayOfWeek}
              {selectedPeriod.room ? ` · Room ${selectedPeriod.room}` : ''}
            </span>
          )}
        </div>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mark all:</span>
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => markAll(s.value)} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${s.color} opacity-80 hover:opacity-100`}>
                  {s.title}
                </button>
              ))}
            </div>
            {dirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Unsaved changes
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary ml-auto flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        )}
      </div>

      {!classId ? (
        <EmptyState text={classes.length ? 'Select a class to mark attendance' : 'No classes yet — create one in Academic → Structure → Classes'} />
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : rows.length === 0 ? (
        <EmptyState text="No students enrolled in this class" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
            {STATUSES.map(s => (
              <span key={s.value} className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${s.color}`}>{s.label}</span>
                <span className="font-bold text-slate-600">{summary[s.value]}</span>
                <span className="text-slate-400">{s.title}</span>
              </span>
            ))}
            <span className="ml-auto text-slate-400">{rows.length} total</span>
          </div>

          <div className="divide-y divide-slate-50">
            {rows.map(row => (
              <div key={row.studentUserId} className="grid gap-3 px-4 py-3 lg:grid-cols-[3rem_1fr_auto_18rem_auto] lg:items-center">
                <span className="text-center text-xs font-mono text-slate-400">{row.rollNumber || '-'}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700">{row.studentName}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                    {row.guardianAlertSent && <span className="inline-flex items-center gap-1 text-red-500"><Bell className="h-3 w-3" /> Guardian alerted</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => updateRow(row.studentUserId, { status: s.value, absenceReason: s.value === 'absent' ? row.absenceReason : '' })} title={s.title}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition ${row.status === s.value ? `${s.color} ring-2 ${s.ring} ring-offset-1` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <input className="input" placeholder="Absence reason" value={row.absenceReason || ''} disabled={row.status !== 'absent'} onChange={e => updateRow(row.studentUserId, { absenceReason: e.target.value })} />
                  <input className="input" placeholder="Note" value={row.note || ''} onChange={e => updateRow(row.studentUserId, { note: e.target.value })} />
                </div>
                <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => submitCorrection(row)}>
                  <ClipboardCheck className="h-4 w-4" /> Correction
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center gap-2 font-bold text-slate-700"><Upload className="h-4 w-4" /> Bulk import</div>
          <textarea className="input min-h-28 w-full" value={csv} onChange={e => setCsv(e.target.value)} placeholder="Roll or name,status,absence reason,note" />
          <div className="mt-3 flex justify-end">
            <button className="btn-primary flex items-center gap-2" disabled={!csv.trim() || importing || !classId} onClick={handleImport}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
            </button>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-700"><FileBarChart className="h-4 w-4" /> Monthly report</div>
            <input type="month" className="input ml-auto" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Present</th><th className="px-3 py-2">Absent</th><th className="px-3 py-2">%</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {report.map(r => {
                  const pct = Number(r.attendancePercentage);
                  const pctColor = pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <tr key={r.studentUserId}>
                      <td className="px-3 py-2 font-semibold text-slate-700">{r.rollNumber ? `${r.rollNumber} - ` : ''}{r.studentName}</td>
                      <td className="px-3 py-2">{r.presentCount}/{r.totalCount}</td>
                      <td className="px-3 py-2">{r.absentCount}</td>
                      <td className={`px-3 py-2 font-bold ${pctColor}`}>{r.attendancePercentage}%</td>
                    </tr>
                  );
                })}
                {report.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-400" colSpan="4">No attendance marked for this month</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center gap-2 font-bold text-slate-700"><ClipboardCheck className="h-4 w-4" /> Pending correction approvals</div>
        <div className="divide-y divide-slate-100">
          {corrections.map(c => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-700">{c.studentName} - {c.className}{c.section ? ` ${c.section}` : ''}</p>
                <p className="text-xs text-slate-500">{c.attendanceDate}, period {c.periodNumber || 0}: change to {c.requestedStatus}{c.requestedReason ? ` (${c.requestedReason})` : ''}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={() => reviewCorrection(c.id, 'approved')}>Approve</button>
                  <button className="btn-secondary" onClick={() => reviewCorrection(c.id, 'rejected')}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {corrections.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No pending correction requests</p>}
        </div>
      </section>

      {pendingChange && (
        <DiscardConfirm onConfirm={confirmPendingChange} onCancel={() => setPendingChange(null)} />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
      <Users className="mx-auto mb-3 h-10 w-10" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}