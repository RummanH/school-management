import { ArrowRight, ArrowUpRight, MapPin, Phone, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { HERO_IMAGE, STATS } from '../constants.js';

const HERO_STAT_KEYS = ['students', 'teachers', 'departments'];

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section id="hero" className="relative overflow-hidden bg-[linear-gradient(180deg,#161233_0%,#201b46_55%,#0f172a_100%)] pt-16 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-[32rem] w-[32rem] translate-x-1/4 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <div className="landing-container relative z-10 py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/78 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.eyebrow')}
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.6rem]">
              {t('hero.title')}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
              >
                {t('hero.featuresCta')}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#admission"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 px-5 py-3 text-sm font-bold text-white/85 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
              >
                {t('hero.admissionCta')}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {STATS.filter((item) => HERO_STAT_KEYS.includes(item.key)).map((item) => (
                <div key={item.key} className="rounded-[1.4rem] border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm">
                  <p className="text-2xl font-black tracking-tight text-white sm:text-[1.9rem]">{item.value.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/50">{t(`stats.${item.key}`)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm text-white/68 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-white/50" />
                <span>{t('contact.phone')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/50" />
                <span className="truncate">{t('contact.address')}</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -left-6 top-10 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="absolute -right-6 bottom-8 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />

            <div className="relative mx-auto max-w-[34rem]">
              <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-[2.2rem] border border-white/8 bg-white/[0.04]" />
              <div className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-3 shadow-[0_32px_90px_rgba(5,10,30,0.38)] backdrop-blur-md">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                  <img
                    src={HERO_IMAGE}
                    alt={t('school.name')}
                    className="aspect-[4/4.4] w-full object-cover sm:aspect-[4/4.1] lg:aspect-[4/4.45]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
