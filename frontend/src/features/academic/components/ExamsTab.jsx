import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, FileText } from 'lucide-react';
import { listClasses, getExams, createExam, updateExam, deleteExam } from '../../../services/api/academicApi.js';

const EMPTY = { examName: '', subject: '', examDate: '', startTime: '', endTime: '', totalMarks: 100, room: '' };

function groupByExamName(exams) {
  const map = new Map();
  for (const e of exams) {
    if (!map.has(e.examName)) map.set(e.examName, []);
    map.get(e.examName).push(e);
  }
  return map;
}

export default function ExamsTab() {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [exams, setExams]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    listClasses().then(c => {
      const cls = c.classes || [];
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    getExams(classId).then(e => setExams(e.exams || [])).finally(() => setLoading(false));
  }, [classId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function openCreate() { setForm(EMPTY); setModal('create'); }
  function openEdit(entry) {
    setForm({ examName: entry.examName, subject: entry.subject, examDate: entry.examDate,
              startTime: entry.startTime || '', endTime: entry.endTime || '',
              totalMarks: entry.totalMarks, room: entry.room || '' });
    setModal(entry);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let result;
      if (modal === 'create') result = await createExam(classId, form);
      else result = await updateExam(modal.id, form);
      setExams(result.exams || []);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this exam entry?')) return;
    setDeleting(id);
    try {
      const result = await deleteExam(id);
      setExams(result.exams || []);
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  const grouped = groupByExamName(exams);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
        </select>
        {classId && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 ml-auto"><Plus className="h-4 w-4" /> Add Exam</button>
        )}
      </div>

      {!classId ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Select a class to view exam schedule</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : !exams.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No exams scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([examName, entries]) => (
            <div key={examName} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm font-black text-indigo-700">{examName}</p>
                <p className="text-xs text-indigo-400">{entries.length} subject{entries.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="divide-y divide-slate-50">
                {entries.map(e => (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{e.subject}</p>
                      <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-slate-400">
                        <span>{e.examDate}</span>
                        {(e.startTime || e.endTime) && <span>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</span>}
                        {e.room && <span>Room {e.room}</span>}
                        <span>Total: {e.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                        {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-black text-slate-800">{modal === 'create' ? 'Add Exam' : 'Edit Exam'}</h3>
              <button onClick={() => setModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label-sm">Exam Name <span className="text-red-500">*</span></label>
                <input className="input" value={form.examName} onChange={e => set('examName', e.target.value)} placeholder="e.g. Mid Term 2025, Final Exam" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-sm">Subject <span className="text-red-500">*</span></label>
                  <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label className="label-sm">Date <span className="text-red-500">*</span></label>
                  <input type="date" className="input" value={form.examDate} onChange={e => set('examDate', e.target.value)} />
                </div>
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
                  <label className="label-sm">Total Marks</label>
                  <input type="number" min="1" className="input" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-sm">Room</label>
                <input className="input" value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. Hall A" />
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
