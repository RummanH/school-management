import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Printer, Download, ArrowLeft, Award, BadgeCheck, Send, FileText, IdCard, CreditCard } from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { listStudents, getStudentDocumentData } from '../../../services/api/studentApi.js';
import { schoolInfo, renderDocument } from '../../portal/components/documentTemplates.jsx';

const DOCUMENT_TILES = [
  { type: 'report-card', title: 'Report Card', icon: Award },
  { type: 'certificate', title: 'Certificate', icon: BadgeCheck },
  { type: 'transfer-certificate', title: 'Transfer Certificate', icon: Send },
  { type: 'admit-card', title: 'Admit Card', icon: FileText },
  { type: 'id-card', title: 'Student ID Card', icon: IdCard },
  { type: 'fee-receipt', title: 'Fee Receipt', icon: CreditCard },
];

const CERTIFICATE_KINDS = [
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'character', label: 'Character' },
  { value: 'bonafide', label: 'Bonafide' },
];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export default function AdminDocumentsPage() {
  const { currentUser, currentTenant } = useAuth();
  const allowed = ['admin', 'teacher', 'accountant'].includes(currentUser?.role);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState(getQueryParam('student') || '');
  const [docType, setDocType] = useState(getQueryParam('type') || '');
  const [paymentId, setPaymentId] = useState(getQueryParam('payment') || '');
  const [certKind, setCertKind] = useState('enrollment');

  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!allowed) return;
    listStudents().then((d) => setStudents(d.students || [])).catch(() => setStudents([])).finally(() => setStudentsLoading(false));
  }, [allowed]);

  useEffect(() => {
    if (!studentId) { setData(null); return; }
    setDataLoading(true);
    setError('');
    getStudentDocumentData(studentId)
      .then((d) => setData(d))
      .catch((err) => setError(err.message || 'Failed to load student data.'))
      .finally(() => setDataLoading(false));
  }, [studentId]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      `${s.className} ${s.section}`.toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q));
  }, [students, search]);

  const school = useMemo(() => schoolInfo(currentTenant), [currentTenant]);
  const selectedStudent = students.find((s) => s.userId === studentId);
  const ready = studentId && docType && data;

  if (!allowed) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
        <p className="text-sm font-medium">Documents are available to admin, teacher, and accountant accounts.</p>
      </div>
    );
  }

  if (ready) {
    const subject = { ...data.student, name: data.student.name };
    const ledger = { invoices: data.invoices, payments: data.payments };
    return (
      <div className="print:bg-white">
        <style>{`@page { size: A4; margin: 12mm; } @media print { .print-hidden { display: none !important; } body { background: white !important; } }`}</style>
        <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setDocType('')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Back to picker
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {docType === 'certificate' && (
              <select className="input w-40" value={certKind} onChange={(e) => setCertKind(e.target.value)}>
                {CERTIFICATE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            )}
            {docType === 'fee-receipt' && (
              <select className="input w-56" value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
                <option value="">Latest payment</option>
                {(data.payments || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.receiptNumber} — {p.paymentDate}</option>
                ))}
              </select>
            )}
            <button onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" /> Print</button>
            <button onClick={() => window.print()} className="btn-primary"><Download className="h-4 w-4" /> Download PDF</button>
          </div>
        </div>
        {renderDocument(docType, { school, subject, results: data.results, attendance: data.attendance, ledger, paymentId: paymentId || undefined, kind: certKind })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800">Documents</h2>
        <p className="text-sm text-slate-500">Generate report cards, receipts, certificates, and ID cards for any student.</p>
      </div>

      <div className="card">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">1. Select Student</p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <input
            className="input w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, class, or student ID…"
          />
        </div>
        {studentsLoading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            {filteredStudents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No matching students.</p>
            ) : filteredStudents.map((s) => (
              <button
                key={s.userId}
                onClick={() => setStudentId(s.userId)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left text-sm transition last:border-0 hover:bg-slate-50 ${studentId === s.userId ? 'bg-emerald-50/60' : ''}`}
              >
                <span className="font-semibold text-slate-700">{s.name}</span>
                <span className="text-xs text-slate-400">{s.className}{s.section ? ` - ${s.section}` : ''} · Roll {s.rollNumber || '-'}</span>
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {studentId && (
        <div className="card">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
            2. Choose Document {selectedStudent && <span className="normal-case text-slate-500">for {selectedStudent.name}</span>}
          </p>
          {dataLoading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {DOCUMENT_TILES.map(({ type, title, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-lg"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[var(--brand)]"><Icon className="h-5 w-5" /></span>
                  <span className="font-bold text-slate-800">{title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
