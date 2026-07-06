import { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';
import { getMyProfile } from '../../../services/api/authApi.js';
import { getMyResults, getMyAttendance } from '../../../services/api/academicApi.js';
import { getMyWards, getWardResults, getWardAttendance } from '../../../services/api/guardianApi.js';
import ResultsTable from '../components/ResultsTable.jsx';
import AttendanceStats from '../components/AttendanceStats.jsx';

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* Pragmatic "certificate download": a print-to-PDF view (Ctrl+P / the Print
   button below use the browser's native print dialog, which offers "Save as
   PDF" on every major browser/OS) rather than a formal certificate template
   generated server-side. No new PDF-generation dependency needed for this. */
export default function ProgressReportPage() {
  const { currentUser, currentTenant } = useAuth();
  const role = currentUser?.role;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState(null); // { name, className, section, rollNumber }
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (role === 'student') {
          const [{ profile }, { results: r }] = await Promise.all([getMyProfile(), getMyResults()]);
          if (!profile) { if (!cancelled) setError('Profile not set up yet.'); return; }
          if (cancelled) return;
          setSubject({
            name: currentUser.name,
            className: profile.className,
            section: profile.section,
            rollNumber: profile.rollNumber,
          });
          setResults(r || []);
          if (profile.classId) {
            const { summary } = await getMyAttendance(profile.classId);
            if (!cancelled) setAttendance(summary || null);
          }
        } else if (role === 'guardian') {
          const studentUserId = getQueryParam('student');
          if (!studentUserId) { if (!cancelled) setError('No student selected.'); return; }
          const { wards } = await getMyWards();
          const ward = (wards || []).find((w) => w.userId === studentUserId);
          if (!ward) { if (!cancelled) setError('Student not found.'); return; }
          const [{ results: r }, { summary }] = await Promise.all([
            getWardResults(studentUserId),
            getWardAttendance(studentUserId),
          ]);
          if (cancelled) return;
          setSubject({ name: ward.name, className: ward.className, section: ward.section, rollNumber: ward.rollNumber });
          setResults(r || []);
          setAttendance(summary || null);
        } else {
          if (!cancelled) setError('Progress reports are only available for students and guardians.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center text-slate-400">
        <p className="text-sm font-medium">{error || 'Report not available.'}</p>
        <button onClick={() => navigate('/portal')} className="btn-ghost">Back to Portal</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/portal')}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="mb-6 border-b border-slate-100 pb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {currentTenant?.name || 'School Management System'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-800">Progress Report</h1>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <p><span className="font-bold text-slate-400">Name:</span> <span className="ml-1 font-semibold text-slate-700">{subject.name}</span></p>
            <p><span className="font-bold text-slate-400">Class:</span> <span className="ml-1 font-semibold text-slate-700">{subject.className}{subject.section ? ` - ${subject.section}` : ''}</span></p>
            <p><span className="font-bold text-slate-400">Roll:</span> <span className="ml-1 font-semibold text-slate-700">{subject.rollNumber || '—'}</span></p>
            <p><span className="font-bold text-slate-400">Date:</span> <span className="ml-1 font-semibold text-slate-700">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span></p>
          </div>

          {attendance && (
            <div className="mb-6">
              <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Attendance</h2>
              <AttendanceStats summary={attendance} />
            </div>
          )}

          <div>
            <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Exam Results</h2>
            <ResultsTable results={results} />
          </div>
        </div>
      </div>
    </div>
  );
}
