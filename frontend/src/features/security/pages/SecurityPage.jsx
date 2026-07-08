import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { getAuditLogs, getPermissionMatrix } from '../../../services/api/securityApi.js';

export default function SecurityPage() {
  const [logs, setLogs] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAuditLogs(), getPermissionMatrix()])
      .then(([audit, permissions]) => {
        setLogs(audit.logs || []);
        setMatrix(permissions.matrix || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  const permissionKeys = matrix[0] ? Object.keys(matrix[0].permissions) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800">Security & Audit</h2>
        <p className="mt-0.5 text-sm text-slate-500">Audit trails, role permissions, login throttling, and export controls.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-slate-700"><ShieldCheck className="h-4 w-4" /> Role Permission Matrix</div>
        <div className="overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="px-3 py-2">Role</th>{permissionKeys.map((key) => <th key={key} className="px-3 py-2">{key}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((row) => (
                <tr key={row.role}><td className="px-3 py-2 font-bold text-slate-700">{row.role.replaceAll('_', ' ')}</td>{permissionKeys.map((key) => <td key={key} className="px-3 py-2">{row.permissions[key] ? 'Allowed' : '-'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-bold text-slate-700">Recent Audit Logs</div>
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-2 py-3 text-sm lg:grid-cols-[12rem_1fr_12rem]">
              <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
              <div><p className="font-semibold text-slate-700">{log.action}</p><p className="text-xs text-slate-500">{log.method} {log.path}</p></div>
              <span className="text-xs text-slate-500">{log.actorName || log.actorEmail || log.actorRole || 'system'}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No audit logs yet</p>}
        </div>
      </section>
    </div>
  );
}