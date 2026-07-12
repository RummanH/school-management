import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Pencil, Plus, Save, Trash2, TrendingUp, X } from 'lucide-react';
import {
  createAcademicStructureRecord, updateAcademicStructureRecord, deleteAcademicStructureRecord,
  getAcademicStructure, listClasses, listTeachersForAcademic, bulkPromoteClass,
} from '../../../services/api/academicApi.js';
import { listStudents } from '../../../services/api/studentApi.js';

const today = () => new Date().toISOString().slice(0, 10);
function Field({ label, children }) { return <label className="block"><span className="label-sm">{label}</span>{children}</label>; }
function Input(p) { return <input {...p} className={`input ${p.className || ''}`} />; }
function Select(p) { return <select {...p} className={`input ${p.className || ''}`} />; }

const TABS = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'terms', label: 'Terms' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'assignments', label: 'Teacher Assignments' },
  { id: 'grading-policies', label: 'Grading' },
  { id: 'movements', label: 'Promotions & Transfers' },
];

const yesNo = (v) => (v ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">—</span>);
const COLUMNS = {
  sessions: [
    { key: 'name', label: 'Session' },
    { key: 'start_date', label: 'Starts' },
    { key: 'end_date', label: 'Ends' },
    { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Active</span> : <span className="text-slate-300">—</span>) },
  ],
  terms: [
    { key: 'session_name', label: 'Session' },
    { key: 'name', label: 'Term' },
    { key: 'start_date', label: 'Starts' },
    { key: 'end_date', label: 'Ends' },
  ],
  subjects: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Subject' },
    { key: 'department', label: 'Department' },
    { key: 'is_active', label: 'Active', render: (r) => yesNo(r.is_active) },
  ],
  assignments: [
    { key: 'teacher_name', label: 'Teacher' },
    { key: 'subject_name', label: 'Subject' },
    { key: 'class_name', label: 'Class', render: (r) => `${r.class_name}${r.section ? ` — ${r.section}` : ''}` },
    { key: 'session_name', label: 'Session' },
  ],
  'grading-policies': [
    { key: 'name', label: 'Policy' },
    { key: 'min_percent', label: 'From %' },
    { key: 'max_percent', label: 'To %' },
    { key: 'grade', label: 'Grade' },
    { key: 'grade_point', label: 'Point' },
    { key: 'is_passing', label: 'Passing', render: (r) => yesNo(r.is_passing) },
  ],
  movements: [
    { key: 'student_name', label: 'Student' },
    { key: 'movement_type', label: 'Type', render: (r) => String(r.movement_type || '').replace('_', ' ') },
    { key: 'from_class_name', label: 'From' },
    { key: 'to_class_name', label: 'To', render: (r) => `${r.to_class_name || ''}${r.to_section ? ` — ${r.to_section}` : ''}` },
    { key: 'effective_date', label: 'Date' },
    { key: 'reason', label: 'Reason' },
  ],
};

const ROW_TO_FORM = {
  sessions: (r) => ({ name: r.name, startDate: r.start_date || '', endDate: r.end_date || '', isActive: r.is_active }),
  terms: (r) => ({ sessionId: r.session_id || '', name: r.name, startDate: r.start_date || '', endDate: r.end_date || '' }),
  subjects: (r) => ({ code: r.code || '', name: r.name, department: r.department || '', description: r.description || '', isActive: r.is_active }),
  assignments: (r) => ({ teacherId: r.teacher_id || '', subjectId: r.subject_id || '', classId: r.class_id || '', sessionId: r.session_id || '' }),
  'grading-policies': (r) => ({ name: r.name, minPercent: r.min_percent, maxPercent: r.max_percent, grade: r.grade, gradePoint: r.grade_point, isPassing: r.is_passing }),
  movements: (r) => ({ studentUserId: r.student_user_id || '', movementType: r.movement_type || '', toClassId: r.to_class_id || '', toSection: r.to_section || '', effectiveDate: r.effective_date || today(), reason: r.reason || '' }),
};

const EDITABLE = new Set(['sessions', 'terms', 'subjects', 'assignments', 'grading-policies', 'movements']);
const DELETABLE = new Set(['sessions', 'terms', 'subjects', 'assignments', 'grading-policies']);

