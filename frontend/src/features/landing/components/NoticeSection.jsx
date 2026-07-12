import { useState, useEffect } from 'react';
import { Bell, Newspaper, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { listPublicNotices } from '../../../services/api/noticeApi.js';

function formatDate(value, language) {
  return new Date(value).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function NoticeSection() {
  const { t, language } = useLanguage();
  const [notices, setNotices] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listPublicNotices('notice'), listPublicNotices('news')])
      .then(([n, w]) => {
        setNotices(n.notices || []);
        setNews(w.notices || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="notice" className="bg-slate-50 py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('notice.title')}</h2>
          <p className="section-subtitle">{t('notice.subtitle')}</p>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : (
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Bell className="h-5 w-5 text-[var(--brand)]" />
                <h3 className="font-bold text-[var(--brand-strong)]">{t('notice.title')}</h3>
              </div>
              {notices.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t('notice.emptyNotices')}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {notices.map((n, i) => (
                    <li key={n.id} className="flex items-start gap-3 rounded-xl bg-emerald-50/60 p-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-black text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-slate-700">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs leading-snug text-slate-500 line-clamp-2">{n.body}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Newspaper className="h-5 w-5 text-[var(--brand)]" />
                <h3 className="font-bold text-[var(--brand-strong)]">{t('notice.newsTitle')}</h3>
              </div>
              {news.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t('notice.emptyNews')}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {news.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-slate-700">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs leading-snug text-slate-500 line-clamp-2">{n.body}</p>}
                        {n.publishedAt && <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.publishedAt, language)}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
