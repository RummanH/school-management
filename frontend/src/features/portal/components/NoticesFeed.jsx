import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getNoticeFeed } from '../../../services/api/noticeApi.js';

export default function NoticesFeed() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNoticeFeed()
      .then((d) => setNotices(d.notices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (!notices.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No notices yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {notices.map((n) => (
        <li key={n.id} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">{n.title}</p>
            <span className="shrink-0 text-[11px] text-slate-400">
              {new Date(n.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {n.body && <p className="mt-1 text-xs text-slate-500">{n.body}</p>}
        </li>
      ))}
    </ul>
  );
}
