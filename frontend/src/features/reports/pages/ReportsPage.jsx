import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Loader2, Printer, RefreshCw, Users, UserCheck, GraduationCap, ClipboardCheck, BadgeDollarSign } from 'lucide-react';
import { getReports } from '../../../services/api/adminApi.js';

const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const money = (value) => `BDT ${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value) => `${Number(value || 0).toFixed(2)}%`;
const titleCase = (value) => String(value || 'unspecified').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function StatCard({ icon: Icon, label, value, note, color }) {
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-black text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {note && <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>}
      </div>
    </div>
  );
}

function Section({ title, actions, children }) {
  return (
    <section className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h3 className="font-black text-slate-800">{title}</h3>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DataTable({ columns, rows, empty = 'No data available.' }) {
  if (!rows?.length) return <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">
            {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, idx) => (
            <tr key={row.id || row.classId || row.studentUserId || `${row.name || row.label || 'row'}-${idx}`} className="hover:bg-slate-50/70">
              {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function rowsToExcelHtml(rows, title) {
  const htmlRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  return `<html><head><meta charset="utf-8"><title>${title}</title></head><body><table border="1">${htmlRows}</table></body></html>`;
}

function buildExportRows(report) {
  const rows = [
    ['Section', 'Metric', 'Value'],
    ['Overview', 'Active Students', report.overview.activeStudents],
    ['Overview', 'Total Teachers', report.overview.totalTeachers],
    ['Attendance', `Daily Present (${report.attendance.date})`, `${report.attendance.dailyPresent}/${report.attendance.dailyTotal} (${pct(report.attendance.dailyPercentage)})`],
    ['Attendance', `Monthly Present (${report.attendance.month})`, `${report.attendance.monthlyPresent}/${report.attendance.monthlyTotal} (${pct(report.attendance.monthlyPercentage)})`],
    ['Exams', 'Results Recorded', report.exams.resultsRecorded],
    ['Exams', 'Passed', report.exams.passed],
    ['Exams', 'Failed', report.exams.failed],
    ['Exams', 'Pass Rate', pct(report.exams.passRate)],
    ['Admissions', 'Total Applications', report.admissions.total],
    ['Admissions', 'Last 30 Days', report.admissions.last30Days],
    ['Fees', 'Billed', money(report.fees.billed)],
    ['Fees', 'Collected', money(report.fees.collected)],
    ['Fees', 'Due', money(report.fees.due)],
    [],
    ['Class-wise Student Count'],
    ['Class', 'Section', 'Academic Year', 'Students'],
    ...report.classWiseStudents.map((row) => [row.name, row.section, row.academicYear, row.studentCount]),
    [],
    ['Gender-wise Student Count'],
    ['Gender', 'Students'],
    ...report.genderWiseStudents.map((row) => [titleCase(row.gender), row.studentCount]),
    [],
    ['Absent Students'],
    ['Student', 'Class', 'Section', 'Roll', 'Note'],
    ...report.absentStudents.map((row) => [row.studentName, row.className, row.section, row.rollNumber, row.note]),
    [],
    ['Class-wise Result Summary'],
    ['Class', 'Section', 'Recorded', 'Average Marks', 'Passed', 'Failed', 'Pass Rate'],
    ...report.classWiseResults.map((row) => [row.className, row.section, row.resultsRecorded, row.averageMarks, row.passed, row.failed, pct(row.passRate)]),
  ];
  return rows;
}

function printReport() {
  window.print();
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({ date: today(), month: month() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const data = await getReports(nextFilters);
      setReport(data.report);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const exportRows = useMemo(() => report ? buildExportRows(report) : [], [report]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCsv() {
    downloadFile(`admin-reports-${filters.date}.csv`, 'text/csv;charset=utf-8', rowsToCsv(exportRows));
  }

  function exportExcel() {
    downloadFile(`admin-reports-${filters.date}.xls`, 'application/vnd.ms-excel;charset=utf-8', rowsToExcelHtml(exportRows, 'Admin Reports'));
  }

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-black text-slate-800">Admin Reports</h2>
          <p className="mt-0.5 text-sm text-slate-500">Operational student, attendance, academic, admission, and finance reports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input w-auto" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} />
          <input type="month" className="input w-auto" value={filters.month} onChange={(e) => updateFilter('month', e.target.value)} />
          <button onClick={() => load()} className="btn-secondary"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" /></div>
      ) : report && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 print:border-0 print:px-0">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Report period</p>
              <p className="mt-1 text-sm font-bold text-slate-700">Daily: {report.filters.date} / Monthly: {report.filters.month}</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button onClick={exportCsv} className="btn-secondary"><Download className="h-4 w-4" />CSV</button>
              <button onClick={exportExcel} className="btn-secondary"><FileSpreadsheet className="h-4 w-4" />Excel</button>
              <button onClick={printReport} className="btn-secondary"><Printer className="h-4 w-4" />PDF</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={GraduationCap} label="Active Students" value={report.overview.activeStudents} color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Users} label="Teachers" value={report.overview.totalTeachers} color="bg-blue-50 text-blue-600" />
            <StatCard icon={UserCheck} label="Daily Attendance" value={pct(report.attendance.dailyPercentage)} note={`${report.attendance.dailyPresent}/${report.attendance.dailyTotal} present`} color="bg-teal-50 text-teal-600" />
            <StatCard icon={ClipboardCheck} label="Exam Pass Rate" value={pct(report.exams.passRate)} note={`${report.exams.passed}/${report.exams.resultsRecorded} passed`} color="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Class-wise Student Count">
              <DataTable columns={[
                { key: 'name', label: 'Class', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
                { key: 'section', label: 'Section', render: (row) => row.section || '-' },
                { key: 'academicYear', label: 'Year', render: (row) => row.academicYear || '-' },
                { key: 'studentCount', label: 'Students' },
              ]} rows={report.classWiseStudents} />
            </Section>

            <Section title="Gender-wise Student Count">
              <DataTable columns={[
                { key: 'gender', label: 'Gender', render: (row) => <span className="font-bold text-slate-800">{titleCase(row.gender)}</span> },
                { key: 'studentCount', label: 'Students' },
              ]} rows={report.genderWiseStudents} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Attendance Summary">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard icon={UserCheck} label={`Daily - ${report.attendance.date}`} value={pct(report.attendance.dailyPercentage)} note={`${report.attendance.dailyPresent}/${report.attendance.dailyTotal} present`} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={BarChart3} label={`Monthly - ${report.attendance.month}`} value={pct(report.attendance.monthlyPercentage)} note={`${report.attendance.monthlyPresent}/${report.attendance.monthlyTotal} present`} color="bg-blue-50 text-blue-600" />
              </div>
            </Section>

            <Section title="Absent Student List">
              <DataTable columns={[
                { key: 'studentName', label: 'Student', render: (row) => <span className="font-bold text-slate-800">{row.studentName}</span> },
                { key: 'className', label: 'Class', render: (row) => row.className || '-' },
                { key: 'rollNumber', label: 'Roll', render: (row) => row.rollNumber || '-' },
                { key: 'note', label: 'Note', render: (row) => row.note || '-' },
              ]} rows={report.absentStudents} empty="No absent students recorded for this date." />
            </Section>
          </div>

          <Section title="Class-wise Result Summary">
            <DataTable columns={[
              { key: 'className', label: 'Class', render: (row) => <span className="font-bold text-slate-800">{row.className}</span> },
              { key: 'section', label: 'Section', render: (row) => row.section || '-' },
              { key: 'resultsRecorded', label: 'Recorded' },
              { key: 'averageMarks', label: 'Avg Marks' },
              { key: 'passed', label: 'Passed' },
              { key: 'failed', label: 'Failed' },
              { key: 'passRate', label: 'Pass Rate', render: (row) => pct(row.passRate) },
            ]} rows={report.classWiseResults} />
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Admission Application Summary">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                <StatCard icon={FileText} label="Total" value={report.admissions.total} color="bg-slate-100 text-slate-600" />
                <StatCard icon={FileText} label="Last 30 Days" value={report.admissions.last30Days} color="bg-blue-50 text-blue-600" />
                <StatCard icon={FileText} label="Submitted" value={report.admissions.submitted} color="bg-amber-50 text-amber-600" />
                <StatCard icon={FileText} label="Accepted" value={report.admissions.accepted} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={FileText} label="Test Scheduled" value={report.admissions.testScheduled} color="bg-teal-50 text-teal-600" />
                <StatCard icon={FileText} label="Rejected" value={report.admissions.rejected} color="bg-red-50 text-red-600" />
              </div>
            </Section>

            <Section title="Fee Due and Collection Reports">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard icon={BadgeDollarSign} label="Billed" value={money(report.fees.billed)} color="bg-blue-50 text-blue-600" />
                <StatCard icon={BadgeDollarSign} label="Collected" value={money(report.fees.collected)} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={BadgeDollarSign} label="Outstanding Due" value={money(report.fees.due)} color="bg-red-50 text-red-600" />
                <StatCard icon={FileText} label="Invoices" value={report.fees.invoiceCount} note={`Paid ${report.fees.paidCount} / Partial ${report.fees.partialCount} / Unpaid ${report.fees.unpaidCount}`} color="bg-amber-50 text-amber-600" />
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}