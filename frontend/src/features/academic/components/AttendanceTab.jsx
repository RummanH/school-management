import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users } from 'lucide-react';
import { listClasses, getAttendance, saveAttendance } from '../../../services/api/academicApi.js';

const STATUSES = [
  { value: 'present',  label: 'P',  title: 'Present',  icon: CheckCircle2, color: 'bg-green-500 text-white',  ring: 'ring-green-400' },
  { value: 'absent',   label: 'A',  title: 'Absent',   icon: XCircle,      color: 'bg-red-500 text-white',    ring: 'ring-red-400' },
  { value: 'late',     label: 'L',  title: 'Late',     icon: Clock,        color: 'bg-amber-500 text-white',  ring: 'ring-amber-400' },
  { value: 'excused',  label: 'E',  title: 'Excused',  icon: AlertCircle,  color: 'bg-slate-400 text-white',  ring: 'ring-slate-300' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function AttendanceTab() {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [date, setDate]         = useState(today);
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    listClasses().then(c => {
      const cls = c.classes || [];
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId || !date) return;
    setLoading(true);
    getAttendance(classId, date)
      .then(r => setRows(r.records || []))
      .finally(() => setLoading(false));
  }, [classId, date]);

  function setStatus(studentUserId, status) {
    setRows(rs => rs.map(r => r.studentUserId === studentUserId ? { ...r, status } : r));
  }

  function markAll(status) {
    setRows(rs => rs.map(r => ({ ...r, status })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveAttendance(classId, date, rows.map(r => ({ studentUserId: r.studentUserId, status: r.status, note: r.note || '' })));
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const summary = STATUSES.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-400">Mark all:</span>
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => markAll(s.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${s.color} opacity-80 hover:opacity-100`}>
                  {s.title}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </>
        )}
      </div>

      {!classId ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Users className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Select a class to mark attendance</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Users className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No students enrolled in this class</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Summary bar */}
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
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
              <div key={row.studentUserId} className="flex items-center gap-4 px-4 py-3">
                <span className="w-8 shrink-0 text-center text-xs font-mono text-slate-400">{row.rollNumber || '—'}</span>
                <p className="flex-1 font-semibold text-slate-700 min-w-0 truncate">{row.studentName}</p>
                <div className="flex gap-1.5 shrink-0">
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => setStatus(row.studentUserId, s.value)}
                      title={s.title}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition
                        ${row.status === s.value ? `${s.color} ring-2 ${s.ring} ring-offset-1` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
