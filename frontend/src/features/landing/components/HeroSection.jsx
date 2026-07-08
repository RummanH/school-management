import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, GraduationCap, Users, Award } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { HERO_IMAGE } from '../constants.js';

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

          {/* Right: photo + floating stat badges */}
          <div className="relative mx-auto mt-6 max-w-md pb-6 pl-4 pr-2 lg:mt-0 lg:max-w-none">
            {/* Decorative diagonal accent, sits behind the photo */}
            <div
              className="pointer-events-none absolute -right-3 -top-8 h-32 w-32 bg-white/10"
              style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 65%)' }}
            />

            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl">
              <img
                src={HERO_IMAGE}
                alt={t('school.name')}
                className="h-72 w-full rounded-2xl object-cover sm:h-80"
                loading="lazy"
              />

              {/* Identity chip */}
              <div className="absolute -top-5 left-4 rounded-2xl bg-white px-4 py-2.5 shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('school.established')}</p>
                <p className="text-sm font-black text-[var(--brand-strong)]">{t('school.name')}</p>
              </div>

              {/* Students */}
              <div className="absolute -bottom-5 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-black leading-none text-slate-800">2,400+</p>
                  <p className="mt-1 text-[11px] leading-none text-slate-400">{t('stats.students')}</p>
                </div>
              </div>

              {/* Teachers */}
              <div className="absolute right-0 top-1/3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-black leading-none text-slate-800">80+</p>
                  <p className="mt-1 text-[11px] leading-none text-slate-400">{t('stats.teachers')}</p>
                </div>
              </div>

              {/* Years of excellence */}
              <div className="absolute -bottom-5 right-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Award className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-black leading-none text-slate-800">27</p>
                  <p className="mt-1 text-[11px] leading-none text-slate-400">{t('stats.yearsOfExcellence')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
