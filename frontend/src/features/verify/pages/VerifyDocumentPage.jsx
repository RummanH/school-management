import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { verifyDocument } from '../../../services/api/documentApi.js';

const TYPE_LABELS = {
  'report-card': 'Report Card',
  certificate: 'Certificate',
  'transfer-certificate': 'Transfer Certificate',
  'admit-card': 'Admit Card',
  'id-card': 'Student ID Card',
  'fee-receipt': 'Fee Receipt',
};

function dateText(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VerifyDocumentPage({ code }) {
  const [state, setState] = useState({ loading: true, result: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    if (!code) { setState({ loading: false, result: null, error: 'No verification code provided.' }); return; }
    verifyDocument(code)
      .then((result) => { if (!cancelled) setState({ loading: false, result, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ loading: false, result: null, error: err.message || 'Could not verify this document.' }); });
    return () => { cancelled = true; };
  }, [code]);

  const { loading, result, error } = state;
  const valid = result?.valid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-soft">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
            <p className="text-sm font-medium text-slate-400">Checking document…</p>
          </div>
        ) : valid ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-800">Document Verified</h1>
            <p className="mt-1 text-sm text-slate-500">This document was genuinely issued by {result.schoolName}.</p>

            <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left text-sm">
              <Row icon={<BadgeCheck className="h-4 w-4 text-[var(--brand)]" />} label="Document Type" value={TYPE_LABELS[result.documentType] || result.documentType} />
              <Row label="Student" value={result.studentName} />
              <Row label="Class" value={`${result.className || '-'}${result.section ? ` - ${result.section}` : ''}`} />
              <Row label="School" value={result.schoolName} />
              <Row label="Issued" value={dateText(result.issuedAt)} />
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <ShieldAlert className="h-9 w-9 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-800">Not a Valid Document</h1>
            <p className="mt-1 text-sm text-slate-500">
              {error || 'This verification code does not match any issued document. It may have been mistyped, or the document may not be genuine.'}
            </p>
          </>
        )}
        <p className="mt-8 text-xs font-medium text-slate-300">Powered by School Management System</p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-1.5 font-bold text-slate-500">{icon}{label}</span>
      <span className="font-semibold text-slate-800">{value || '-'}</span>
    </div>
  );
}
