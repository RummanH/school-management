import { useState } from 'react';
import { GraduationCap, Calendar, BookOpen, FileText, Award, Users } from 'lucide-react';
import ClassesTab    from '../components/ClassesTab.jsx';
import RoutineTab    from '../components/RoutineTab.jsx';
import SyllabusTab   from '../components/SyllabusTab.jsx';
import ExamsTab      from '../components/ExamsTab.jsx';
import ResultsTab    from '../components/ResultsTab.jsx';
import AttendanceTab from '../components/AttendanceTab.jsx';

const TABS = [
  { id: 'classes',    label: 'Classes',    Icon: GraduationCap, Component: ClassesTab },
  { id: 'routine',    label: 'Routine',    Icon: Calendar,      Component: RoutineTab },
  { id: 'syllabus',   label: 'Syllabus',   Icon: BookOpen,      Component: SyllabusTab },
  { id: 'exams',      label: 'Exams',      Icon: FileText,      Component: ExamsTab },
  { id: 'results',    label: 'Results',    Icon: Award,         Component: ResultsTab },
  { id: 'attendance', label: 'Attendance', Icon: Users,         Component: AttendanceTab },
];

export default function AcademicPage() {
  const [active, setActive] = useState('classes');
  const { Component } = TABS.find(t => t.id === active);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black text-slate-800">Academic Portal</h2>
        <p className="mt-0.5 text-sm text-slate-500">Manage classes, routines, syllabus, exams, results, and attendance</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition
              ${active === id
                ? 'bg-white text-[var(--brand)] shadow-soft'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Active tab */}
      <Component />
    </div>
  );
}
