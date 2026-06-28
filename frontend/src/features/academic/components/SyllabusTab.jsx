import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, BookOpen } from 'lucide-react';
import { listClasses, getSyllabus, createSyllabusEntry, updateSyllabusEntry, deleteSyllabusEntry } from '../../../services/api/academicApi.js';

const EMPTY = { subject: '', title: '', description: '', chapterCount: '' };

export default function SyllabusTab() {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [syllabus, setSyllabus] = useState([]);
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
    getSyllabus(classId).then(s => setSyllabus(s.syllabus || [])).finally(() => setLoading(false));
  }, [classId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function openCreate() { setForm(EMPTY); setModal('create'); }
  function openEdit(entry) {
    setForm({ subject: entry.subject, title: entry.title, description: entry.description || '', chapterCount: entry.chapterCount || '' });
    setModal(entry);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, chapterCount: Number(form.chapterCount || 0), classId };
      let result;
      if (modal === 'create') result = await createSyllabusEntry(classId, payload);
      else result = await updateSyllabusEntry(modal.id, payload);
      setSyllabus(result.syllabus || []);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteSyllabusEntry(id, classId);
      setSyllabus(s => s.filter(e => e.id !== id));
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  // Group by subject
  const subjects = [...new Set(syllabus.map(s => s.subject))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
        </select>
        {classId && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 ml-auto"><Plus className="h-4 w-4" /> Add Syllabus</button>
        )}
      </div>

      {!classId ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <BookOpen className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Select a class to view its syllabus</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : !syllabus.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <BookOpen className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No syllabus entries yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => (
            <div key={subject} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">{subject}</div>
              <div className="divide-y divide-slate-50">
                {syllabus.filter(s => s.subject === subject).map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{entry.title}</p>
                      {entry.description && <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{entry.description}</p>}
                      {entry.chapterCount > 0 && <p className="mt-1 text-xs text-slate-400">{entry.chapterCount} chapter{entry.chapterCount !== 1 ? 's' : ''}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(entry)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(entry.id)} disabled={deleting === entry.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                        {deleting === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
              <h3 className="font-black text-slate-800">{modal === 'create' ? 'Add Syllabus Entry' : 'Edit Syllabus Entry'}</h3>
              <button onClick={() => setModal(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label-sm">Subject <span className="text-red-500">*</span></label>
                <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="label-sm">Title <span className="text-red-500">*</span></label>
                <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chapter 1: Algebra" />
              </div>
              <div>
                <label className="label-sm">Description</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Topics covered, learning objectives..." />
              </div>
              <div>
                <label className="label-sm">Number of Chapters</label>
                <input type="number" min="0" className="input" value={form.chapterCount} onChange={e => set('chapterCount', e.target.value)} placeholder="0" />
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
