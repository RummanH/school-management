import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';
import { getMyResults, getMyAttendance } from '../../../services/api/academicApi.js';
import { getMyWards, getWardResults, getWardAttendance } from '../../../services/api/guardianApi.js';
import { getMyFees, getWardFees } from '../../../services/api/feeApi.js';
import { myDocumentDownloadUrl, wardDocumentDownloadUrl } from '../../../services/api/documentApi.js';
import { DOCUMENT_TYPES, schoolInfo, renderDocument } from '../components/documentTemplates.jsx';

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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

  const downloadParams = { kind: getQueryParam('kind') || undefined, payment: getQueryParam('payment') || undefined };
  const downloadUrl = role === 'guardian'
    ? wardDocumentDownloadUrl(getQueryParam('student'), type, downloadParams)
    : myDocumentDownloadUrl(type, downloadParams);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .print-hidden { display: none !important; } body { background: white !important; } }`}</style>
      <div className="print-hidden mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <button onClick={() => navigate('/portal/documents')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" /> Print Preview</button>
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn-primary"><Download className="h-4 w-4" /> Download PDF</a>
        </div>
      </div>
      {renderDocument(type, { school, subject, results, attendance, ledger, paymentId: getQueryParam('payment'), kind: getQueryParam('kind') || undefined })}
    </div>
  );
}