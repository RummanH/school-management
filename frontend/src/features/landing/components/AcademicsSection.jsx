import { useState } from 'react';
import { BookOpen, Calendar, Download, X } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { DEPARTMENTS, ACCENT_COLORS } from '../constants.js';

const EXAM_SCHEDULE_KEYS = ['schedule1', 'schedule2', 'schedule3', 'schedule4'];
const CURRICULUM_KEYS = ['curriculum1', 'curriculum2', 'curriculum3', 'curriculum4'];

export default function AcademicsSection() {
  const { t } = useLanguage();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);

  return (
    <>
      <section id="academics" className="bg-white py-20">
        <div className="landing-container">
          <div className="text-center">
            <h2 className="section-title">{t('academics.title')}</h2>
            <p className="section-subtitle mx-auto max-w-2xl">{t('academics.subtitle')}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEPARTMENTS.map(({ key, descKey, icon }, i) => {
              const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
              return (
                <div key={key} className="card group text-center transition hover:-translate-y-1 hover:shadow-md">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${accent.bg}`}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-[var(--brand-strong)]">{t(`academics.${key}`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(`academics.${descKey}`)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button onClick={() => setScheduleOpen(true)} className="btn-cta-outline flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('academics.examSchedule')}
            </button>
            <a href="/downloads/demo-syllabus.html" download="greenfield-academy-demo-syllabus-2026.html" className="btn-cta-outline flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('academics.syllabus')}
            </a>
            <button onClick={() => setCurriculumOpen(true)} className="btn-cta flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t('academics.viewMore')}
            </button>
          </div>
        </div>
      </section>

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
              <div className="bg-[linear-gradient(135deg,#161233_0%,#201b46_60%,#0f172a_100%)] px-6 py-6 text-white sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/72">{t('academics.modalEyebrow')}</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-[2rem]">{t('academics.modalTitle')}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/72">{t('academics.modalSubtitle')}</p>
                  </div>
                  <button onClick={() => setScheduleOpen(false)} className="rounded-2xl border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label={t('academics.closeModal')}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-6 overflow-y-auto px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {EXAM_SCHEDULE_KEYS.map((key, index) => (
                      <div key={key} className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                            {t('academics.phaseLabel', { number: index + 1 })}
                          </span>
                          <Calendar className="h-4 w-4 text-[var(--brand)]" />
                        </div>
                        <p className="mt-4 text-lg font-black text-slate-900">{t(`academics.${key}.title`)}</p>
                        <p className="mt-2 text-sm font-bold text-[var(--brand)]">{t(`academics.${key}.date`)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{t(`academics.${key}.desc`)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50/70 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">{t('academics.windowEyebrow')}</p>
                    <p className="mt-3 text-2xl font-black text-slate-900">{t('academics.windowTitle')}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t('academics.windowText')}</p>
                  </div>

                  <div className="rounded-[1.6rem] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{t('academics.noteEyebrow')}</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      {[1, 2, 3].map((n) => (
                        <li key={n} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                          <span>{t(`academics.note${n}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {curriculumOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
              <div className="bg-[linear-gradient(135deg,#161233_0%,#201b46_60%,#0f172a_100%)] px-6 py-6 text-white sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/72">{t('academics.curriculumEyebrow')}</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-[2rem]">{t('academics.curriculumTitle')}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/72">{t('academics.curriculumSubtitle')}</p>
                  </div>
                  <button onClick={() => setCurriculumOpen(false)} className="rounded-2xl border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label={t('academics.closeCurriculumModal')}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-6 overflow-y-auto px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {CURRICULUM_KEYS.map((key, index) => (
                      <div key={key} className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                            {t('academics.phaseLabel', { number: index + 1 })}
                          </span>
                          <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                        </div>
                        <p className="mt-4 text-lg font-black text-slate-900">{t(`academics.${key}.title`)}</p>
                        <p className="mt-2 text-sm font-bold text-[var(--brand)]">{t(`academics.${key}.range`)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{t(`academics.${key}.desc`)}</p>
                        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                          {[1, 2].map((n) => (
                            <li key={n} className="flex gap-3">
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                              <span>{t(`academics.${key}.point${n}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50/70 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">{t('academics.curriculumSupportEyebrow')}</p>
                    <p className="mt-3 text-2xl font-black text-slate-900">{t('academics.curriculumSupportTitle')}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t('academics.curriculumSupportText')}</p>
                  </div>

                  <div className="rounded-[1.6rem] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{t('academics.curriculumNoteEyebrow')}</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      {[1, 2, 3].map((n) => (
                        <li key={n} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                          <span>{t(`academics.curriculumNote${n}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
