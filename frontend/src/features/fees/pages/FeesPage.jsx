import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign, Plus, Save, Trash2, Pencil, Loader2, ReceiptText, CreditCard, WalletCards,
  AlertTriangle, BookOpen, Tags, UserCog, CalendarDays, Banknote, X, Search, Sparkles, ArrowRight,
} from 'lucide-react';
import { listStudents } from '../../../services/api/studentApi.js';
import { listClasses } from '../../../services/api/academicApi.js';
import {
  listFeeCategories, createFeeCategory, updateFeeCategory, deleteFeeCategory,
  listFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure,
  listFeeAssignments, createFeeAssignment, updateFeeAssignment, deleteFeeAssignment,
  listFeeInvoices, getFeeInvoice, generateFeeInvoices, recordFeePayment,
  listExpenses, createExpense, deleteExpense, getFeeReport, getFeeDefaulters,
  getCashBook, getFinanceBalance, getStudentMonthlyLedger,
} from '../../../services/api/feeApi.js';

const TABS = [
  { key: 'Summary', icon: BadgeDollarSign },
  { key: 'Categories', icon: Tags },
  { key: 'Fee Rules', icon: BookOpen },
  { key: 'Student Overrides', icon: UserCog },
  { key: 'Invoices', icon: ReceiptText },
  { key: 'Monthly Record', icon: CalendarDays },
  { key: 'Cash Book', icon: WalletCards },
  { key: 'Expenses', icon: Banknote },
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const money = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Shared building blocks ─── */

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{children}</label>;
}
function Input(props) { return <input {...props} className={`input ${props.className || ''}`} />; }
function Select(props) { return <select {...props} className={`input ${props.className || ''}`} />; }
function Textarea(props) { return <textarea {...props} className={`input min-h-[76px] ${props.className || ''}`} />; }
function Empty({ icon: Icon, title, children, action }) {
  return <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center">
    {Icon && <Icon className="mb-3 h-9 w-9 text-slate-300" />}
    <p className="text-sm font-bold text-slate-600">{title}</p>
    {children && <p className="mt-1 max-w-sm text-sm text-slate-400">{children}</p>}
    {action}
  </div>;
}
function StatusBadge({ status }) {
  const cls = status === 'paid' ? 'bg-emerald-100 text-emerald-700' : status === 'partial' ? 'bg-amber-100 text-amber-700' : status === 'not_billed' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600';
  const label = status === 'not_billed' ? 'not billed' : status;
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${cls}`}>{label}</span>;
}
function Stat({ icon: Icon, label, value, color }) {
  return <div className="card flex items-center gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div></div>;
}
function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return <div className="relative max-w-xs flex-1">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input w-full pl-9" />
  </div>;
}
function TabIntro({ children }) {
  return <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2"><Sparkles className="h-4 w-4 mt-0.5 shrink-0" />{children}</div>;
}
function Toolbar({ search, onSearch, searchPlaceholder, newLabel, onNew }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    {onSearch ? <SearchBox value={search} onChange={onSearch} placeholder={searchPlaceholder} /> : <div />}
    {onNew && <button onClick={onNew} className="btn-primary"><Plus className="h-4 w-4" />{newLabel}</button>}
  </div>;
}
function RowActions({ onEdit, onDelete }) {
  return <div className="flex justify-end gap-1.5">
    {onEdit && <button onClick={onEdit} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>}
    {onDelete && <button onClick={onDelete} title="Delete" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
  </div>;
}

function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-2xl' }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div><h2 className="text-base font-bold text-slate-800">{title}</h2>{subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}</div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>;
}

function Confirm({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
      <div className="px-6 py-5"><h3 className="text-base font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{message}</p></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{confirmLabel}</button>
      </div>
    </div>
  </div>;
}

function FormFooter({ saving, onCancel, saveLabel = 'Save' }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
    <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
    <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : saveLabel}</button>
  </div>;
}

/* ─── Forms (rendered inside a Modal by the parent) ─── */

function CategoryForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', description: '', defaultAmount: 0, billingCycle: 'monthly', lateFeeAmount: 0, isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await (initial ? updateFeeCategory(initial.id, form) : createFeeCategory(form)); onSaved(); }
    catch (err) { setError(err.message || 'Save failed.'); setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Category Name *"><Input required autoFocus value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tuition Fee" /></Field>
      <Field label="Billing Cycle"><Select value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)}><option value="monthly">Monthly</option><option value="term">Term</option><option value="annual">Annual</option><option value="one_time">One-time</option></Select></Field>
      <Field label="Default Amount"><Input type="number" min="0" step="0.01" value={form.defaultAmount} onChange={e => set('defaultAmount', e.target.value)} /></Field>
      <Field label="Late Fee (after due date)"><Input type="number" min="0" step="0.01" value={form.lateFeeAmount} onChange={e => set('lateFeeAmount', e.target.value)} placeholder="0 = no auto fine" /></Field>
    </div>
    <Field label="Description"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" /></Field>
    <FormFooter saving={saving} onCancel={onCancel} />
  </form>;
}

function StructureForm({ initial, classes, categories, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || { classId: '', categoryId: '', amount: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  useEffect(() => {
    if (!initial && form.categoryId && !form.amount) {
      const cat = categories.find(c => c.id === form.categoryId);
      if (cat) setForm(f => ({ ...f, amount: cat.defaultAmount }));
    }
  }, [form.categoryId]);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await (initial ? updateFeeStructure(initial.id, form) : createFeeStructure(form)); onSaved(); }
    catch (err) { setError(err.message || 'Save failed.'); setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Class"><Select value={form.classId} onChange={e => set('classId', e.target.value)}><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select></Field>
      <Field label="Fee Category *"><Select required autoFocus value={form.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Amount / month *"><Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
      <Field label="Status"><Select value={form.isActive ? '1' : '0'} onChange={e => set('isActive', e.target.value === '1')}><option value="1">Active</option><option value="0">Inactive</option></Select></Field>
    </div>
    <FormFooter saving={saving} onCancel={onCancel} />
  </form>;
}

function AssignmentForm({ initial, students, categories, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || { studentUserId: '', categoryId: '', amount: '', discountAmount: 0, waiverAmount: 0, scholarshipAmount: 0, fineAmount: 0, startPeriod: month(), endPeriod: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  useEffect(() => {
    if (!initial && form.categoryId && !form.amount) {
      const cat = categories.find(c => c.id === form.categoryId);
      if (cat) setForm(f => ({ ...f, amount: cat.defaultAmount }));
    }
  }, [form.categoryId]);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await (initial ? updateFeeAssignment(initial.id, form) : createFeeAssignment(form)); onSaved(); }
    catch (err) { setError(err.message || 'Save failed.'); setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Student *"><Select required autoFocus value={form.studentUserId} onChange={e => set('studentUserId', e.target.value)}><option value="">Select student</option>{students.map(s => <option key={s.userId} value={s.userId}>{s.name} ({s.className || 'No class'} {s.rollNumber || ''})</option>)}</Select></Field>
      <Field label="Category *"><Select required value={form.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Amount *"><Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
      <Field label="Status"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
    </div>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Adjustments</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Discount"><Input type="number" min="0" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} /></Field>
      <Field label="Waiver"><Input type="number" min="0" step="0.01" value={form.waiverAmount} onChange={e => set('waiverAmount', e.target.value)} /></Field>
      <Field label="Scholarship"><Input type="number" min="0" step="0.01" value={form.scholarshipAmount} onChange={e => set('scholarshipAmount', e.target.value)} /></Field>
      <Field label="Fine"><Input type="number" min="0" step="0.01" value={form.fineAmount} onChange={e => set('fineAmount', e.target.value)} /></Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Start Period"><Input value={form.startPeriod} onChange={e => set('startPeriod', e.target.value)} placeholder="2026-07" /></Field>
      <Field label="End Period"><Input value={form.endPeriod} onChange={e => set('endPeriod', e.target.value)} placeholder="Optional" /></Field>
    </div>
    <Field label="Notes"><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    <FormFooter saving={saving} onCancel={onCancel} />
  </form>;
}

function GenerateForm({ students, onGenerated, onCancel }) {
  const [form, setForm] = useState({ period: month(), title: '', dueDate: today(), studentUserIds: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault(); setSaving(true); setMessage('');
    try { const r = await generateFeeInvoices(form); setMessage(`${r.created.length} invoice(s) generated, ${r.skipped.length} skipped (already billed).`); onGenerated(); }
    catch (err) { setMessage(err.message || 'Generation failed.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Invoices for the current month generate automatically. Use this to backfill a missed period or bill a one-off term/annual charge.</div>
    {message && <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Period *"><Input required autoFocus value={form.period} onChange={e => set('period', e.target.value)} placeholder="2026-07" /></Field>
      <Field label="Due Date"><Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
    </div>
    <Field label="Title"><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="July 2026 Fees" /></Field>
    <Field label="Students"><Select multiple value={form.studentUserIds} onChange={e => set('studentUserIds', Array.from(e.target.selectedOptions).map(o => o.value))} className="min-h-[100px]"><option value="" disabled>All students unless selected</option>{students.map(s => <option key={s.userId} value={s.userId}>{s.name}</option>)}</Select></Field>
    <FormFooter saving={saving} onCancel={onCancel} saveLabel="Generate" />
  </form>;
}

function PaymentForm({ invoiceId, onPaid, onCancel }) {
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'cash', paymentDate: today(), referenceNo: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    getFeeInvoice(invoiceId)
      .then(d => { setInvoice(d.invoice); setForm(f => ({ ...f, amount: d.invoice.dueAmount })); })
      .catch(err => setLoadError(err.message || 'Failed to load invoice.'));
  }, [invoiceId]);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await recordFeePayment(invoiceId, form); onPaid(); }
    catch (err) { setError(err.message || 'Payment failed.'); setSaving(false); }
  }
  if (loadError) return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>;
  if (!invoice) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;
  return <form onSubmit={submit} className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
      <div><p className="font-bold text-slate-800">{invoice.studentName}</p><p className="text-xs text-slate-400">{invoice.title} · {invoice.period}</p></div>
      <p className="text-lg font-black text-red-600">Due {money(invoice.dueAmount)}</p>
    </div>
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Amount *"><Input required autoFocus type="number" min="0.01" step="0.01" max={invoice.dueAmount} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
      <Field label="Method"><Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="card">Card</option><option value="other">Other</option></Select></Field>
      <Field label="Date"><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></Field>
      <Field label="Reference No."><Input value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Optional" /></Field>
    </div>
    <Field label="Notes"><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></Field>
    <FormFooter saving={saving} onCancel={onCancel} saveLabel="Collect Payment" />
  </form>;
}

function ExpenseForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ category: '', amount: '', expenseDate: today(), payee: '', method: 'cash', referenceNo: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await createExpense(form); onSaved(); }
    catch (err) { setError(err.message || 'Save failed.'); setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Category *"><Input required autoFocus value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Utilities" /></Field>
      <Field label="Amount *"><Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
      <Field label="Date"><Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} /></Field>
      <Field label="Method"><Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="other">Other</option></Select></Field>
      <Field label="Payee"><Input value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} placeholder="Optional" /></Field>
      <Field label="Reference No."><Input value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Optional" /></Field>
    </div>
    <Field label="Notes"><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></Field>
    <FormFooter saving={saving} onCancel={onCancel} saveLabel="Add Expense" />
  </form>;
}

/* ─── Tab bodies ─── */

function DefaultersPanel({ classes }) {
  const [period, setPeriod] = useState(month());
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  async function search() {
    setLoading(true);
    try { const r = await getFeeDefaulters({ period: period || undefined, classId: classId || undefined }); setRows(r.defaulters || []); }
    finally { setLoading(false); }
  }
  useEffect(() => { search(); }, []);

  return <div className="card mb-5 border-red-100 bg-red-50/30">
    <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-2 font-black text-slate-800"><AlertTriangle className="h-5 w-5 text-red-500" />Defaulters{rows && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{rows.length}</span>}</span>
      <span className="text-xs font-bold text-slate-400">{open ? 'Hide' : 'Show'}</span>
    </button>
    {open && <div className="mt-3">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-07 (blank = all periods)" className="max-w-[220px]" />
        <Select value={classId} onChange={e => setClassId(e.target.value)} className="max-w-[200px]"><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</Select>
        <button onClick={search} className="btn-secondary">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</button>
      </div>
      {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
        : !rows?.length ? <p className="py-6 text-center text-sm text-slate-400">No outstanding dues for this filter. 🎉</p>
        : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Student</th><th>Period</th><th>Due</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{r.studentName}<p className="text-xs font-normal text-slate-400">{r.className} {r.section} · Roll {r.rollNumber || '—'}</p></td><td>{r.period}</td><td className="font-bold text-red-600">{money(r.dueAmount)}</td></tr>)}</tbody></table></div>}
    </div>}
  </div>;
}

function MonthlyRecordTab({ students }) {
  const [studentUserId, setStudentUserId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  async function search() {
    if (!studentUserId) return;
    setLoading(true);
    try { setData(await getStudentMonthlyLedger(studentUserId, year)); }
    finally { setLoading(false); }
  }

  return <div className="space-y-5">
    <div className="card grid gap-4 lg:grid-cols-4">
      <Field label="Student"><Select value={studentUserId} onChange={e => setStudentUserId(e.target.value)}><option value="">Select student</option>{students.map(s => <option key={s.userId} value={s.userId}>{s.name} ({s.className || 'No class'} {s.rollNumber || ''})</option>)}</Select></Field>
      <Field label="Year"><Select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</Select></Field>
      <div className="flex items-end"><button onClick={search} disabled={!studentUserId || loading} className="btn-primary disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View Record'}</button></div>
    </div>
    {!data ? <Empty icon={CalendarDays} title="No student selected">Pick a student above to see their month-by-month payment record for the year.</Empty> : <div>
      <h3 className="mb-3 font-black text-slate-800">{data.student?.name} — {year}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.months.map((m, idx) => <div key={m.period} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-600">{MONTH_LABELS[idx]}</p><StatusBadge status={m.status} /></div>
          <p className="mt-2 text-lg font-black text-slate-800">{m.status === 'not_billed' ? '—' : money(m.totalAmount)}</p>
          {m.status !== 'not_billed' && <p className="text-xs text-slate-400">Paid {money(m.paidAmount)}{m.dueAmount > 0 ? ` · Due ${money(m.dueAmount)}` : ''}</p>}
        </div>)}
      </div>
    </div>}
  </div>;
}

function CashBookTab() {
  const [balance, setBalance] = useState(null);
  const [txns, setTxns] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', method: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [b, t] = await Promise.all([getFinanceBalance(), getCashBook({ from: filters.from || undefined, to: filters.to || undefined, method: filters.method || undefined })]);
    setBalance(b.balance); setTxns(t.transactions || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat icon={CreditCard} label="Total In" value={money(balance?.totalIn)} color="bg-emerald-50 text-emerald-600" />
      <Stat icon={WalletCards} label="Total Out" value={money(balance?.totalOut)} color="bg-amber-50 text-amber-600" />
      <Stat icon={BadgeDollarSign} label="Net Balance" value={money(balance?.balance)} color="bg-blue-50 text-blue-600" />
    </div>
    <div className="card grid gap-4 lg:grid-cols-4">
      <Field label="From"><Input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></Field>
      <Field label="To"><Input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></Field>
      <Field label="Method"><Select value={filters.method} onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}><option value="">All Methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="card">Card</option><option value="other">Other</option></Select></Field>
      <div className="flex items-end"><button onClick={load} className="btn-primary w-full justify-center">Filter</button></div>
    </div>
    {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
      : !txns.length ? <Empty icon={WalletCards} title="No transactions recorded yet">Fee payments, expenses, and paid payroll all show up here automatically.</Empty>
      : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Date</th><th>Source</th><th>Category</th><th>Method</th><th className="text-right">Amount</th></tr></thead><tbody>{txns.map(t => <tr key={t.id} className="border-b border-slate-50"><td className="px-4 py-3 text-slate-500">{t.transactionDate}</td><td className="capitalize">{t.sourceType.replace(/_/g, ' ')}</td><td>{t.category || '—'}</td><td className="capitalize">{t.method}</td><td className={`px-4 py-3 text-right font-bold ${t.direction === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>{t.direction === 'in' ? '+' : '-'}{money(t.amount)}</td></tr>)}</tbody></table></div>}
  </div>;
}

