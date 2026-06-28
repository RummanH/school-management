import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Users, X, Save, GraduationCap } from 'lucide-react';
import { listClasses, createClass, updateClass, deleteClass } from '../../../services/api/academicApi.js';
import { listTeachersForAcademic } from '../../../services/api/academicApi.js';

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY = { name: '', section: '', academicYear: '', classTeacherId: '', description: '' };

export default function ClassesTab() {
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([listClasses(), listTeachersForAcademic()])
      .then(([c, t]) => { setClasses(c.classes || []); setTeachers(t.teachers || []); })
      .finally(() => setLoading(false));
  }, []);

  function openCreate() { setForm(EMPTY); setModal('create'); }
  function openEdit(cls) { setForm({ ...cls, classTeacherId: cls.classTeacherId || '' }); setModal(cls); }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const isEdit = modal && modal !== 'create';
      const result = isEdit ? await updateClass(modal.id, form) : await createClass(form);
      setClasses(result.classes || []);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class? All routines, syllabus, exams and results will also be deleted.')) return;
    setDeleting(id);
    try {
      const result = await deleteClass(id);
      setClasses(result.classes || []);
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New Class</button>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <GraduationCap className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No classes yet</p>
          <p className="mt-1 text-xs">Create a class to get started</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(cls => (
            <div key={cls.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-slate-800">{cls.name}{cls.section && ` — ${cls.section}`}</p>
                  {cls.academicYear && <p className="text-xs text-slate-400">Year: {cls.academicYear}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cls)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(cls.id)} disabled={deleting === cls.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                    {deleting === cls.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{cls.studentCount} students</span>
                {cls.classTeacherName && <span>Teacher: {cls.classTeacherName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Class' : 'Edit Class'} onClose={() => setModal(null)} onSave={handleSave} saving={saving}>
          <div>
            <label className="label-sm">Class Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Class 8, Grade 10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-sm">Section</label>
              <input className="input" value={form.section} onChange={e => set('section', e.target.value)} placeholder="e.g. A, B, Science" />
            </div>
            <div>
              <label className="label-sm">Academic Year</label>
              <input className="input" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} placeholder="e.g. 2024-25" />
            </div>
          </div>
          <div>
            <label className="label-sm">Class Teacher</label>
            <select className="input" value={form.classTeacherId} onChange={e => set('classTeacherId', e.target.value)}>
              <option value="">— None —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Description</label>
            <textarea className="input min-h-[60px]" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes" />
          </div>
        </Modal>
      )}
    </div>
  );
}
