import { GraduationCap } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { resolveLandingAsset, siteImage } from '../constants.js';

const PHOTO_FALLBACK_FILES = [
  'faculty/1-head-teacher.jpg',
  'faculty/2-senior-teacher.jpg',
  'faculty/3-assistant-teacher.jpg',
  'faculty/4-ict-teacher.jpg',
];

function FacultyCard({ teacher, index, t, siteSlug }) {
  const photo = teacher.photoUrl
    ? resolveLandingAsset(teacher.photoUrl)
    : siteImage(siteSlug, PHOTO_FALLBACK_FILES[index % PHOTO_FALLBACK_FILES.length]);
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

export default function FacultySection() {
  const { t, siteSlug } = useLanguage();
  const faculty = t('about.faculty');

  return (
    <section id="faculty" className="bg-white py-20">
      <div className="landing-container">
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
          {faculty.map((teacher, index) => <FacultyCard key={teacher.userId || teacher.name} teacher={teacher} index={index} t={t} siteSlug={siteSlug} />)}
        </div>
      </div>
    </section>
  );
}
