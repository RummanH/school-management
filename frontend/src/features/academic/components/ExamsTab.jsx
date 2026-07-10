import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, FileText, CalendarRange } from 'lucide-react';
import {
  listClasses, getExams, createExam, updateExam, deleteExam,
  listExamGroups, createExamGroup, updateExamGroup, deleteExamGroup,
  getAcademicStructure,
} from '../../../services/api/academicApi.js';

const EMPTY_SCHEDULE = { subject: '', examDate: '', startTime: '', endTime: '', totalMarks: 100, room: '' };
const EMPTY_GROUP = { name: '', sessionId: '', termId: '', status: 'scheduled' };
const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function ExamsTab() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [exams, setExams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [modal, setModal] = useState(null);          // schedule row modal
  const [groupModal, setGroupModal] = useState(null); // exam group modal
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([listExamGroups(), listClasses(), getAcademicStructure().catch(() => null)])
      .then(([g, c, structure]) => {
        const groupList = g.examGroups || [];
        const cls = c.classes || [];
        setGroups(groupList);
        setClasses(cls);
        setSessions(structure?.sessions || []);
        setTerms(structure?.terms || []);
        setSubjects((structure?.subjects || []).filter(s => s.is_active !== false));
        if (groupList.length) setGroupId(groupList[0].id);
        if (cls.length) setClassId(cls[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!classId) { setExams([]); return; }
    setScheduleLoading(true);
    getExams(classId).then(e => setExams(e.exams || [])).finally(() => setScheduleLoading(false));
  }, [classId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setG = (k, v) => setGroupForm(f => ({ ...f, [k]: v }));

  const activeGroup = groups.find(g => g.id === groupId) || null;
  // Legacy rows (created before exams became records) have no examId — show
  // them under their own label so nothing silently disappears.
  const groupRows = exams.filter(e => (groupId ? e.examId === groupId : !e.examId));

  function openCreateGroup() {
    const activeSession = sessions.find(s => s.is_active);
    setGroupForm({ ...EMPTY_GROUP, sessionId: activeSession?.id || '' });
    setGroupModal('create');
  }
  function openEditGroup(group) {
    setGroupForm({ name: group.name, sessionId: group.sessionId || '', termId: group.termId || '', status: group.status || 'scheduled' });
    setGroupModal(group);
  }

  async function handleSaveGroup() {
    setSaving(true);
    try {
      const result = groupModal === 'create'
        ? await createExamGroup(groupForm)
        : await updateExamGroup(groupModal.id, groupForm);
      const list = result.examGroups || [];
      setGroups(list);
      if (groupModal === 'create' && list.length) setGroupId(list[0].id);
      setGroupModal(null);
      if (classId) getExams(classId).then(e => setExams(e.exams || [])).catch(() => {});
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteGroup(group) {
    if (!confirm(`Delete "${group.name}" and its entire schedule across all classes? Results entered for it will also be deleted.`)) return;
    setDeleting(group.id);
    try {
      const result = await deleteExamGroup(group.id);
      const list = result.examGroups || [];
      setGroups(list);
      if (groupId === group.id) setGroupId(list[0]?.id || '');
      if (classId) getExams(classId).then(e => setExams(e.exams || [])).catch(() => {});
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  function openCreateSchedule() { setForm(EMPTY_SCHEDULE); setModal('create'); }
  function openEditSchedule(entry) {
    setForm({ subject: entry.subject, examDate: entry.examDate, startTime: entry.startTime || '',
              endTime: entry.endTime || '', totalMarks: entry.totalMarks, room: entry.room || '' });
    setModal(entry);
  }

  async function handleSaveSchedule() {
    setSaving(true);
    try {
      let result;
      if (modal === 'create') result = await createExam(classId, { ...form, examId: groupId });
      else result = await updateExam(modal.id, { ...form, examName: activeGroup?.name || modal.examName });
      setExams(result.exams || []);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteSchedule(id) {
    if (!confirm('Delete this subject from the exam schedule?')) return;
    setDeleting(id);
    try {
      const result = await deleteExam(id);
      setExams(result.exams || []);
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  return (
    <div className="space-y-5">
      {/* Exam records */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="font-black text-slate-800">Exams</h3>
          </div>
          <button onClick={openCreateGroup} className="btn-primary"><Plus className="h-4 w-4" /> New Exam</button>
        </div>
        {!groups.length ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            No exams yet — create one (e.g. "Half Yearly Exam 2026") and then schedule its subjects per class below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <div key={g.id}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${groupId === g.id ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <button onClick={() => setGroupId(g.id)} className="text-left">
                  <p className={`text-sm font-black ${groupId === g.id ? 'text-[var(--brand-strong)]' : 'text-slate-700'}`}>{g.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {[g.sessionName, g.termName].filter(Boolean).join(' · ') || 'No session'} · {g.subjectCount} subject{g.subjectCount !== 1 ? 's' : ''} across {g.classCount} class{g.classCount !== 1 ? 'es' : ''}
                  </p>
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[g.status] || 'bg-slate-100 text-slate-600'}`}>{g.status}</span>
                <button onClick={() => openEditGroup(g)} className="rounded-lg p-1 text-slate-400 hover:bg-white"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDeleteGroup(g)} disabled={deleting === g.id} className="rounded-lg p-1 text-red-400 hover:bg-red-50">
                  {deleting === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-class subject schedule for the selected exam */}
      {activeGroup && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-slate-600">Schedule for <span className="text-[var(--brand-strong)]">{activeGroup.name}</span> in</p>
            <select className="input max-w-xs" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
            </select>
            {classId && (
              <button onClick={openCreateSchedule} className="btn-primary ml-auto"><Plus className="h-4 w-4" /> Add Subject</button>
            )}
          </div>

          {scheduleLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
          ) : !groupRows.length ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
              <FileText className="mx-auto mb-3 h-8 w-8" />
              <p className="text-sm font-medium">No subjects scheduled for this class yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-50">
              {groupRows.map(e => (
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
                    <button onClick={() => openEditSchedule(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteSchedule(e.id)} disabled={deleting === e.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                      {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exam group modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-black text-slate-800">{groupModal === 'create' ? 'New Exam' : 'Edit Exam'}</h3>
              <button onClick={() => setGroupModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label-sm">Exam Name <span className="text-red-500">*</span></label>
                <input className="input" value={groupForm.name} onChange={e => setG('name', e.target.value)} placeholder="e.g. Half Yearly Exam 2026" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-sm">Session</label>
                  <select className="input" value={groupForm.sessionId} onChange={e => setG('sessionId', e.target.value)}>
                    <option value="">— None —</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' (active)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Term</label>
                  <select className="input" value={groupForm.termId} onChange={e => setG('termId', e.target.value)}>
                    <option value="">— None —</option>
                    {terms.filter(t => !groupForm.sessionId || t.session_id === groupForm.sessionId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-sm">Status</label>
                <select className="input" value={groupForm.status} onChange={e => setG('status', e.target.value)}>
                  {['scheduled', 'ongoing', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setGroupModal(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveGroup} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule row modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-black text-slate-800">{modal === 'create' ? `Add Subject — ${activeGroup?.name || ''}` : 'Edit Subject Schedule'}</h3>
              <button onClick={() => setModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-sm">Subject <span className="text-red-500">*</span></label>
                  {subjects.length ? (
                    <select className="input" value={form.subject} onChange={e => set('subject', e.target.value)}>
                      <option value="">— Select subject —</option>
                      {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
                  )}
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
              <button onClick={handleSaveSchedule} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
