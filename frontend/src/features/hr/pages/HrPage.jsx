import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarCheck, FileText, Loader2, Plus, Save, Star, Trash2, WalletCards, X } from 'lucide-react';
import { addPerformanceNote, addStaffDocument, deleteStaff, getHrOverview, markStaffAttendance, requestStaffLeave, reviewStaffLeave, savePayroll, saveStaff } from '../../../services/api/hrApi.js';
import { useAuth } from '../../../app/App.jsx';

const ALL_TABS = ['Staff', 'Attendance', 'Leave', 'Payroll', 'Documents', 'Performance'];
const ACCOUNTANT_TABS = ['Payroll'];
const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const money = (n) => `BDT ${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function Field({ label, children }) { return <label className="block"><span className="label-sm">{label}</span>{children}</label>; }
function Input(p) { return <input {...p} className={`input ${p.className || ''}`} />; }
function Select(p) { return <select {...p} className={`input ${p.className || ''}`} />; }
function Empty({ children }) { return <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">{children}</div>; }
function Stat({ icon: Icon, label, value, color }) { return <div className="card flex items-center gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div></div>; }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Confirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">Delete Staff</h3>
          <p className="mt-1 text-sm text-slate-500">
            Delete <strong>{name}</strong> and their entire staff record? This cannot be undone.
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

function StaffForm({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Name"><Input required value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></Field>
      <Field label="Type"><Select value={value.staffType} onChange={e => onChange({ ...value, staffType: e.target.value })}><option value="non_teaching">Non-teaching</option><option value="support">Support</option><option value="admin">Admin</option></Select></Field>
      <Field label="Designation"><Input value={value.designation} onChange={e => onChange({ ...value, designation: e.target.value })} /></Field>
      <Field label="Department"><Input value={value.department} onChange={e => onChange({ ...value, department: e.target.value })} /></Field>
      <Field label="Base Salary"><Input type="number" value={value.baseSalary} onChange={e => onChange({ ...value, baseSalary: e.target.value })} /></Field>
      <Field label="Employee ID"><Input value={value.employeeId} onChange={e => onChange({ ...value, employeeId: e.target.value })} /></Field>
      <Field label="Qualification"><Input value={value.qualification} onChange={e => onChange({ ...value, qualification: e.target.value })} /></Field>
      <Field label="Phone"><Input value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value })} /></Field>
      <Field label="Email"><Input value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} /></Field>
      <div className="flex items-end"><button className="btn-primary"><Save className="h-4 w-4" />Save</button></div>
    </form>
  );
}

function MiniForm({ onSubmit, staff, state, setState, fields, submitLabel = 'Add' }) {
  return <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="Staff"><Select required value={state.staffId} onChange={e => setState({ ...state, staffId: e.target.value })}><option value="">Select staff</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>{fields.map(([k, type, opts]) => <Field key={k} label={k.replace(/[A-Z]/g, m => ` ${m}`)}>{type === 'select' ? <Select value={state[k]} onChange={e => setState({ ...state, [k]: e.target.value })}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</Select> : <Input required={['title', 'note', 'startDate', 'endDate'].includes(k)} type={type} value={state[k] || ''} onChange={e => setState({ ...state, [k]: e.target.value })} />}</Field>)}<div className="flex items-end"><button className="btn-primary"><Plus className="h-4 w-4" />{submitLabel}</button></div></form>;
}

function Table({ rows = [], cols = [], action, moneyCols = [] }) {
  if (!rows.length) return <Empty>No records.</Empty>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400">{cols.map(c => <th key={c} className="px-4 py-3">{c}</th>)}{action && <th />}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i} className="border-b border-slate-50">{cols.map(c => <td key={c} className="px-4 py-3 text-slate-700">{moneyCols.includes(c) ? money(r[c]) : String(r[c] ?? '')}</td>)}{action && <td className="px-4 py-3 text-right">{action(r)}</td>}</tr>)}</tbody></table></div>;
}

export default function HrPage() {
  const { currentUser } = useAuth();
  const isAccountant = currentUser?.role === 'accountant';
  const TABS = isAccountant ? ACCOUNTANT_TABS : ALL_TABS;
  const [active, setActive] = useState(TABS[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [staffForm, setStaffForm] = useState({ name: '', staffType: 'non_teaching', employeeId: '', designation: '', department: '', qualification: '', phone: '', email: '', joiningDate: today(), contractType: 'permanent', baseSalary: 0, status: 'active' });
  const [attendance, setAttendance] = useState({ staffId: '', attendanceDate: today(), status: 'present', note: '' });
  const [leave, setLeave] = useState({ staffId: '', leaveType: 'casual', startDate: today(), endDate: today(), reason: '' });
  const [payroll, setPayroll] = useState({ staffId: '', period: month(), baseSalary: 0, allowances: 0, deductions: 0, status: 'draft', paidAt: '', notes: '' });
  const [doc, setDoc] = useState({ staffId: '', documentType: 'joining', title: '', fileUrl: '', notes: '' });
  const [note, setNote] = useState({ staffId: '', note: '', rating: '' });

  async function load() {
    setLoading(true);
    try {
      setData(await getHrOverview());
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load HR data.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function confirmAndDelete() {
    const s = confirmDelete;
    setConfirmDelete(null);
    await deleteStaff(s.id);
    load();
  }

  const staff = data?.staff || [];
  const selectedStaff = staff.find(s => s.id === payroll.staffId);
  useEffect(() => { if (selectedStaff && !payroll.baseSalary) setPayroll(p => ({ ...p, baseSalary: selectedStaff.baseSalary })); }, [payroll.staffId]);

  async function submitStaff(e) { e.preventDefault(); await saveStaff(staffForm); setStaffForm({ ...staffForm, name: '', employeeId: '', designation: '', department: '', qualification: '', phone: '', email: '', baseSalary: 0 }); setModal(null); load(); }
  async function submitAttendance(e) { e.preventDefault(); await markStaffAttendance(attendance); setModal(null); load(); }
  async function submitLeave(e) { e.preventDefault(); await requestStaffLeave(leave); setModal(null); load(); }
  async function submitPayroll(e) { e.preventDefault(); await savePayroll(payroll); setModal(null); load(); }
  async function submitDoc(e) { e.preventDefault(); await addStaffDocument(doc); setDoc({ ...doc, title: '', fileUrl: '', notes: '' }); setModal(null); load(); }
  async function submitNote(e) { e.preventDefault(); await addPerformanceNote(note); setNote({ ...note, note: '', rating: '' }); setModal(null); load(); }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  return <div className="space-y-5"><div><h2 className="text-lg font-black text-slate-800">HR & Staff Management</h2><p className="text-sm text-slate-500">Non-teaching staff, attendance, leave, payroll, contracts, and performance records.</p></div>
    {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={BriefcaseBusiness} label="Active Staff" value={staff.filter(s => s.status === 'active').length} color="bg-emerald-50 text-emerald-600" /><Stat icon={CalendarCheck} label="Attendance Records" value={data?.attendance?.length || 0} color="bg-blue-50 text-blue-600" /><Stat icon={WalletCards} label="Payroll Records" value={data?.payroll?.length || 0} color="bg-amber-50 text-amber-600" /><Stat icon={Star} label="Performance Notes" value={data?.notes?.length || 0} color="bg-purple-50 text-purple-600" /></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">{TABS.map(t => <button key={t} onClick={() => setActive(t)} className={`rounded-xl px-3 py-2 text-sm font-bold ${active === t ? 'bg-white text-[var(--brand)] shadow-soft' : 'text-slate-500'}`}>{t}</button>)}</div><button onClick={() => setModal(active)} className="btn-primary"><Plus className="h-4 w-4" />New</button></div>
    {active === 'Staff' && <>{staff.length ? <Table rows={staff} cols={['name', 'designation', 'department', 'staffType', 'baseSalary', 'status']} action={s => <button onClick={() => setConfirmDelete(s)} className="btn-danger"><Trash2 className="h-4 w-4" /></button>} /> : <Empty>No staff records yet.</Empty>}</>}
    {active === 'Attendance' && <Table rows={data?.attendance} cols={['attendanceDate', 'staffName', 'status', 'note']} />}
    {active === 'Leave' && <Table rows={data?.leaves} cols={['staffName', 'leaveType', 'startDate', 'endDate', 'status', 'reason']} action={l => <div className="flex gap-1"><button onClick={() => reviewStaffLeave(l.id, 'approved').then(load)} className="btn-secondary">Approve</button><button onClick={() => reviewStaffLeave(l.id, 'rejected').then(load)} className="btn-danger">Reject</button></div>} />}
    {active === 'Payroll' && <Table rows={data?.payroll} cols={['period', 'staffName', 'baseSalary', 'allowances', 'deductions', 'netSalary', 'status']} moneyCols={['baseSalary', 'allowances', 'deductions', 'netSalary']} />}
    {active === 'Documents' && <Table rows={data?.documents} cols={['staffName', 'documentType', 'title', 'fileUrl', 'notes']} />}
    {active === 'Performance' && <Table rows={data?.notes} cols={['staffName', 'rating', 'note', 'createdAt']} />}

    {modal === 'Staff' && <Modal title="New Staff Record" onClose={() => setModal(null)}><StaffForm value={staffForm} onChange={setStaffForm} onSubmit={submitStaff} /></Modal>}
    {modal === 'Attendance' && <Modal title="Mark Attendance" onClose={() => setModal(null)}><MiniForm onSubmit={submitAttendance} staff={staff} state={attendance} setState={setAttendance} fields={[['attendanceDate', 'date'], ['status', 'select', ['present', 'absent', 'late']], ['note', 'text']]} submitLabel="Save" /></Modal>}
    {modal === 'Leave' && <Modal title="Request Leave" onClose={() => setModal(null)}><MiniForm onSubmit={submitLeave} staff={staff} state={leave} setState={setLeave} fields={[['leaveType', 'select', ['casual', 'sick', 'earned', 'unpaid']], ['startDate', 'date'], ['endDate', 'date'], ['reason', 'text']]} submitLabel="Submit" /></Modal>}
    {modal === 'Payroll' && <Modal title="New Payroll Entry" onClose={() => setModal(null)}><MiniForm onSubmit={submitPayroll} staff={staff} state={payroll} setState={setPayroll} fields={[['period', 'text'], ['baseSalary', 'number'], ['allowances', 'number'], ['deductions', 'number'], ['status', 'select', ['draft', 'approved', 'paid']], ['paidAt', 'date'], ['notes', 'text']]} submitLabel="Save" /></Modal>}
    {modal === 'Documents' && <Modal title="Add Staff Document" onClose={() => setModal(null)}><MiniForm onSubmit={submitDoc} staff={staff} state={doc} setState={setDoc} fields={[['documentType', 'select', ['contract', 'joining', 'nid', 'certificate', 'other']], ['title', 'text'], ['fileUrl', 'text'], ['notes', 'text']]} submitLabel="Add Document" /></Modal>}
    {modal === 'Performance' && <Modal title="Add Performance Note" onClose={() => setModal(null)}><MiniForm onSubmit={submitNote} staff={staff} state={note} setState={setNote} fields={[['rating', 'number'], ['note', 'text']]} submitLabel="Add Note" /></Modal>}
    {confirmDelete && <Confirm name={confirmDelete.name} onConfirm={confirmAndDelete} onCancel={() => setConfirmDelete(null)} />}
  </div>;
}
