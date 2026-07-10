import { useLanguage } from '../../../app/App.jsx';

const CAMPUS_PHOTOS = [
  { key: 'teacherClass', url: '/images/campus/teacher-class.jpg', big: true },
  { key: 'activeLearning', url: '/images/campus/active-learning.jpg' },
  { key: 'studyTime', url: '/images/campus/study-time.jpg' },
  { key: 'modernClassroom', url: '/images/campus/modern-classroom.jpg' },
  { key: 'scienceLab', url: '/images/campus/science-lab.jpg' },
  { key: 'experiments', url: '/images/campus/experiments.jpg' },
  { key: 'library', url: '/images/campus/library.jpg' },
  { key: 'digitalLearning', url: '/images/campus/digital-learning.jpg' },
];

export default function CampusGallerySection() {
  const { t } = useLanguage();

  return (
    <section id="campus" className="bg-slate-50 py-20">
      <div className="landing-container">
        <div className="text-center">
          <p className="brand-chip">{t('campus.eyebrow')}</p>
          <h2 className="section-title mt-4">{t('campus.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('campus.subtitle')}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:grid-rows-2">
          {CAMPUS_PHOTOS.map(({ key, url, big }) => (
            <div
              key={key}
              className={`group relative overflow-hidden rounded-2xl bg-slate-200 ${big ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto' : 'aspect-square'}`}
            >
              <img
                src={url}
                alt={t(`campus.${key}`)}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 sm:p-4">
                <p className={`font-black text-white ${big ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                  {t(`campus.${key}`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
