export default function AttendanceStats({ summary }) {
  const stats = [
    { label: 'Present', value: summary.presentCount, color: 'text-emerald-600' },
    { label: 'Absent',  value: summary.absentCount,  color: 'text-red-500' },
    { label: 'Late',    value: summary.lateCount,    color: 'text-amber-500' },
    { label: 'Total',   value: summary.totalCount,   color: 'text-slate-700' },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-100 py-3 text-center">
          <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
