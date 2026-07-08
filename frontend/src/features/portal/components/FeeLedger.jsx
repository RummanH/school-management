import { useEffect, useState } from 'react';
import { Loader2, ReceiptText, FileText } from 'lucide-react';
import { navigate } from '../../../app/App.jsx';
import { getMyFees, getWardFees } from '../../../services/api/feeApi.js';

const money = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const cls = status === 'paid' ? 'bg-emerald-100 text-emerald-700' : status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${cls}`}>{status}</span>;
}

export default function FeeLedger({ studentUserId = null }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const req = studentUserId ? getWardFees(studentUserId) : getMyFees();
    req.then(setLedger).catch((err) => setError(err.message || 'Failed to load fees.')).finally(() => setLoading(false));
  }, [studentUserId]);

  if (loading) return <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>;
  if (error) return <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  if (!ledger) return null;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-bold text-blue-500">Total Billed</p><p className="mt-1 text-xl font-black text-blue-800">{money(ledger.summary?.billed)}</p></div>
      <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-500">Paid</p><p className="mt-1 text-xl font-black text-emerald-800">{money(ledger.summary?.paid)}</p></div>
      <div className="rounded-2xl bg-red-50 p-4"><p className="text-xs font-bold text-red-500">Due</p><p className="mt-1 text-xl font-black text-red-800">{money(ledger.summary?.due)}</p></div>
    </div>

    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><ReceiptText className="h-4 w-4" /> Invoices</h3>
      {ledger.invoices?.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-400"><th className="px-4 py-3">Period</th><th>Title</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{ledger.invoices.map(i => <tr key={i.id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{i.period}</td><td>{i.title}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td><td className="font-bold text-red-600">{money(i.dueAmount)}</td><td><StatusBadge status={i.status} /></td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No invoices yet.</p>}
    </div>

    <div>
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">Payment Receipts</h3></div>
      {ledger.payments?.length ? <div className="space-y-3">{ledger.payments.map(p => <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-800">{p.receiptNumber}</p><p className="text-xs text-slate-400">{p.paymentDate} · {p.method}</p></div><div className="flex items-center gap-3"><p className="text-lg font-black text-emerald-700">{money(p.amount)}</p><button onClick={() => navigate(`/portal/document?type=fee-receipt${studentUserId ? `&student=${studentUserId}` : ''}&payment=${p.id}`)} className="btn-secondary"><FileText className="h-4 w-4" />Receipt</button></div></div>{p.referenceNo && <p className="mt-2 text-xs text-slate-500">Reference: {p.referenceNo}</p>}</div>)}</div> : <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No payments recorded yet.</p>}
    </div>
  </div>;
}
