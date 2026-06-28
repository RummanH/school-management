import { useState, useEffect } from 'react';
import { Loader2, Save, Award } from 'lucide-react';
import { listClasses, getExams, getResults, saveResults } from '../../../services/api/academicApi.js';

const GRADE_COLORS = {
  'A+': 'bg-green-100 text-green-700',
  'A':  'bg-emerald-100 text-emerald-700',
  'A-': 'bg-teal-100 text-teal-700',
  'B':  'bg-blue-100 text-blue-700',
  'C':  'bg-amber-100 text-amber-700',
  'D':  'bg-orange-100 text-orange-700',
  'F':  'bg-red-100 text-red-700',
};

export default function ResultsTab() {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [exams, setExams]       = useState([]);
  const [examId, setExamId]     = useState('');
  const [results, setResults]   = useState([]);
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    listClasses().then(c => {
      const cls = c.classes || [];
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) { setExams([]); setExamId(''); return; }
    getExams(classId).then(e => {
      const list = e.exams || [];
      setExams(list);
      setExamId(list[0]?.id || '');
    });
  }, [classId]);

  useEffect(() => {
    if (!examId) { setRows([]); return; }
    setLoading(true);
    getResults(examId)
      .then(r => {
        const list = r.results || [];
        setResults(list);
        setRows(list.map(s => ({ ...s, inputVal: s.marksObtained !== null ? String(s.marksObtained) : '' })));
      })
      .finally(() => setLoading(false));
  }, [examId]);

  function updateRow(studentUserId, field, value) {
    setRows(rs => rs.map(r => r.studentUserId === studentUserId ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries = rows.map(r => ({
        studentUserId: r.studentUserId,
        marksObtained: r.inputVal !== '' ? Number(r.inputVal) : null,
        remarks: r.remarks || '',
      }));
      await saveResults(examId, entries);
      // Reload
      const r = await getResults(examId);
      const list = r.results || [];
      setRows(list.map(s => ({ ...s, inputVal: s.marksObtained !== null ? String(s.marksObtained) : '' })));
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const currentExam = exams.find(e => e.id === examId);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-[200px]" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">— Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>)}
        </select>
        <select className="input max-w-xs" value={examId} onChange={e => setExamId(e.target.value)} disabled={!exams.length}>
          <option value="">— Select Exam —</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.examName} — {e.subject}</option>)}
        </select>
        {rows.length > 0 && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 ml-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Results
          </button>
        )}
      </div>

      {!examId ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Award className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Select a class and exam to enter results</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Award className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No students enrolled in this class</p>
          <p className="mt-1 text-xs">Enroll students by editing their profile and assigning a class</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {currentExam && (
            <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-4 text-xs text-indigo-600">
              <span className="font-bold">{currentExam.examName} — {currentExam.subject}</span>
              <span>{currentExam.examDate}</span>
              <span>Total: {currentExam.totalMarks} marks</span>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-400">
                <th className="px-4 py-3 text-left">Roll</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-center w-36">Marks Obtained</th>
                <th className="px-4 py-3 text-center w-20">Grade</th>
                <th className="px-4 py-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(row => (
                <tr key={row.studentUserId}>
                  <td className="px-4 py-2 text-slate-500 text-xs font-mono">{row.rollNumber || '—'}</td>
                  <td className="px-4 py-2 font-semibold text-slate-700">{row.studentName}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number" min="0" max={currentExam?.totalMarks}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-[var(--brand)] focus:outline-none"
                      value={row.inputVal}
                      onChange={e => updateRow(row.studentUserId, 'inputVal', e.target.value)}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {row.grade ? (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${GRADE_COLORS[row.grade] || 'bg-slate-100 text-slate-600'}`}>
                        {row.grade}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-[var(--brand)] focus:outline-none"
                      value={row.remarks || ''}
                      onChange={e => updateRow(row.studentUserId, 'remarks', e.target.value)}
                      placeholder="Optional"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
