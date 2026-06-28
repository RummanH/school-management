import { Bell, Newspaper, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { NOTICE_SAMPLES, NEWS_SAMPLES } from '../constants.js';

export default function NoticeSection() {
  const { t } = useLanguage();

  return (
    <section id="notice" className="bg-slate-50 py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('notice.title')}</h2>
          <p className="section-subtitle">{t('notice.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Notices */}
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Bell className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="font-bold text-[var(--brand-strong)]">{t('notice.title')}</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {NOTICE_SAMPLES.map((key, i) => (
                <li key={key} className="flex items-start gap-3 rounded-xl bg-emerald-50/60 p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-snug text-slate-700">{t(`notice.${key}`)}</p>
                </li>
              ))}
            </ul>
            <button className="mt-4 flex items-center gap-1 text-xs font-bold text-[var(--brand)] hover:underline">
              {t('notice.viewAll')} <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* News */}
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Newspaper className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="font-bold text-[var(--brand-strong)]">{t('notice.newsTitle')}</h3>
            </div>
            <ul className="mt-4 space-y-4">
              {NEWS_SAMPLES.map((key) => (
                <li key={key} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                  <div>
                    <p className="text-sm leading-snug text-slate-700">{t(`notice.${key}`)}</p>
                    <button className="mt-1 text-xs font-bold text-[var(--brand)] hover:underline">
                      {t('notice.readMore')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
