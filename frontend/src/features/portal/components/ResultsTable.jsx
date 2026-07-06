export default function ResultsTable({ results }) {
  if (!results.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No exam results yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <th className="py-2 pr-3">Exam</th>
            <th className="py-2 pr-3">Subject</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Marks</th>
            <th className="py-2">Grade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {results.map((r) => (
            <tr key={r.id}>
              <td className="py-2 pr-3 font-semibold text-slate-700">{r.examName}</td>
              <td className="py-2 pr-3 text-slate-500">{r.subject}</td>
              <td className="py-2 pr-3 text-slate-500">{r.examDate}</td>
              <td className="py-2 pr-3 text-slate-500">{r.marksObtained ?? '—'} / {r.totalMarks}</td>
              <td className="py-2 font-bold text-slate-700">{r.grade || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
