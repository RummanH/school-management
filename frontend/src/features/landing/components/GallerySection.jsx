import { Images } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { GALLERY_IMAGES } from '../constants.js';

export default function GallerySection() {
  const { t } = useLanguage();

  return (
    <section id="gallery" className="bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('gallery.title')}</h2>
          <p className="section-subtitle">{t('gallery.subtitle')}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {GALLERY_IMAGES.map(({ src, alt }) => (
            <div key={src} className="group relative aspect-video overflow-hidden rounded-2xl bg-slate-100">
              <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[var(--brand-strong)]/0 transition duration-300 group-hover:bg-[var(--brand-strong)]/20" />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="btn-cta-outline inline-flex items-center gap-2">
            <Images className="h-4 w-4" />
            {t('gallery.viewAll')}
          </button>
        </div>
      </div>
    </section>
  );
}