function StructureTable({ type, rows, onEdit, onDelete, deletingId }) {
  const cols = COLUMNS[type] || [];
  const canEdit = EDITABLE.has(type);
  const canDelete = DELETABLE.has(type);
  if (!rows?.length) return <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No records yet.</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400">
            {cols.map(c => <th key={c.key} className="px-4 py-3">{c.label}</th>)}
            {(canEdit || canDelete) && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-slate-50">
              {cols.map(c => <td key={c.key} className="px-4 py-3 text-slate-700">{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>)}
              {(canEdit || canDelete) && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && <button onClick={() => onEdit(r)} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>}
                    {canDelete && <button onClick={() => onDelete(r)} disabled={deletingId === r.id} title="Delete" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">{deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkPromoteCard({ classes, onDone }) {
  const [form, setForm] = useState({ fromClassId: '', toClassId: '', toSection: '', effectiveDate: today(), reason: '' });
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setMessage(''); };

  async function runPromotion() {
    setConfirmOpen(false);
    setRunning(true); setMessage('');
    try {
      const result = await bulkPromoteClass(form);
      setMessage(`Promoted ${result.promotedCount} student${result.promotedCount === 1 ? '' : 's'}.`);
      onDone();
    } catch (err) { setMessage(err.message || 'Bulk promotion failed.'); }
    finally { setRunning(false); }
  }

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); setConfirmOpen(true); }} className="card space-y-4 border-indigo-100 bg-indigo-50/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="font-black text-slate-800">Year-End Bulk Promotion</h3>
        </div>
        <p className="text-xs text-slate-500">Moves every active student from one class to another in a single action. Each student still gets an individual promotion record below.</p>
        {message && <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</div>}
        <div className="grid gap-4 lg:grid-cols-5">
          <Field label="From Class"><Select required value={form.fromClassId} onChange={e => set('fromClassId', e.target.value)}><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}{c.academicYear ? ` (${c.academicYear})` : ''}</option>)}</Select></Field>
          <Field label="To Class"><Select required value={form.toClassId} onChange={e => set('toClassId', e.target.value)}><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}{c.academicYear ? ` (${c.academicYear})` : ''}</option>)}</Select></Field>
          <Field label="To Section (optional)"><Input value={form.toSection} onChange={e => set('toSection', e.target.value)} placeholder="Keep class default" /></Field>
          <Field label="Effective Date"><Input required type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} /></Field>
          <div className="flex items-end"><button disabled={running} className="btn-primary w-full justify-center">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}Promote All</button></div>
        </div>
      </form>
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <h3 className="text-base font-bold text-slate-800">Confirm Bulk Promotion</h3>
              <p className="mt-1 text-sm text-slate-500">Promote ALL active students of the source class to the destination class? This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setConfirmOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={runPromotion} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Promote All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StructureModal({ active, data, classes, teachers, students, initialForm, editingId, saving, error, onClose, onChange, onSubmit }) {
  const title = editingId ? `Edit ${TABS.find(t => t.id === active)?.label || 'Record'}` : `New ${TABS.find(t => t.id === active)?.label || 'Record'}`;
  const set = (k, v) => onChange(k, v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto p-6">
          {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            {active==='subjects' && <><Field label="Code"><Input value={initialForm.code||''} onChange={e=>set('code',e.target.value)} placeholder="e.g. MATH" /></Field><Field label="Name"><Input required value={initialForm.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. Mathematics" /></Field><Field label="Department"><Input value={initialForm.department||''} onChange={e=>set('department',e.target.value)} /></Field><Field label="Description"><Input value={initialForm.description||''} onChange={e=>set('description',e.target.value)} /></Field>{editingId && <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={initialForm.isActive !== false} onChange={e=>set('isActive',e.target.checked)} /> Active</label>}</>}
            {active==='sessions' && <><Field label="Name"><Input required value={initialForm.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. 2026" /></Field><Field label="Start"><Input type="date" value={initialForm.startDate||''} onChange={e=>set('startDate',e.target.value)} /></Field><Field label="End"><Input type="date" value={initialForm.endDate||''} onChange={e=>set('endDate',e.target.value)} /></Field><label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(initialForm.isActive)} onChange={e=>set('isActive',e.target.checked)} /> Active session</label></>}
            {active==='terms' && <><Field label="Session"><Select value={initialForm.sessionId||''} onChange={e=>set('sessionId',e.target.value)}><option value="">None</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Name"><Input required value={initialForm.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. First Term" /></Field><Field label="Start"><Input type="date" value={initialForm.startDate||''} onChange={e=>set('startDate',e.target.value)} /></Field><Field label="End"><Input type="date" value={initialForm.endDate||''} onChange={e=>set('endDate',e.target.value)} /></Field></>}
            {active==='assignments' && <><Field label="Teacher"><Select required value={initialForm.teacherId||''} onChange={e=>set('teacherId',e.target.value)}><option value="">Select</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><Field label="Subject"><Select required value={initialForm.subjectId||''} onChange={e=>set('subjectId',e.target.value)}><option value="">Select</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Class"><Select required value={initialForm.classId||''} onChange={e=>set('classId',e.target.value)}><option value="">Select</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select></Field><Field label="Session"><Select value={initialForm.sessionId||''} onChange={e=>set('sessionId',e.target.value)}><option value="">None</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field></>}
            {active==='grading-policies' && <><Field label="Policy"><Input required value={initialForm.name||''} onChange={e=>set('name',e.target.value)} placeholder="Default" /></Field><Field label="Min %"><Input type="number" value={initialForm.minPercent??''} onChange={e=>set('minPercent',e.target.value)} /></Field><Field label="Max %"><Input type="number" value={initialForm.maxPercent??''} onChange={e=>set('maxPercent',e.target.value)} /></Field><Field label="Grade"><Input required value={initialForm.grade||''} onChange={e=>set('grade',e.target.value)} /></Field><Field label="Point"><Input type="number" step="0.01" value={initialForm.gradePoint??''} onChange={e=>set('gradePoint',e.target.value)} /></Field></>}
            {active==='movements' && <><Field label="Student"><Select required value={initialForm.studentUserId||''} onChange={e=>set('studentUserId',e.target.value)}><option value="">Select</option>{students.map(s=><option key={s.userId} value={s.userId}>{s.name}</option>)}</Select></Field><Field label="Type"><Select required value={initialForm.movementType||''} onChange={e=>set('movementType',e.target.value)}><option value="">Select</option>{['promotion','section_change','transfer','withdrawal'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</Select></Field><Field label="To Class"><Select value={initialForm.toClassId||''} onChange={e=>set('toClassId',e.target.value)}><option value="">None</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select></Field><Field label="To Section"><Input value={initialForm.toSection||''} onChange={e=>set('toSection',e.target.value)} /></Field><Field label="Date"><Input required type="date" value={initialForm.effectiveDate||today()} onChange={e=>set('effectiveDate',e.target.value)} /></Field><Field label="Reason"><Input value={initialForm.reason||''} onChange={e=>set('reason',e.target.value)} /></Field></>}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? 'Save Changes' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ label, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">Delete Record</h3>
          <p className="mt-1 text-sm text-slate-500">
            Delete <strong>{label}</strong>? Records that reference it may also be affected.
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

export default function StructureTab() {
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [active, setActive] = useState('sessions');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);

  async function load() {
    setLoading(true);
    const [structure, cls, tch, stu] = await Promise.all([getAcademicStructure(), listClasses(), listTeachersForAcademic(), listStudents()]);
    setData(structure); setClasses(cls.classes || []); setTeachers(tch.teachers || []); setStudents(stu.students || []); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }
  function switchTab(t) { setActive(t); setForm({}); setEditingId(null); setModalOpen(false); setError(''); }
  function startCreate() { setEditingId(null); setForm({ effectiveDate: today() }); setError(''); setModalOpen(true); }
  function startEdit(row) { setEditingId(row.id); setForm(ROW_TO_FORM[active] ? ROW_TO_FORM[active](row) : {}); setError(''); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditingId(null); setForm({}); setError(''); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = editingId
        ? await updateAcademicStructureRecord(active, editingId, form)
        : await createAcademicStructureRecord(active, form);
      setData(result); closeModal();
    } catch (err) { setError(err.message || 'Could not save.'); }
    finally { setSaving(false); }
  }

  function handleDelete(row) {
    setConfirmDeleteRow(row);
  }

  async function confirmAndDelete() {
    const row = confirmDeleteRow;
    setConfirmDeleteRow(null);
    setDeletingId(row.id); setError('');
    try {
      const result = await deleteAcademicStructureRecord(active, row.id);
      setData(result);
    } catch (err) { setError(err.message || 'Could not delete.'); }
    finally { setDeletingId(null); }
  }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  const rowsByTab = {
    sessions: data.sessions, terms: data.terms, subjects: data.subjects,
    assignments: data.assignments, 'grading-policies': data.gradingPolicies, movements: data.movements,
  };
  const activeSession = (data.sessions || []).find(s => s.is_active);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} className={`rounded-xl px-3 py-2 text-sm font-bold ${active === t.id ? 'bg-white text-[var(--brand)] shadow-soft' : 'text-slate-500'}`}>{t.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          Current session: {activeSession ? <span className="text-emerald-600">{activeSession.name}</span> : <span className="text-amber-600">none active</span>}
        </span>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" />New</button>
      </div>
    </div>

    {error && !modalOpen && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

    {active === 'movements' && <BulkPromoteCard classes={classes} onDone={() => load().catch(() => {})} />}

    <StructureTable type={active} rows={rowsByTab[active]} onEdit={startEdit} onDelete={handleDelete} deletingId={deletingId} />

    {modalOpen && (
      <StructureModal
        active={active}
        data={data}
        classes={classes}
        teachers={teachers}
        students={students}
        initialForm={form}
        editingId={editingId}
        saving={saving}
        error={error}
        onClose={closeModal}
        onChange={set}
        onSubmit={submit}
      />
    )}

    {confirmDeleteRow && (
      <DeleteConfirm
        label={confirmDeleteRow.name || confirmDeleteRow.subject_name || confirmDeleteRow.teacher_name || 'this record'}
        onConfirm={confirmAndDelete}
        onCancel={() => setConfirmDeleteRow(null)}
      />
    )}
  </div>;
}
