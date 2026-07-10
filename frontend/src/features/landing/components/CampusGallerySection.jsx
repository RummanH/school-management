import { useLanguage } from '../../../app/App.jsx';

// Verified, appropriately-licensed Unsplash photography — every URL below was
// downloaded and visually checked before use (not guessed from memory) to
// make sure captions match what the photo actually shows.
const CAMPUS_PHOTOS = [
  { key: 'teacherClass', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80', big: true },
  { key: 'activeLearning', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=80' },
  { key: 'studyTime', url: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=80' },
  { key: 'modernClassroom', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80' },
  { key: 'scienceLab', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&q=80' },
  { key: 'experiments', url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80' },
  { key: 'library', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80' },
  { key: 'digitalLearning', url: 'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=600&q=80' },
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
