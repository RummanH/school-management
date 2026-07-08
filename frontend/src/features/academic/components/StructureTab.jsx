import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { createAcademicStructureRecord, getAcademicStructure, listClasses, listTeachersForAcademic } from '../../../services/api/academicApi.js';
import { listStudents } from '../../../services/api/studentApi.js';

const today = () => new Date().toISOString().slice(0, 10);
function Field({ label, children }) { return <label className="block"><span className="label-sm">{label}</span>{children}</label>; }
function Input(p) { return <input {...p} className={`input ${p.className || ''}`} />; }
function Select(p) { return <select {...p} className={`input ${p.className || ''}`} />; }
function Table({ rows = [], cols = [] }) { if (!rows.length) return <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No records yet.</div>; return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400">{cols.map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i} className="border-b border-slate-50">{cols.map(c=><td key={c} className="px-4 py-3 text-slate-700">{String(r[c] ?? '')}</td>)}</tr>)}</tbody></table></div>; }

export default function StructureTab() {
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [active, setActive] = useState('subjects');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  async function load() {
    setLoading(true);
    const [structure, cls, tch, stu] = await Promise.all([getAcademicStructure(), listClasses(), listTeachersForAcademic(), listStudents()]);
    setData(structure); setClasses(cls.classes || []); setTeachers(tch.teachers || []); setStudents(stu.students || []); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  function set(k,v){ setForm(f=>({ ...f, [k]: v })); }
  async function submit(e) { e.preventDefault(); await createAcademicStructureRecord(active, form); setForm({}); await load(); }
  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;
  const tabs = ['subjects','assignments','sessions','terms','grading-policies','movements'];
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">{tabs.map(t=><button key={t} onClick={()=>{setActive(t);setForm({});}} className={`rounded-xl px-3 py-2 text-sm font-bold capitalize ${active===t?'bg-white text-[var(--brand)] shadow-soft':'text-slate-500'}`}>{t.replace('-', ' ')}</button>)}</div>
    <form onSubmit={submit} className="card grid gap-4 lg:grid-cols-5">
      {active==='subjects' && <><Field label="Code"><Input value={form.code||''} onChange={e=>set('code',e.target.value)} /></Field><Field label="Name"><Input required value={form.name||''} onChange={e=>set('name',e.target.value)} /></Field><Field label="Department"><Input value={form.department||''} onChange={e=>set('department',e.target.value)} /></Field><Field label="Description"><Input value={form.description||''} onChange={e=>set('description',e.target.value)} /></Field></>}
      {active==='sessions' && <><Field label="Name"><Input required value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="2026" /></Field><Field label="Start"><Input type="date" value={form.startDate||''} onChange={e=>set('startDate',e.target.value)} /></Field><Field label="End"><Input type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)} /></Field><label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(form.isActive)} onChange={e=>set('isActive',e.target.checked)} /> Active</label></>}
      {active==='terms' && <><Field label="Session"><Select value={form.sessionId||''} onChange={e=>set('sessionId',e.target.value)}><option value="">None</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Name"><Input required value={form.name||''} onChange={e=>set('name',e.target.value)} /></Field><Field label="Start"><Input type="date" value={form.startDate||''} onChange={e=>set('startDate',e.target.value)} /></Field><Field label="End"><Input type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)} /></Field></>}
      {active==='assignments' && <><Field label="Teacher"><Select required value={form.teacherId||''} onChange={e=>set('teacherId',e.target.value)}><option value="">Select</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><Field label="Subject"><Select required value={form.subjectId||''} onChange={e=>set('subjectId',e.target.value)}><option value="">Select</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Class"><Select required value={form.classId||''} onChange={e=>set('classId',e.target.value)}><option value="">Select</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select></Field><Field label="Session"><Select value={form.sessionId||''} onChange={e=>set('sessionId',e.target.value)}><option value="">None</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field></>}
      {active==='grading-policies' && <><Field label="Policy"><Input required value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="Default" /></Field><Field label="Min %"><Input type="number" value={form.minPercent||''} onChange={e=>set('minPercent',e.target.value)} /></Field><Field label="Max %"><Input type="number" value={form.maxPercent||''} onChange={e=>set('maxPercent',e.target.value)} /></Field><Field label="Grade"><Input required value={form.grade||''} onChange={e=>set('grade',e.target.value)} /></Field><Field label="Point"><Input type="number" value={form.gradePoint||''} onChange={e=>set('gradePoint',e.target.value)} /></Field></>}
      {active==='movements' && <><Field label="Student"><Select required value={form.studentUserId||''} onChange={e=>set('studentUserId',e.target.value)}><option value="">Select</option>{students.map(s=><option key={s.userId} value={s.userId}>{s.name}</option>)}</Select></Field><Field label="Type"><Select required value={form.movementType||''} onChange={e=>set('movementType',e.target.value)}><option value="">Select</option>{['promotion','section_change','transfer','withdrawal'].map(x=><option key={x} value={x}>{x}</option>)}</Select></Field><Field label="To Class"><Select value={form.toClassId||''} onChange={e=>set('toClassId',e.target.value)}><option value="">None</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select></Field><Field label="To Section"><Input value={form.toSection||''} onChange={e=>set('toSection',e.target.value)} /></Field><Field label="Date"><Input required type="date" value={form.effectiveDate||today()} onChange={e=>set('effectiveDate',e.target.value)} /></Field><Field label="Reason"><Input value={form.reason||''} onChange={e=>set('reason',e.target.value)} /></Field></>}
      <div className="flex items-end"><button className="btn-primary"><Plus className="h-4 w-4" />Add</button></div>
    </form>
    {active==='subjects' && <Table rows={data.subjects} cols={['code','name','department','is_active']} />}
    {active==='sessions' && <Table rows={data.sessions} cols={['name','start_date','end_date','is_active']} />}
    {active==='terms' && <Table rows={data.terms} cols={['session_name','name','start_date','end_date']} />}
    {active==='assignments' && <Table rows={data.assignments} cols={['teacher_name','subject_name','class_name','section','session_name']} />}
    {active==='grading-policies' && <Table rows={data.gradingPolicies} cols={['name','min_percent','max_percent','grade','grade_point','is_passing']} />}
    {active==='movements' && <Table rows={data.movements} cols={['student_name','movement_type','from_class_name','to_class_name','to_section','effective_date','reason']} />}
  </div>;
}