import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, Calendar } from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { listClasses, getRoutine, saveRoutineEntry, deleteRoutineEntry, listTeachersForAcademic } from '../../../services/api/academicApi.js';

// Deleting a routine entry is adminOnly on the backend — admin/teacher can
// both add/edit periods (POST is staffAndAdmin), only admin can delete.
const CAN_DELETE_ROLES = ['system_developer', 'admin'];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COLORS = {
  Sunday: 'bg-red-50 text-red-700', Monday: 'bg-blue-50 text-blue-700',
  Tuesday: 'bg-indigo-50 text-indigo-700', Wednesday: 'bg-green-50 text-green-700',
  Thursday: 'bg-amber-50 text-amber-700', Friday: 'bg-emerald-50 text-emerald-700',
  Saturday: 'bg-purple-50 text-purple-700',
};
const EMPTY_FORM = { dayOfWeek: 'Monday', periodNumber: 1, subject: '', teacherId: '', startTime: '', endTime: '', room: '' };

export default function RoutineTab() {
  const { currentUser } = useAuth();
  const canDelete = CAN_DELETE_ROLES.includes(currentUser?.role);

  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [routine, setRoutine]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([listClasses(), listTeachersForAcademic()])
      .then(([c, t]) => {
        const cls = c.classes || [];
        setClasses(cls);
        setTeachers(t.teachers || []);
        if (cls.length) { setClassId(cls[0].id); }
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    getRoutine(classId).then(r => setRoutine(r.routine || [])).finally(() => setLoading(false));
  }, [classId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function openCreate() { setForm(EMPTY_FORM); setModal('create'); }
  function openEdit(entry) {
    setForm({ dayOfWeek: entry.dayOfWeek, periodNumber: entry.periodNumber, subject: entry.subject,
              teacherId: entry.teacherId || '', startTime: entry.startTime || '', endTime: entry.endTime || '', room: entry.room || '' });
    setModal(entry);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveRoutineEntry(classId, { ...form, periodNumber: Number(form.periodNumber) });
      setRoutine(result.routine || []);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(entryId) {
    setDeleting(entryId);
    try {
      await deleteRoutineEntry(entryId);
      setRoutine(r => r.filter(e => e.id !== entryId));
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  // Group by day
  const byDay = DAYS.reduce((acc, d) => { acc[d] = routine.filter(r => r.dayOfWeek === d); return acc; }, {});

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
        </select>
        {classId && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 ml-auto"><Plus className="h-4 w-4" /> Add Period</button>
        )}
      </div>

      {!classId ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Calendar className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Select a class to view its routine</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : (
        <div className="space-y-4">
          {DAYS.map(day => {
            const entries = byDay[day] || [];
            if (!entries.length) return null;
            return (
              <div key={day} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${DAY_COLORS[day]}`}>{day}</div>
                <div className="divide-y divide-slate-50">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">
                        {e.periodNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{e.subject}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-0.5">
                          {e.teacherName && <span>{e.teacherName}</span>}
                          {(e.startTime || e.endTime) && <span>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</span>}
                          {e.room && <span>Room {e.room}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                        {canDelete && (
                          <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                            {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!routine.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
              <p className="text-sm font-medium">No routine entries yet</p>
              <p className="mt-1 text-xs">Click "Add Period" to build the timetable</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-black text-slate-800">{modal === 'create' ? 'Add Period' : 'Edit Period'}</h3>
              <button onClick={() => setModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-sm">Day <span className="text-red-500">*</span></label>
                  <select className="input" value={form.dayOfWeek} onChange={e => set('dayOfWeek', e.target.value)}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Period # <span className="text-red-500">*</span></label>
                  <input type="number" min="1" max="10" className="input" value={form.periodNumber} onChange={e => set('periodNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-sm">Subject <span className="text-red-500">*</span></label>
                <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="label-sm">Teacher</label>
                <select className="input" value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
                  <option value="">— None —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-sm">Start</label>
                  <input type="time" className="input" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                </div>
                <div>
                  <label className="label-sm">End</label>
                  <input type="time" className="input" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                </div>
                <div>
                  <label className="label-sm">Room</label>
                  <input className="input" value={form.room} onChange={e => set('room', e.target.value)} placeholder="101" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
