import { useEffect, useState } from 'react';
import { BadgeDollarSign, Plus, Save, Trash2, Loader2, ReceiptText, CreditCard, WalletCards, FileText } from 'lucide-react';
import { listStudents } from '../../../services/api/studentApi.js';
import {
  listFeeCategories, createFeeCategory, updateFeeCategory, deleteFeeCategory,
  listFeeAssignments, createFeeAssignment, updateFeeAssignment, deleteFeeAssignment,
  listFeeInvoices, getFeeInvoice, generateFeeInvoices, recordFeePayment,
  listExpenses, createExpense, deleteExpense, getFeeReport,
} from '../../../services/api/feeApi.js';

const TABS = ['Summary', 'Categories', 'Assignments', 'Invoices', 'Expenses'];
const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const money = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{children}</label>;
}
function Input(props) { return <input {...props} className={`input ${props.className || ''}`} />; }
function Select(props) { return <select {...props} className={`input ${props.className || ''}`} />; }
function Textarea(props) { return <textarea {...props} className={`input min-h-[76px] ${props.className || ''}`} />; }
function Empty({ children }) { return <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">{children}</div>; }
function StatusBadge({ status }) {
  const cls = status === 'paid' ? 'bg-emerald-100 text-emerald-700' : status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${cls}`}>{status}</span>;
}

function Stat({ icon: Icon, label, value, color }) {
  return <div className="card flex items-center gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div></div>;
}

function CategoryForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', description: '', defaultAmount: 0, billingCycle: 'monthly', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try { await (initial ? updateFeeCategory(initial.id, form) : createFeeCategory(form)); onSaved(); }
    catch (err) { setError(err.message || 'Save failed.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="card mb-5 grid gap-4 lg:grid-cols-5">
    {error && <div className="lg:col-span-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <Field label="Category"><Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tuition Fee" /></Field>
    <Field label="Default Amount"><Input type="number" min="0" step="0.01" value={form.defaultAmount} onChange={e => set('defaultAmount', e.target.value)} /></Field>
    <Field label="Billing Cycle"><Select value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)}><option value="monthly">Monthly</option><option value="term">Term</option><option value="annual">Annual</option><option value="one_time">One-time</option></Select></Field>
    <Field label="Description"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" /></Field>
    <div className="flex items-end gap-2"><button disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>{initial && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}</div>
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
    catch (err) { setError(err.message || 'Save failed.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="card mb-5 space-y-4">
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 lg:grid-cols-4">
      <Field label="Student"><Select required value={form.studentUserId} onChange={e => set('studentUserId', e.target.value)}><option value="">Select student</option>{students.map(s => <option key={s.userId} value={s.userId}>{s.name} ({s.className || 'No class'} {s.rollNumber || ''})</option>)}</Select></Field>
      <Field label="Category"><Select required value={form.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Amount"><Input required type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
      <Field label="Status"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
    </div>
    <div className="grid gap-4 lg:grid-cols-5">
      <Field label="Discount"><Input type="number" min="0" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} /></Field>
      <Field label="Waiver"><Input type="number" min="0" step="0.01" value={form.waiverAmount} onChange={e => set('waiverAmount', e.target.value)} /></Field>
      <Field label="Scholarship"><Input type="number" min="0" step="0.01" value={form.scholarshipAmount} onChange={e => set('scholarshipAmount', e.target.value)} /></Field>
      <Field label="Fine"><Input type="number" min="0" step="0.01" value={form.fineAmount} onChange={e => set('fineAmount', e.target.value)} /></Field>
      <Field label="Start Period"><Input value={form.startPeriod} onChange={e => set('startPeriod', e.target.value)} placeholder="2026-07" /></Field>
    </div>
    <div className="grid gap-4 lg:grid-cols-3"><Field label="End Period"><Input value={form.endPeriod} onChange={e => set('endPeriod', e.target.value)} placeholder="Optional" /></Field><Field label="Notes"><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></Field><div className="flex items-end gap-2"><button disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>{initial && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}</div></div>
  </form>;
}

function GenerateForm({ students, onGenerated }) {
  const [form, setForm] = useState({ period: month(), title: '', dueDate: today(), studentUserIds: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault(); setSaving(true); setMessage('');
    try { const r = await generateFeeInvoices(form); setMessage(`${r.created.length} invoice(s) generated, ${r.skipped.length} skipped.`); onGenerated(); }
    catch (err) { setMessage(err.message || 'Generation failed.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="card mb-5 grid gap-4 lg:grid-cols-5">
    <Field label="Period"><Input required value={form.period} onChange={e => set('period', e.target.value)} placeholder="2026-07" /></Field>
    <Field label="Title"><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="July 2026 Fees" /></Field>
    <Field label="Due Date"><Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
    <Field label="Students"><Select multiple value={form.studentUserIds} onChange={e => set('studentUserIds', Array.from(e.target.selectedOptions).map(o => o.value))} className="min-h-[42px]"><option value="" disabled>All students unless selected</option>{students.map(s => <option key={s.userId} value={s.userId}>{s.name}</option>)}</Select></Field>
    <div className="flex items-end gap-3"><button disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Generate</button>{message && <p className="text-xs text-slate-500">{message}</p>}</div>
  </form>;
}

function PaymentPanel({ invoiceId, onPaid }) {
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'cash', paymentDate: today(), referenceNo: '', notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (invoiceId) getFeeInvoice(invoiceId).then(d => { setInvoice(d.invoice); setForm(f => ({ ...f, amount: d.invoice.dueAmount })); }); }, [invoiceId]);
  if (!invoiceId) return null;
  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await recordFeePayment(invoiceId, form); onPaid(); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="card mb-5 border-emerald-100 bg-emerald-50/40">
    <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-800">Collect Payment</h3><p className="text-sm text-slate-500">Due: {money(invoice?.dueAmount)}</p></div>
    <div className="grid gap-4 lg:grid-cols-5"><Field label="Amount"><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field><Field label="Method"><Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="card">Card</option><option value="other">Other</option></Select></Field><Field label="Date"><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></Field><Field label="Reference"><Input value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} /></Field><div className="flex items-end"><button disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Collect</button></div></div>
  </form>;
}

export default function FeesPage() {
  const [active, setActive] = useState('Summary');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [report, setReport] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editAssignment, setEditAssignment] = useState(null);
  const [payInvoiceId, setPayInvoiceId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', expenseDate: today(), payee: '', method: 'cash', referenceNo: '', notes: '' });

  async function load() {
    setLoading(true);
    const [s, c, a, i, e, r] = await Promise.all([listStudents(), listFeeCategories(), listFeeAssignments(), listFeeInvoices(), listExpenses(), getFeeReport()]);
    setStudents(s.students || []); setCategories(c.categories || []); setAssignments(a.assignments || []); setInvoices(i.invoices || []); setExpenses(e.expenses || []); setReport(r.report || null); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function addExpense(e) { e.preventDefault(); await createExpense(expenseForm); setExpenseForm({ category: '', amount: '', expenseDate: today(), payee: '', method: 'cash', referenceNo: '', notes: '' }); load(); }

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-800">Fees & Accounting</h2><p className="mt-0.5 text-sm text-slate-500">Setup fees, generate invoices, collect payments, track dues and expenses.</p></div></div>
    <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">{TABS.map(t => <button key={t} onClick={() => setActive(t)} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${active === t ? 'bg-white text-[var(--brand)] shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>)}</div>
    {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div> : <>
      {active === 'Summary' && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={ReceiptText} label="Billed" value={money(report?.billed)} color="bg-blue-50 text-blue-600" /><Stat icon={CreditCard} label="Collected" value={money(report?.collected)} color="bg-emerald-50 text-emerald-600" /><Stat icon={BadgeDollarSign} label="Outstanding Due" value={money(report?.due)} color="bg-red-50 text-red-600" /><Stat icon={WalletCards} label="Expenses" value={money(report?.expenses)} color="bg-amber-50 text-amber-600" /></div><div className="card"><h3 className="mb-3 font-black text-slate-800">Invoice Status</h3><p className="text-sm text-slate-500">Paid: {report?.paidCount || 0} · Partial: {report?.partialCount || 0} · Unpaid: {report?.unpaidCount || 0}</p></div></div>}
      {active === 'Categories' && <><CategoryForm initial={editCategory} onCancel={() => setEditCategory(null)} onSaved={() => { setEditCategory(null); load(); }} />{categories.length ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><tbody>{categories.map(c => <tr key={c.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{c.name}<p className="text-xs font-normal text-slate-400">{c.billingCycle}</p></td><td className="px-4 py-3">{money(c.defaultAmount)}</td><td className="px-4 py-3 text-slate-500">{c.description || '—'}</td><td className="px-4 py-3 text-right"><button onClick={() => setEditCategory(c)} className="btn-secondary mr-2">Edit</button><button onClick={() => deleteFeeCategory(c.id).then(load)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <Empty>No fee categories yet.</Empty>}</>}
      {active === 'Assignments' && <><AssignmentForm initial={editAssignment} students={students} categories={categories} onCancel={() => setEditAssignment(null)} onSaved={() => { setEditAssignment(null); load(); }} />{assignments.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Student</th><th>Category</th><th>Gross</th><th>Adjustments</th><th>Net</th><th>Status</th><th></th></tr></thead><tbody>{assignments.map(a => <tr key={a.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{a.studentName}<p className="text-xs font-normal text-slate-400">{a.className} {a.section} · Roll {a.rollNumber || '—'}</p></td><td>{a.categoryName}</td><td>{money(a.amount)}</td><td>{money(a.discountAmount + a.waiverAmount + a.scholarshipAmount)} off · {money(a.fineAmount)} fine</td><td className="font-bold">{money(a.netAmount)}</td><td className="capitalize">{a.status}</td><td className="px-4 py-3 text-right"><button onClick={() => setEditAssignment(a)} className="btn-secondary mr-2">Edit</button><button onClick={() => deleteFeeAssignment(a.id).then(load)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <Empty>No student fee assignments yet.</Empty>}</>}
      {active === 'Invoices' && <><GenerateForm students={students} onGenerated={load} /><PaymentPanel invoiceId={payInvoiceId} onPaid={() => { setPayInvoiceId(null); load(); }} />{invoices.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Student</th><th>Period</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{invoices.map(i => <tr key={i.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{i.studentName}<p className="text-xs font-normal text-slate-400">{i.title}</p></td><td>{i.period}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td><td className="font-bold text-red-600">{money(i.dueAmount)}</td><td><StatusBadge status={i.status} /></td><td className="px-4 py-3 text-right"><button onClick={() => setPayInvoiceId(i.id)} disabled={i.dueAmount <= 0} className="btn-secondary disabled:opacity-40">Collect</button></td></tr>)}</tbody></table></div> : <Empty>No invoices generated yet.</Empty>}</>}
      {active === 'Expenses' && <><form onSubmit={addExpense} className="card mb-5 grid gap-4 lg:grid-cols-6"><Field label="Category"><Input required value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} placeholder="Utilities" /></Field><Field label="Amount"><Input required type="number" min="0" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></Field><Field label="Date"><Input type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm(f => ({ ...f, expenseDate: e.target.value }))} /></Field><Field label="Payee"><Input value={expenseForm.payee} onChange={e => setExpenseForm(f => ({ ...f, payee: e.target.value }))} /></Field><Field label="Method"><Select value={expenseForm.method} onChange={e => setExpenseForm(f => ({ ...f, method: e.target.value }))}><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="other">Other</option></Select></Field><div className="flex items-end"><button className="btn-primary"><Plus className="h-4 w-4" />Add</button></div></form>{expenses.length ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><tbody>{expenses.map(e => <tr key={e.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{e.category}<p className="text-xs font-normal text-slate-400">{e.expenseDate}</p></td><td>{e.payee || '—'}</td><td className="font-bold">{money(e.amount)}</td><td className="capitalize">{e.method}</td><td className="px-4 py-3 text-right"><button onClick={() => deleteExpense(e.id).then(load)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <Empty>No expenses recorded yet.</Empty>}</>}
    </>}
  </div>;
}
