import { Award, BookOpenCheck, Building2, Eye, GraduationCap, Landmark, Target, UserRound } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { ACCENT_COLORS } from '../constants.js';

const PHOTO_FALLBACKS = [
  '/images/faculty/1-head-teacher.jpg',
  '/images/faculty/2-senior-teacher.jpg',
  '/images/faculty/3-assistant-teacher.jpg',
  '/images/faculty/4-ict-teacher.jpg',
];

function FacultyCard({ teacher, index, t }) {
  const photo = teacher.photoUrl || PHOTO_FALLBACKS[index % PHOTO_FALLBACKS.length];
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
      <div className="aspect-square bg-slate-100">
        <img src={photo} alt={teacher.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-5">
        <p className="text-base font-black text-[var(--brand-strong)]">{teacher.name}</p>
        <p className="mt-1 text-sm font-bold text-[var(--brand)]">{teacher.designation || t('about.facultyFallbackDesignation')}</p>
        <div className="mt-4 space-y-2 text-sm text-[var(--text-soft)]">
          <p><span className="font-bold text-slate-500">{t('about.departmentLabel')}</span> {teacher.department || t('about.facultyFallbackDepartment')}</p>
          <p><span className="font-bold text-slate-500">{t('about.qualificationLabel')}</span> {teacher.qualification || t('about.facultyFallbackQualification')}</p>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ icon: Icon, title, children, colorIndex = 0 }) {
  const color = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length];
  return (
    <div className="card flex gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color.bg} ${color.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-lg font-bold text-[var(--brand-strong)]">{title}</h3>
        <div className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{children}</div>
      </div>
    </div>
  );
}

export default function AboutSection() {
  const { t } = useLanguage();
  const historyItems = t('about.historyItems');
  const faculty = t('about.faculty');
  const leadership = t('about.leadership');
  const orgHighlights = t('about.orgHighlights');

  return (
    <section id="about" className="dot-pattern bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('about.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('about.subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <InfoCard icon={Eye} title={t('about.vision')} colorIndex={0}>{t('about.visionText')}</InfoCard>
          <InfoCard icon={Target} title={t('about.mission')} colorIndex={1}>{t('about.missionText')}</InfoCard>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{t('about.historyEyebrow')}</p>
                <h3 className="text-xl font-black text-[var(--brand-strong)]">{t('about.historyTitle')}</h3>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {historyItems.map((item) => (
                <div key={`${item.year}-${item.title}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{item.year}</p>
                  <p className="mt-2 font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{t('about.founderEyebrow')}</p>
                <h3 className="text-xl font-black text-[var(--brand-strong)]">{t('about.founderName')}</h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[var(--text-soft)]">
              {t('about.founderText')}
            </p>
            <div className="mt-5 rounded-2xl bg-[var(--brand-soft)] p-4 text-sm font-semibold text-[var(--brand-strong)]">
              {t('about.founderMotto')}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            { titleKey: 'chairmanTitle', nameKey: 'chairmanName', msgKey: 'chairmanMessage', initialKey: 'chairmanInitial' },
            { titleKey: 'principalTitle', nameKey: 'principalName', msgKey: 'principalMessage', initialKey: 'principalInitial' },
          ].map(({ titleKey, nameKey, msgKey, initialKey }) => (
            <div key={titleKey} className="card">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{t(`about.${titleKey}`)}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-black text-white">
                  {t(`about.${initialKey}`)}
                </span>
                <p className="text-sm font-bold text-[var(--brand-strong)]">{t(`about.${nameKey}`)}</p>
              </div>
              <blockquote className="mt-4 border-l-4 border-emerald-200 pl-4 text-sm italic leading-relaxed text-[var(--text-soft)]">
                "{t(`about.${msgKey}`)}"
              </blockquote>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="brand-chip"><GraduationCap className="h-3.5 w-3.5" /> {t('about.facultyEyebrow')}</p>
              <h3 className="mt-3 text-2xl font-black text-[var(--brand-strong)]">{t('about.facultyTitle')}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-soft)]">
                {t('about.facultySubtitle')}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.map((teacher, index) => <FacultyCard key={teacher.userId || teacher.name} teacher={teacher} index={index} t={t} />)}
          </div>
        </div>

        <div className="mt-16 space-y-6">
          <div className="rounded-[1.9rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6f2_100%)] p-6 shadow-soft sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand)]">{t('about.orgEyebrow')}</p>
                <h3 className="mt-3 text-[1.9rem] font-black leading-tight tracking-[-0.03em] text-[var(--brand-strong)] sm:text-[2.15rem]">{t('about.orgTitle')}</h3>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{t('about.orgText')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:w-[25rem]">
                {orgHighlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--brand)]">{t('about.leadershipEyebrow')}</p>
                <h3 className="mt-2 text-xl font-black text-[var(--brand-strong)]">{t('about.leadershipTitle')}</h3>
              </div>
              <div className="hidden rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--brand-strong)] sm:block">
                {t('about.leadershipBadge')}
              </div>
            </div>

            <div className="space-y-4">
              {leadership.map((item, index) => (
                <div key={item.role} className="relative rounded-[1.4rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 sm:p-5">
                  {index < leadership.length - 1 && (
                    <div className="absolute left-8 top-full h-4 w-px bg-slate-200" />
                  )}
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      {index === 0 ? <Award className="h-5 w-5" /> : index === 2 ? <BookOpenCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-base font-black text-slate-900">{item.role}</p>
                        <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {t('about.levelLabel', { number: index + 1 })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
