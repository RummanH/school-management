import { MessageSquareQuote } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';

const TESTIMONIALS = [
  ['principal', true],
  ['teacher', false],
  ['guardian', false],
];

export default function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[#f5f3ed] py-20 sm:py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
      <div className="landing-container relative">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="brand-chip">{t('testimonials.eyebrow')}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--brand-strong)] sm:text-4xl">{t('testimonials.title')}</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--text-soft)] sm:text-lg lg:justify-self-end">{t('testimonials.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map(([key, featured]) => (
            <article
              key={key}
              className={featured
                ? 'relative overflow-hidden rounded-[2rem] bg-[var(--brand-strong)] p-7 text-white shadow-[0_28px_70px_rgba(22,18,51,0.22)] sm:p-8 lg:-translate-y-3'
                : 'relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-7 text-slate-800 shadow-[0_20px_60px_rgba(22,18,51,0.09)] backdrop-blur sm:p-8'}
            >
              {featured && <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#5b55a2]/40 blur-3xl" />}
              <div className="relative">
                <span className={featured
                  ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-amber-200'
                  : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]'}>
                  <MessageSquareQuote className="h-5 w-5" />
                </span>
                <blockquote className={featured
                  ? 'mt-7 text-lg font-semibold leading-relaxed text-white sm:text-xl'
                  : 'mt-7 text-base font-semibold leading-relaxed text-slate-700 sm:text-lg'}>
                  &ldquo;{t('testimonials.' + key + '.quote')}&rdquo;
                </blockquote>
                <div className={featured
                  ? 'mt-8 flex items-center gap-3 border-t border-white/10 pt-5'
                  : 'mt-8 flex items-center gap-3 border-t border-slate-100 pt-5'}>
                  <span className={featured
                    ? 'flex h-11 w-11 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-[var(--brand-strong)]'
                    : 'flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-strong)] text-xs font-black text-white'}>
                    {t('testimonials.' + key + '.initials')}
                  </span>
                  <div>
                    <p className={featured ? 'text-sm font-black text-white' : 'text-sm font-black text-slate-800'}>{t('testimonials.' + key + '.name')}</p>
                    <p className={featured ? 'mt-0.5 text-xs text-white/50' : 'mt-0.5 text-xs text-slate-400'}>{t('testimonials.' + key + '.role')}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-7 text-center text-xs leading-relaxed text-slate-400">{t('testimonials.note')}</p>
      </div>
    </section>
  );
}
