import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';
import { getMyResults, getMyAttendance } from '../../../services/api/academicApi.js';
import { getMyWards, getWardResults, getWardAttendance } from '../../../services/api/guardianApi.js';
import { getMyFees, getWardFees } from '../../../services/api/feeApi.js';

const DOCUMENT_TYPES = {
  'report-card': 'Report Card',
  certificate: 'Certificate',
  'transfer-certificate': 'Transfer Certificate',
  'admit-card': 'Admit Card',
  'id-card': 'Student ID Card',
  'fee-receipt': 'Fee Receipt',
};

const money = (n) => `BDT ${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value = new Date()) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function schoolInfo(tenant) {
  return {
    name: tenant?.name || 'School Management System',
    logoUrl: tenant?.logoUrl || '',
    address: tenant?.address || 'School address',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
  };
}

function DocumentShell({ school, title, subtitle, children, compact = false }) {
  return (
    <article className={`mx-auto bg-white text-slate-900 shadow-soft print:shadow-none ${compact ? 'w-[420px]' : 'max-w-4xl'} border border-slate-200 print:border-0`}>
      <div className="border-b-4 border-[var(--brand)] p-8 print:p-6">
        <div className="flex items-center gap-5">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="h-16 w-16 rounded-xl object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[var(--brand)] text-xl font-black text-[var(--brand)]">SM</div>
          )}
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-black uppercase tracking-wide text-[var(--brand-strong)]">{school.name}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{school.address}</p>
            {(school.phone || school.email) && <p className="mt-0.5 text-xs text-slate-400">{[school.phone, school.email].filter(Boolean).join(' | ')}</p>}
          </div>
          <div className="h-16 w-16" />
        </div>
        <div className="mt-6 text-center">
          <p className="inline-flex rounded-full border-2 border-[var(--brand)] px-6 py-2 text-sm font-black uppercase tracking-widest text-[var(--brand)]">{title}</p>
          {subtitle && <p className="mt-2 text-sm font-semibold text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-8 print:p-6">{children}</div>
    </article>
  );
}

function Field({ label, value }) {
  return <p className="border-b border-slate-200 py-2 text-sm"><span className="font-black text-slate-500">{label}:</span> <span className="font-semibold text-slate-800">{value || '-'}</span></p>;
}

function SignatureRow({ labels = ['Class Teacher', 'Exam Controller', 'Principal'] }) {
  return (
    <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-500">
      {labels.map((label) => <div key={label} className="border-t border-slate-400 pt-2">{label}</div>)}
    </div>
  );
}

function StudentBlock({ subject }) {
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      <Field label="Student Name" value={subject.name} />
      <Field label="Student ID" value={subject.studentId} />
      <Field label="Class" value={`${subject.className || ''}${subject.section ? ` - ${subject.section}` : ''}`} />
      <Field label="Roll Number" value={subject.rollNumber} />
      <Field label="Guardian" value={subject.guardianName} />
      <Field label="Issue Date" value={dateText()} />
    </div>
  );
}

function ReportCard({ school, subject, results, attendance }) {
  const totals = results.reduce((acc, row) => {
    acc.obtained += Number(row.marksObtained || 0);
    acc.total += Number(row.totalMarks || 0);
    return acc;
  }, { obtained: 0, total: 0 });
  const percentage = totals.total ? ((totals.obtained / totals.total) * 100).toFixed(2) : '0.00';

  return (
    <DocumentShell school={school} title="Academic Report Card" subtitle="Official progress and performance summary">
      <StudentBlock subject={subject} />
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-300">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-3 py-2">Exam</th><th>Subject</th><th>Date</th><th>Marks</th><th>Grade</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {results.length ? results.map((r) => <tr key={r.id}><td className="px-3 py-2 font-semibold">{r.examName}</td><td>{r.subject}</td><td>{r.examDate}</td><td>{r.marksObtained ?? '-'} / {r.totalMarks}</td><td className="font-bold">{r.grade || '-'}</td></tr>) : <tr><td colSpan="5" className="px-3 py-8 text-center text-slate-400">No results recorded.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Field label="Total Marks" value={`${totals.obtained} / ${totals.total}`} />
        <Field label="Percentage" value={`${percentage}%`} />
        <Field label="Attendance" value={attendance ? `${attendance.presentCount}/${attendance.totalCount}` : '-'} />
        <Field label="Status" value={Number(percentage) >= 33 ? 'Promoted / Passed' : 'Needs Review'} />
      </div>
      <SignatureRow />
    </DocumentShell>
  );
}

function Certificate({ school, subject }) {
  return (
    <DocumentShell school={school} title="Certificate of Enrollment" subtitle="To whom it may concern">
      <div className="py-10 text-center">
        <p className="text-base leading-8 text-slate-700">
          This is to certify that <strong>{subject.name}</strong>, Student ID <strong>{subject.studentId || '-'}</strong>,
          is a student of <strong>{school.name}</strong> in Class <strong>{subject.className || '-'}</strong>
          {subject.section ? <> Section <strong>{subject.section}</strong></> : null}.
        </p>
        <p className="mt-6 text-base leading-8 text-slate-700">
          The student bears good moral character according to the records available with the institution.
        </p>
      </div>
      <SignatureRow labels={['Prepared By', 'Office Seal', 'Principal']} />
    </DocumentShell>
  );
}

function TransferCertificate({ school, subject }) {
  return (
    <DocumentShell school={school} title="Transfer Certificate" subtitle="Official school leaving document">
      <StudentBlock subject={subject} />
      <div className="mt-8 grid gap-x-8 sm:grid-cols-2">
        <Field label="Admission Date" value={subject.admissionDate} />
        <Field label="Date of Birth" value={subject.dateOfBirth} />
        <Field label="Last Class Attended" value={subject.className} />
        <Field label="Conduct" value="Good" />
        <Field label="Reason for Leaving" value="On guardian request" />
        <Field label="Dues Status" value="Subject to accounts clearance" />
      </div>
      <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
        Certified that the above information is correct according to the school register. This certificate is issued without alteration or erasure.
      </p>
      <SignatureRow labels={['Accounts', 'Office Assistant', 'Principal']} />
    </DocumentShell>
  );
}

function AdmitCard({ school, subject }) {
  return (
    <DocumentShell school={school} title="Admit Card" subtitle="Examination permission slip">
      <div className="grid gap-8 sm:grid-cols-[1fr_140px]">
        <StudentBlock subject={subject} />
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold uppercase tracking-widest text-slate-400">Photo</div>
      </div>
      <div className="mt-8 grid gap-x-8 sm:grid-cols-2">
        <Field label="Exam" value="Annual / Term Examination" />
        <Field label="Session" value={new Date().getFullYear()} />
        <Field label="Exam Center" value={school.name} />
        <Field label="Issue Date" value={dateText()} />
      </div>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        The student must bring this admit card, arrive on time, and follow all examination rules.
      </div>
      <SignatureRow labels={['Class Teacher', 'Exam Controller', 'Principal']} />
    </DocumentShell>
  );
}

function IdCard({ school, subject }) {
  return (
    <DocumentShell school={school} title="Student Identity Card" compact>
      <div className="text-center">
        <div className="mx-auto flex h-28 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold uppercase text-slate-400">Photo</div>
        <h2 className="mt-4 text-xl font-black text-[var(--brand-strong)]">{subject.name}</h2>
        <p className="text-sm font-bold text-[var(--brand)]">{subject.studentId || 'Student ID Pending'}</p>
      </div>
      <div className="mt-5 space-y-1">
        <Field label="Class" value={`${subject.className || '-'}${subject.section ? ` - ${subject.section}` : ''}`} />
        <Field label="Roll" value={subject.rollNumber} />
        <Field label="Guardian" value={subject.guardianName} />
        <Field label="Phone" value={subject.phone || subject.guardianPhone} />
      </div>
      <div className="mt-8 border-t border-slate-400 pt-2 text-center text-xs font-bold text-slate-500">Authorized Signature</div>
    </DocumentShell>
  );
}

function FeeReceipt({ school, subject, ledger, paymentId }) {
  const payment = ledger?.payments?.find((p) => p.id === paymentId) || ledger?.payments?.[0];
  const invoice = payment ? ledger?.invoices?.find((i) => i.id === payment.invoiceId) : null;
  return (
    <DocumentShell school={school} title="Fee Receipt" subtitle="Official payment acknowledgement">
      {!payment ? <p className="py-10 text-center text-sm text-slate-400">No payment receipt is available.</p> : <>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <Field label="Receipt No" value={payment.receiptNumber} />
          <Field label="Payment Date" value={payment.paymentDate} />
          <Field label="Student Name" value={subject.name || payment.studentName} />
          <Field label="Class" value={`${subject.className || invoice?.className || ''}${subject.section ? ` - ${subject.section}` : ''}`} />
          <Field label="Period" value={invoice?.period} />
          <Field label="Payment Method" value={payment.method} />
        </div>
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200"><td className="px-4 py-3 font-bold text-slate-500">Invoice Title</td><td className="px-4 py-3 text-right font-semibold">{invoice?.title || '-'}</td></tr>
              <tr className="border-b border-slate-200"><td className="px-4 py-3 font-bold text-slate-500">Invoice Total</td><td className="px-4 py-3 text-right font-semibold">{money(invoice?.totalAmount)}</td></tr>
              <tr className="border-b border-slate-200"><td className="px-4 py-3 font-bold text-slate-500">Amount Paid</td><td className="px-4 py-3 text-right text-lg font-black text-emerald-700">{money(payment.amount)}</td></tr>
              <tr><td className="px-4 py-3 font-bold text-slate-500">Remaining Due</td><td className="px-4 py-3 text-right font-semibold text-red-600">{money(invoice?.dueAmount)}</td></tr>
            </tbody>
          </table>
        </div>
        {payment.referenceNo && <p className="mt-4 text-sm text-slate-500"><strong>Reference:</strong> {payment.referenceNo}</p>}
      </>}
      <SignatureRow labels={['Collected By', 'Accounts Officer', 'Principal']} />
    </DocumentShell>
  );
}

function renderDocument(type, props) {
  if (type === 'certificate') return <Certificate {...props} />;
  if (type === 'transfer-certificate') return <TransferCertificate {...props} />;
  if (type === 'admit-card') return <AdmitCard {...props} />;
  if (type === 'id-card') return <IdCard {...props} />;
  if (type === 'fee-receipt') return <FeeReceipt {...props} paymentId={getQueryParam('payment')} />;
  return <ReportCard {...props} />;
}

export default function DocumentPage() {
  const { currentUser, currentTenant } = useAuth();
  const role = currentUser?.role;
  const type = DOCUMENT_TYPES[getQueryParam('type')] ? getQueryParam('type') : 'report-card';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState(null);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (role === 'student') {
          const [{ profile }, { results: resultRows }, fees] = await Promise.all([getMyProfile(), getMyResults(), getMyFees().catch(() => null)]);
          if (!profile) throw new Error('Profile not set up yet.');
          let summary = null;
          if (profile.classId) summary = (await getMyAttendance(profile.classId)).summary;
          if (cancelled) return;
          setSubject({ ...profile, name: currentUser.name });
          setResults(resultRows || []);
          setAttendance(summary || null);
          setLedger(fees);
        } else if (role === 'guardian') {
          const studentUserId = getQueryParam('student');
          if (!studentUserId) throw new Error('No student selected.');
          const { wards } = await getMyWards();
          const ward = (wards || []).find((w) => w.userId === studentUserId);
          if (!ward) throw new Error('Student not found.');
          const [{ results: resultRows }, { summary }, fees] = await Promise.all([
            getWardResults(studentUserId),
            getWardAttendance(studentUserId),
            getWardFees(studentUserId).catch(() => null),
          ]);
          if (cancelled) return;
          setSubject({ ...ward, name: ward.name });
          setResults(resultRows || []);
          setAttendance(summary || null);
          setLedger(fees);
        } else {
          throw new Error('Documents are only available for students and guardians.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const school = useMemo(() => schoolInfo(currentTenant), [currentTenant]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;
  if (error || !subject) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center text-slate-400"><p className="text-sm font-medium">{error || 'Document not available.'}</p><button onClick={() => navigate('/portal')} className="btn-ghost">Back to Portal</button></div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .print-hidden { display: none !important; } body { background: white !important; } }`}</style>
      <div className="print-hidden mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <button onClick={() => navigate('/portal/documents')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" /> Print</button>
          <button onClick={() => window.print()} className="btn-primary"><Download className="h-4 w-4" /> Download PDF</button>
        </div>
      </div>
      {renderDocument(type, { school, subject, results, attendance, ledger })}
    </div>
  );
}