/* ─── Page ─── */

export default function FeesPage() {
  const [active, setActive] = useState('Summary');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [structures, setStructures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [report, setReport] = useState(null);

  const [modal, setModal] = useState(null); // { type, initial? }
  const [confirm, setConfirm] = useState(null); // { title, message, run }
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [structuresSearch, setStructuresSearch] = useState('');
  const [overridesSearch, setOverridesSearch] = useState('');
  const [expensesSearch, setExpensesSearch] = useState('');
  const [invoiceFilters, setInvoiceFilters] = useState({ className: '', period: '', search: '' });

  async function load() {
    setLoading(true);
    const [s, cl, c, st, a, i, e, r] = await Promise.all([
      listStudents(), listClasses(), listFeeCategories(), listFeeStructures(), listFeeAssignments(),
      listFeeInvoices(), listExpenses(), getFeeReport(),
    ]);
    setStudents(s.students || []); setClasses(cl.classes || []); setCategories(c.categories || []);
    setStructures(st.structures || []); setAssignments(a.assignments || []); setInvoices(i.invoices || []);
    setExpenses(e.expenses || []); setReport(r.report || null); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  function closeModal() { setModal(null); }
  function afterSave() { closeModal(); load(); }

  function askDelete({ title, message, run }) {
    setConfirm({ title, message, run });
  }
  async function runConfirm() {
    setConfirmBusy(true);
    try { await confirm.run(); setConfirm(null); load(); }
    catch (err) { setConfirm(null); alert(err.message || 'Delete failed.'); }
    finally { setConfirmBusy(false); }
  }

  const filteredStructures = useMemo(() => structures.filter(s => {
    const q = structuresSearch.trim().toLowerCase();
    if (!q) return true;
    return (s.className || 'all classes').toLowerCase().includes(q) || s.categoryName.toLowerCase().includes(q);
  }), [structures, structuresSearch]);

  const filteredAssignments = useMemo(() => assignments.filter(a => {
    const q = overridesSearch.trim().toLowerCase();
    if (!q) return true;
    return a.studentName.toLowerCase().includes(q) || a.categoryName.toLowerCase().includes(q);
  }), [assignments, overridesSearch]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const q = expensesSearch.trim().toLowerCase();
    if (!q) return true;
    return e.category.toLowerCase().includes(q) || (e.payee || '').toLowerCase().includes(q);
  }), [expenses, expensesSearch]);

  const filteredInvoices = useMemo(() => invoices.filter(i =>
    (!invoiceFilters.className || i.className === invoiceFilters.className) &&
    (!invoiceFilters.period || i.period === invoiceFilters.period) &&
    (!invoiceFilters.search || i.studentName.toLowerCase().includes(invoiceFilters.search.trim().toLowerCase()))
  ), [invoices, invoiceFilters]);
  const invoiceClassNames = useMemo(() => [...new Set(invoices.map(i => i.className).filter(Boolean))], [invoices]);
  const invoicePeriods = useMemo(() => [...new Set(invoices.map(i => i.period))].sort().reverse(), [invoices]);

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-800">Fees & Accounting</h2><p className="mt-0.5 text-sm text-slate-500">Set class-wise fee rules, generate monthly invoices automatically, collect payments, and reconcile the cash book.</p></div>
    </div>

    <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {TABS.map(({ key, icon: Icon }) => <button key={key} onClick={() => setActive(key)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${active === key ? 'bg-white text-[var(--brand)] shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}><Icon className="h-4 w-4" />{key}</button>)}
    </div>

    {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div> : <>

      {active === 'Summary' && <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={ReceiptText} label="Billed" value={money(report?.billed)} color="bg-blue-50 text-blue-600" />
          <Stat icon={CreditCard} label="Collected" value={money(report?.collected)} color="bg-emerald-50 text-emerald-600" />
          <Stat icon={BadgeDollarSign} label="Outstanding Due" value={money(report?.due)} color="bg-red-50 text-red-600" />
          <Stat icon={Banknote} label="Expenses" value={money(report?.expenses)} color="bg-amber-50 text-amber-600" />
        </div>
        <div className="card"><h3 className="mb-3 font-black text-slate-800">Invoice Status</h3><p className="text-sm text-slate-500">Paid: {report?.paidCount || 0} · Partial: {report?.partialCount || 0} · Unpaid: {report?.unpaidCount || 0}</p></div>
        <div className="card">
          <h3 className="mb-3 font-black text-slate-800">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {!categories.length ? <button onClick={() => { setActive('Categories'); setModal({ type: 'category' }); }} className="btn-primary">Create your first fee category<ArrowRight className="h-4 w-4" /></button>
              : !structures.length ? <button onClick={() => { setActive('Fee Rules'); setModal({ type: 'structure' }); }} className="btn-primary">Set a class-wise fee rule<ArrowRight className="h-4 w-4" /></button>
              : <button onClick={() => { setActive('Invoices'); setModal({ type: 'generate' }); }} className="btn-secondary">Generate / backfill invoices</button>}
            <button onClick={() => setActive('Cash Book')} className="btn-secondary">View Cash Book</button>
          </div>
        </div>
      </div>}

      {active === 'Categories' && <>
        <TabIntro>Define the kinds of fees your school charges (Tuition, Transport, Exam Fee, etc.). Set an amount for each in the <strong className="mx-1">Fee Rules</strong> tab, per class.</TabIntro>
        <Toolbar newLabel="New Category" onNew={() => setModal({ type: 'category' })} />
        {categories.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Category</th><th>Default Amount</th><th>Late Fee</th><th>Description</th><th></th></tr></thead><tbody>{categories.map(c => <tr key={c.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{c.name}<p className="text-xs font-normal text-slate-400">{c.billingCycle}</p></td><td>{money(c.defaultAmount)}</td><td>{c.lateFeeAmount > 0 ? money(c.lateFeeAmount) : '—'}</td><td className="text-slate-500">{c.description || '—'}</td><td className="px-4 py-3"><RowActions onEdit={() => setModal({ type: 'category', initial: c })} onDelete={() => askDelete({ title: 'Delete Category', message: `Delete "${c.name}"? Fee rules using it will stop applying.`, run: () => deleteFeeCategory(c.id) })} /></td></tr>)}</tbody></table></div>
          : <Empty icon={Tags} title="No fee categories yet" action={<button onClick={() => setModal({ type: 'category' })} className="btn-primary mt-4"><Plus className="h-4 w-4" />New Category</button>}>Start by adding a category like "Tuition Fee" or "Transport Fee".</Empty>}
      </>}

      {active === 'Fee Rules' && <>
        <TabIntro>Set an amount once per <strong className="mx-1">Class + Fee Category</strong>. Every active student in that class is billed automatically when invoices are generated — no per-student setup needed. Pick "All Classes" for a fee that applies to everyone (e.g. admission/exam fee).</TabIntro>
        <Toolbar search={structuresSearch} onSearch={setStructuresSearch} searchPlaceholder="Search by class or category…" newLabel="New Rule" onNew={() => categories.length ? setModal({ type: 'structure' }) : setModal({ type: 'category' })} />
        {!categories.length ? <Empty icon={BookOpen} title="Create a fee category first" action={<button onClick={() => setModal({ type: 'category' })} className="btn-primary mt-4"><Plus className="h-4 w-4" />New Category</button>}>Fee rules apply a category's amount to a class — you need at least one category before you can set a rule.</Empty>
          : filteredStructures.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Class</th><th>Category</th><th>Amount / month</th><th>Status</th><th></th></tr></thead><tbody>{filteredStructures.map(s => <tr key={s.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{s.className ? `${s.className} ${s.section}` : 'All Classes'}</td><td>{s.categoryName}</td><td className="font-bold">{money(s.amount)}</td><td>{s.isActive ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Active</span> : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">Inactive</span>}</td><td className="px-4 py-3"><RowActions onEdit={() => setModal({ type: 'structure', initial: s })} onDelete={() => askDelete({ title: 'Delete Fee Rule', message: `Remove the ${s.categoryName} rule for ${s.className ? `${s.className} ${s.section}` : 'All Classes'}?`, run: () => deleteFeeStructure(s.id) })} /></td></tr>)}</tbody></table></div>
          : <Empty icon={BookOpen} title={structuresSearch ? 'No matching rules' : 'No class-wise fee rules yet'} action={!structuresSearch && <button onClick={() => setModal({ type: 'structure' })} className="btn-primary mt-4"><Plus className="h-4 w-4" />New Rule</button>}>{structuresSearch ? 'Try a different search.' : 'Set your first rule to start billing a class automatically.'}</Empty>}
      </>}

      {active === 'Student Overrides' && <>
        <TabIntro>Use this only for exceptions — a discount, waiver, scholarship, fine, or a custom amount for one specific student. Most students don't need an entry here once Fee Rules are set for their class.</TabIntro>
        <Toolbar search={overridesSearch} onSearch={setOverridesSearch} searchPlaceholder="Search by student or category…" newLabel="New Override" onNew={() => setModal({ type: 'assignment' })} />
        {filteredAssignments.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Student</th><th>Category</th><th>Gross</th><th>Adjustments</th><th>Net</th><th>Status</th><th></th></tr></thead><tbody>{filteredAssignments.map(a => <tr key={a.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{a.studentName}<p className="text-xs font-normal text-slate-400">{a.className} {a.section} · Roll {a.rollNumber || '—'}</p></td><td>{a.categoryName}</td><td>{money(a.amount)}</td><td>{money(a.discountAmount + a.waiverAmount + a.scholarshipAmount)} off · {money(a.fineAmount)} fine</td><td className="font-bold">{money(a.netAmount)}</td><td className="capitalize">{a.status}</td><td className="px-4 py-3"><RowActions onEdit={() => setModal({ type: 'assignment', initial: a })} onDelete={() => askDelete({ title: 'Delete Override', message: `Remove this ${a.categoryName} override for ${a.studentName}?`, run: () => deleteFeeAssignment(a.id) })} /></td></tr>)}</tbody></table></div>
          : <Empty icon={UserCog} title={overridesSearch ? 'No matching overrides' : 'No student-specific overrides yet'} action={!overridesSearch && <button onClick={() => setModal({ type: 'assignment' })} className="btn-primary mt-4"><Plus className="h-4 w-4" />New Override</button>}>{overridesSearch ? 'Try a different search.' : "That's normal — overrides are only for exceptions."}</Empty>}
      </>}

      {active === 'Invoices' && <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>Invoices for the current month generate automatically. Backfill a missed period or bill a one-off charge here.</span>
          <button onClick={() => setModal({ type: 'generate' })} className="btn-secondary shrink-0 bg-white">Generate Invoices</button>
        </div>
        <DefaultersPanel classes={classes} />
        <div className="card mb-4 grid gap-4 lg:grid-cols-3">
          <Field label="Search Student"><SearchBox value={invoiceFilters.search} onChange={v => setInvoiceFilters(f => ({ ...f, search: v }))} placeholder="Student name…" /></Field>
          <Field label="Class"><Select value={invoiceFilters.className} onChange={e => setInvoiceFilters(f => ({ ...f, className: e.target.value }))}><option value="">All Classes</option>{invoiceClassNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}</Select></Field>
          <Field label="Period"><Select value={invoiceFilters.period} onChange={e => setInvoiceFilters(f => ({ ...f, period: e.target.value }))}><option value="">All Periods</option>{invoicePeriods.map(p => <option key={p} value={p}>{p}</option>)}</Select></Field>
        </div>
        {filteredInvoices.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Student</th><th>Period</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{filteredInvoices.map(i => <tr key={i.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{i.studentName}<p className="text-xs font-normal text-slate-400">{i.title}</p></td><td>{i.period}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td><td className="font-bold text-red-600">{money(i.dueAmount)}</td><td><StatusBadge status={i.status} /></td><td className="px-4 py-3 text-right"><button onClick={() => setModal({ type: 'payment', invoiceId: i.id })} disabled={i.dueAmount <= 0} className="btn-secondary disabled:opacity-40">Collect</button></td></tr>)}</tbody></table></div>
          : <Empty icon={ReceiptText} title="No invoices for this filter">Try clearing a filter, or generate invoices for a period above.</Empty>}
      </>}

      {active === 'Monthly Record' && <MonthlyRecordTab students={students} />}

      {active === 'Cash Book' && <CashBookTab />}

      {active === 'Expenses' && <>
        <Toolbar search={expensesSearch} onSearch={setExpensesSearch} searchPlaceholder="Search by category or payee…" newLabel="New Expense" onNew={() => setModal({ type: 'expense' })} />
        {filteredExpenses.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Category</th><th>Payee</th><th>Amount</th><th>Method</th><th></th></tr></thead><tbody>{filteredExpenses.map(e => <tr key={e.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{e.category}<p className="text-xs font-normal text-slate-400">{e.expenseDate}</p></td><td>{e.payee || '—'}</td><td className="font-bold">{money(e.amount)}</td><td className="capitalize">{e.method}</td><td className="px-4 py-3"><RowActions onDelete={() => askDelete({ title: 'Delete Expense', message: `Delete this ${e.category} expense of ${money(e.amount)}?`, run: () => deleteExpense(e.id) })} /></td></tr>)}</tbody></table></div>
          : <Empty icon={Banknote} title={expensesSearch ? 'No matching expenses' : 'No expenses recorded yet'} action={!expensesSearch && <button onClick={() => setModal({ type: 'expense' })} className="btn-primary mt-4"><Plus className="h-4 w-4" />New Expense</button>}>{expensesSearch ? 'Try a different search.' : 'Track school outgoings like utilities, supplies, or maintenance.'}</Empty>}
      </>}
    </>}

    {modal?.type === 'category' && <Modal title={modal.initial ? 'Edit Category' : 'New Fee Category'} onClose={closeModal}><CategoryForm initial={modal.initial} onSaved={afterSave} onCancel={closeModal} /></Modal>}
    {modal?.type === 'structure' && <Modal title={modal.initial ? 'Edit Fee Rule' : 'New Fee Rule'} onClose={closeModal}><StructureForm initial={modal.initial} classes={classes} categories={categories} onSaved={afterSave} onCancel={closeModal} /></Modal>}
    {modal?.type === 'assignment' && <Modal title={modal.initial ? 'Edit Override' : 'New Student Override'} maxWidth="max-w-3xl" onClose={closeModal}><AssignmentForm initial={modal.initial} students={students} categories={categories} onSaved={afterSave} onCancel={closeModal} /></Modal>}
    {modal?.type === 'generate' && <Modal title="Generate Invoices" onClose={closeModal}><GenerateForm students={students} onGenerated={load} onCancel={closeModal} /></Modal>}
    {modal?.type === 'payment' && <Modal title="Collect Payment" onClose={closeModal}><PaymentForm invoiceId={modal.invoiceId} onPaid={afterSave} onCancel={closeModal} /></Modal>}
    {modal?.type === 'expense' && <Modal title="New Expense" onClose={closeModal}><ExpenseForm onSaved={afterSave} onCancel={closeModal} /></Modal>}

    {confirm && <Confirm title={confirm.title} message={confirm.message} onConfirm={runConfirm} onCancel={() => setConfirm(null)} busy={confirmBusy} />}
  </div>;
}
