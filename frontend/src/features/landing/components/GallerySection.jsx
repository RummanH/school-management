import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { listPublicGallery } from '../../../services/api/galleryApi.js';

function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const videoId = u.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    return url;
  } catch {
    return url;
  }
}

export default function GallerySection() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicGallery()
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="gallery" className="bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('gallery.title')}</h2>
          <p className="section-subtitle">{t('gallery.subtitle')}</p>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-12 text-center text-sm text-slate-400">{t('gallery.empty')}</p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="group relative aspect-video overflow-hidden rounded-2xl bg-slate-100">
                {item.type === 'video' ? (
                  <iframe
                    src={toEmbedUrl(item.url)}
                    title={item.caption || t('gallery.videoTitle')}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      src={item.url}
                      alt={item.caption || ''}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-[var(--brand-strong)]/0 transition duration-300 group-hover:bg-[var(--brand-strong)]/20" />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
