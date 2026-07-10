import { useLanguage } from '../../../app/App.jsx';

// The banner photo is landscape (native ~7:4); every grid photo below is
// square (native 1:1) — each tile's aspect ratio matches its source image's
// real dimensions exactly so object-cover never has to crop into the shot.
const BANNER_PHOTO = { key: 'teacherClass', url: '/images/campus/teacher-class.jpg' };
const CAMPUS_PHOTOS = [
  { key: 'activeLearning', url: '/images/campus/active-learning.jpg' },
  { key: 'studyTime', url: '/images/campus/study-time.jpg' },
  { key: 'modernClassroom', url: '/images/campus/modern-classroom.jpg' },
  { key: 'scienceLab', url: '/images/campus/science-lab.jpg' },
  { key: 'experiments', url: '/images/campus/experiments.jpg' },
  { key: 'library', url: '/images/campus/library.jpg' },
  { key: 'digitalLearning', url: '/images/campus/digital-learning.jpg' },
];

function PhotoTile({ photoKey, url, aspect, textSize, t }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-slate-200 ${aspect}`}>
      <img
        src={url}
        alt={t(`campus.${photoKey}`)}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 sm:p-4">
        <p className={`font-black text-white ${textSize}`}>{t(`campus.${photoKey}`)}</p>
      </div>
    </div>
  );
}

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

        <div className="mt-12">
          <PhotoTile photoKey={BANNER_PHOTO.key} url={BANNER_PHOTO.url} aspect="aspect-[7/4]" textSize="text-base sm:text-lg" t={t} />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CAMPUS_PHOTOS.map(({ key, url }) => (
              <PhotoTile key={key} photoKey={key} url={url} aspect="aspect-square" textSize="text-xs sm:text-sm" t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
