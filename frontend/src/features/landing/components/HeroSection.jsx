import { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { HERO_IMAGE } from '../constants.js';

const SLIDES = ['slide1', 'slide2', 'slide3'];

// Subtle per-slide tint on the glow orbs — same deep indigo base throughout,
// just a different accent hue drifting through so slides feel distinct
// without the background flatly repainting itself.
const SLIDE_GLOW = [
  { a: 'bg-indigo-500/30', b: 'bg-violet-500/20' },
  { a: 'bg-violet-500/30', b: 'bg-fuchsia-500/15' },
  { a: 'bg-blue-500/25', b: 'bg-indigo-500/25' },
];

export default function HeroSection() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const glow = SLIDE_GLOW[current];

  return (
    <section id="hero" className="relative flex min-h-[90vh] items-center bg-[#0f0c2e] pt-16">
      {/* Layered glow orbs, clipped to this wrapper only so the floating
          content around it is never at risk of being cut off. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full blur-3xl transition-colors duration-[1500ms] ${glow.a}`} />
        <div className={`absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full blur-3xl transition-colors duration-[1500ms] ${glow.b}`} />
      </div>

      <div className="landing-container relative z-10 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: copy */}
          <div className="text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-white/70">
              {t('hero.eyebrow')}
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-[3.75rem]">
              {t(`hero.${SLIDES[current]}Title`)}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
              {t(`hero.${SLIDES[current]}Sub`)}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#admission"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#1e1b4b] shadow-[0_16px_36px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(99,102,241,0.45)]"
              >
                {t('hero.admissionCta')}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white/70 transition hover:text-white"
              >
                {t('hero.learnMore')}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            {/* Slide indicators — minimal, no carousel chrome */}
            <div className="mt-14 flex items-center gap-2.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'w-9 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          {/* Right: single clean photo, no overlapping badge clutter */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/30 to-violet-500/10 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl">
              <img
                src={HERO_IMAGE}
                alt={t('school.name')}
                className="h-80 w-full object-cover sm:h-[26rem]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('school.established')}</p>
                <p className="text-base font-black text-white">{t('school.name')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
