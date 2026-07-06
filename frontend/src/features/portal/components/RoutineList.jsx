import { Calendar } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COLORS = {
  Sunday: 'bg-red-50 text-red-700', Monday: 'bg-blue-50 text-blue-700',
  Tuesday: 'bg-indigo-50 text-indigo-700', Wednesday: 'bg-green-50 text-green-700',
  Thursday: 'bg-amber-50 text-amber-700', Friday: 'bg-emerald-50 text-emerald-700',
  Saturday: 'bg-purple-50 text-purple-700',
};

export default function RoutineList({ routine }) {
  if (!routine.length) {
    return (
      <div className="py-10 text-center text-slate-400">
        <Calendar className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm font-medium">No routine published yet.</p>
      </div>
    );
  }

  const byDay = DAYS.reduce((acc, d) => { acc[d] = routine.filter((r) => r.dayOfWeek === d); return acc; }, {});

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const entries = byDay[day] || [];
        if (!entries.length) return null;
        return (
          <div key={day} className="overflow-hidden rounded-xl border border-slate-100">
            <div className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${DAY_COLORS[day]}`}>{day}</div>
            <div className="divide-y divide-slate-50">
              {entries
                .sort((a, b) => a.periodNumber - b.periodNumber)
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">
                      {e.periodNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{e.subject}</p>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-400">
                        {e.teacherName && <span>{e.teacherName}</span>}
                        {(e.startTime || e.endTime) && <span>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</span>}
                        {e.room && <span>Room {e.room}</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
