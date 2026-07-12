export const DOCUMENT_TYPES = {
  'report-card': 'Report Card',
  certificate: 'Certificate',
  'transfer-certificate': 'Transfer Certificate',
  'admit-card': 'Admit Card',
  'id-card': 'Student ID Card',
  'fee-receipt': 'Fee Receipt',
};

const money = (n) => `BDT ${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value = new Date()) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function schoolInfo(tenant) {
  return {
    name: tenant?.name || 'School Management System',
    logoUrl: tenant?.logoUrl || '',
    address: tenant?.address || 'School address',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
  };
}

export function DocumentShell({ school, title, subtitle, children, compact = false }) {
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

export function Field({ label, value }) {
  return <p className="border-b border-slate-200 py-2 text-sm"><span className="font-black text-slate-500">{label}:</span> <span className="font-semibold text-slate-800">{value || '-'}</span></p>;
}

export function SignatureRow({ labels = ['Class Teacher', 'Exam Controller', 'Principal'] }) {
  return (
    <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-500">
      {labels.map((label) => <div key={label} className="border-t border-slate-400 pt-2">{label}</div>)}
    </div>
  );
}

function PhotoBox({ subject, className }) {
  if (subject.photoUrl) {
    return <img src={subject.photoUrl} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center border-2 border-dashed border-slate-300 text-xs font-bold uppercase tracking-widest text-slate-400`}>
      Photo
    </div>
  );
}

export function StudentBlock({ subject }) {
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

const GRADE_COLORS = {
  'A+': 'text-emerald-600', A: 'text-emerald-600', 'A-': 'text-emerald-600',
  B: 'text-amber-600', C: 'text-amber-600',
  D: 'text-red-600', F: 'text-red-600',
};
function gradeColor(grade) {
  return GRADE_COLORS[grade] || 'text-slate-700';
}

export function ReportCard({ school, subject, results, attendance }) {
  const totals = results.reduce((acc, row) => {
    acc.obtained += Number(row.marksObtained || 0);
    acc.total += Number(row.totalMarks || 0);
    return acc;
  }, { obtained: 0, total: 0 });
  const percentage = totals.total ? ((totals.obtained / totals.total) * 100).toFixed(2) : '0.00';
  const passed = Number(percentage) >= 33;

  return (
    <DocumentShell school={school} title="Academic Report Card" subtitle="Official progress and performance summary">
      <StudentBlock subject={subject} />
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-300">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-3 py-2">Exam</th><th>Subject</th><th>Date</th><th>Marks</th><th>Grade</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {results.length ? results.map((r) => <tr key={r.id}><td className="px-3 py-2 font-semibold">{r.examName}</td><td>{r.subject}</td><td>{r.examDate}</td><td>{r.marksObtained ?? '-'} / {r.totalMarks}</td><td className={`font-black ${gradeColor(r.grade)}`}>{r.grade || '-'}</td></tr>) : <tr><td colSpan="5" className="px-3 py-8 text-center text-slate-400">No results recorded.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Field label="Total Marks" value={`${totals.obtained} / ${totals.total}`} />
        <Field label="Percentage" value={`${percentage}%`} />
        <Field label="Attendance" value={attendance ? `${attendance.presentCount}/${attendance.totalCount}` : '-'} />
        <p className="border-b border-slate-200 py-2 text-sm">
          <span className="font-black text-slate-500">Status:</span>{' '}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {passed ? 'Promoted / Passed' : 'Needs Review'}
          </span>
        </p>
      </div>
      <SignatureRow />
    </DocumentShell>
  );
}

const CERTIFICATE_BODIES = {
  enrollment: (school, subject) => (
    <>
      <p className="text-base leading-8 text-slate-700">
        This is to certify that <strong>{subject.name}</strong>, Student ID <strong>{subject.studentId || '-'}</strong>,
        is a student of <strong>{school.name}</strong> in Class <strong>{subject.className || '-'}</strong>
        {subject.section ? <> Section <strong>{subject.section}</strong></> : null}.
      </p>
      <p className="mt-6 text-base leading-8 text-slate-700">
        The student bears good moral character according to the records available with the institution.
      </p>
    </>
  ),
  achievement: (school, subject) => (
    <p className="text-base leading-8 text-slate-700">
      This certificate is proudly presented to <strong>{subject.name}</strong> of Class <strong>{subject.className || '-'}</strong>
      {subject.section ? <> Section <strong>{subject.section}</strong></> : null} in recognition of outstanding achievement
      and dedication at <strong>{school.name}</strong>.
    </p>
  ),
  character: (school, subject) => (
    <p className="text-base leading-8 text-slate-700">
      This is to certify that <strong>{subject.name}</strong>, Student ID <strong>{subject.studentId || '-'}</strong>,
      has been a student of <strong>{school.name}</strong> and has, to the best of the institution's knowledge,
      maintained good conduct and character throughout the period of study.
    </p>
  ),
  bonafide: (school, subject) => (
    <p className="text-base leading-8 text-slate-700">
      This is to certify that <strong>{subject.name}</strong>, Student ID <strong>{subject.studentId || '-'}</strong>,
      is a bonafide student of <strong>{school.name}</strong>, currently studying in Class <strong>{subject.className || '-'}</strong>
      {subject.section ? <> Section <strong>{subject.section}</strong></> : null}, for the current academic session.
    </p>
  ),
};
const CERTIFICATE_TITLES = {
  enrollment: 'Certificate of Enrollment',
  achievement: 'Certificate of Achievement',
  character: 'Character Certificate',
  bonafide: 'Bonafide Certificate',
};

export function Certificate({ school, subject, kind = 'enrollment' }) {
  const body = CERTIFICATE_BODIES[kind] || CERTIFICATE_BODIES.enrollment;
  const title = CERTIFICATE_TITLES[kind] || CERTIFICATE_TITLES.enrollment;
  return (
    <DocumentShell school={school} title={title} subtitle="To whom it may concern">
      <div className="py-10 text-center">{body(school, subject)}</div>
      <SignatureRow labels={['Prepared By', 'Office Seal', 'Principal']} />
    </DocumentShell>
  );
}

export function TransferCertificate({ school, subject }) {
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

export function AdmitCard({ school, subject }) {
  return (
    <DocumentShell school={school} title="Admit Card" subtitle="Examination permission slip">
      <div className="grid gap-8 sm:grid-cols-[1fr_140px]">
        <StudentBlock subject={subject} />
        <PhotoBox subject={subject} className="h-40 rounded-xl" />
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

export function IdCard({ school, subject }) {
  return (
    <DocumentShell school={school} title="Student Identity Card" compact>
      <div className="text-center">
        <PhotoBox subject={subject} className="mx-auto h-28 w-24 rounded-xl" />
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

export function FeeReceipt({ school, subject, ledger, paymentId }) {
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

export function renderDocument(type, props) {
  if (type === 'certificate') return <Certificate {...props} />;
  if (type === 'transfer-certificate') return <TransferCertificate {...props} />;
  if (type === 'admit-card') return <AdmitCard {...props} />;
  if (type === 'id-card') return <IdCard {...props} />;
  if (type === 'fee-receipt') return <FeeReceipt {...props} />;
  return <ReportCard {...props} />;
}
