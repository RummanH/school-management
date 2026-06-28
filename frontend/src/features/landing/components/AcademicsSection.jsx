import { BookOpen, Calendar, Download } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { DEPARTMENTS } from '../constants.js';

export default function AcademicsSection() {
  const { t } = useLanguage();

  return (
    <section id="academics" className="bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('academics.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('academics.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map(({ key, descKey, icon }) => (
            <div key={key} className="card group text-center transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 text-4xl">{icon}</div>
              <h3 className="font-bold text-[var(--brand-strong)]">{t(`academics.${key}`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(`academics.${descKey}`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button className="btn-outline flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('academics.examSchedule')}
          </button>
          <button className="btn-outline flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t('academics.syllabus')}
          </button>
          <button className="btn-primary flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('academics.viewMore')}
          </button>
        </div>
      </div>
    </section>
  );
}
