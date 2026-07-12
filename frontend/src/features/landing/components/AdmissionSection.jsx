import { CheckCircle, Calendar, FileText, ArrowRight, Search } from 'lucide-react';
import { useLanguage, navigate } from '../../../app/App.jsx';
import { ADMISSION_DOCS } from '../constants.js';

const DATE_KEYS = ['date1', 'date2', 'date3', 'date4'];

export default function AdmissionSection() {
  const { t, siteSlug } = useLanguage();

  return (
    <section id="admission" className="bg-emerald-50 py-20">
      <div className="landing-container">
        {/* Banner */}
        <div className="rounded-3xl bg-[var(--brand-strong)] px-8 py-10 text-white sm:px-12">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">{t('admission.title')}</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">{t('admission.title')}</h2>
          <p className="mt-4 max-w-2xl text-white/75">{t('admission.announcement')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/admission?school=${siteSlug}`)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--brand-strong)] shadow-md transition hover:-translate-y-0.5"
            >
              {t('admission.applyNow')} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(`/admission?school=${siteSlug}&tab=status`)}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              {t('admission.checkStatus')}
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {/* Important dates */}
          <div className="card sm:col-span-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="font-bold text-[var(--brand-strong)]">{t('admission.importantDates')}</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {DATE_KEYS.map((dk) => (
                <li key={dk} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span className="text-slate-700">{t(`admission.${dk}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Documents */}
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="font-bold text-[var(--brand-strong)]">{t('admission.documents')}</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {ADMISSION_DOCS.map((dk) => (
                <li key={dk} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                  {t(`admission.${dk}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
