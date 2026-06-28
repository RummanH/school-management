import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';

const SLIDES = ['slide1', 'slide2', 'slide3'];

const SLIDE_COLORS = [
  'from-[#0d3d22] to-[#1a6b3c]',
  'from-[#0d3d22] to-[#0f4d2e]',
  'from-[#1a3a1a] to-[#1a6b3c]',
];

export default function HeroSection() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  function prev() { setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length); }
  function next() { setCurrent((c) => (c + 1) % SLIDES.length); }

  return (
    <section id="hero" className={`relative flex min-h-[92vh] items-center bg-gradient-to-br pt-16 ${SLIDE_COLORS[current]} transition-colors duration-700`}>
      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="landing-container relative z-10 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div className="text-white">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">
              {t('hero.eyebrow')}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              {t(`hero.${SLIDES[current]}Title`)}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {t(`hero.${SLIDES[current]}Sub`)}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#admission"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--brand-strong)] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t('hero.admissionCta')}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                {t('hero.learnMore')}
              </a>
            </div>

            {/* Slide indicators */}
            <div className="mt-10 flex items-center gap-3">
              <button onClick={prev} className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                />
              ))}
              <button onClick={next} className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Right: info card */}
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-md">
            <p className="text-sm font-black uppercase tracking-widest text-white/60">{t('school.established')}</p>
            <h2 className="mt-2 text-2xl font-black text-white">{t('school.name')}</h2>
            <p className="mt-2 text-white/70">{t('school.tagline')}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { label: '2,400+', sub: t('stats.students') },
                { label: '80+', sub: t('stats.teachers') },
                { label: '6', sub: t('stats.departments') },
                { label: '27', sub: t('stats.yearsOfExcellence') },
              ].map(({ label, sub }) => (
                <div key={sub} className="rounded-2xl bg-white/10 p-4 text-white">
                  <p className="text-2xl font-black">{label}</p>
                  <p className="mt-0.5 text-xs text-white/70">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
