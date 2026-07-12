import {
  CalendarCheck2, Wallet, MessagesSquare, BarChart3, GraduationCap, UserPlus,
  BriefcaseBusiness, Building2, ShieldCheck, Languages, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { siteImage } from '../constants.js';

const FEATURE_IMAGE_FILES = {
  attendance: 'features/attendance.jpg',
  fees: 'features/fees.jpg',
  communication: 'features/communication.jpg',
  reports: 'features/reports.jpg',
};

const SPOTLIGHTS = [
  { key: 'attendance', icon: CalendarCheck2, imageKey: 'attendance', reverse: false },
  { key: 'fees', icon: Wallet, imageKey: 'fees', reverse: true },
  { key: 'communication', icon: MessagesSquare, imageKey: 'communication', reverse: false },
  { key: 'reports', icon: BarChart3, imageKey: 'reports', reverse: true },
];

const GRID_FEATURES = [
  { key: 'students', icon: GraduationCap },
  { key: 'admissions', icon: UserPlus },
  { key: 'hr', icon: BriefcaseBusiness },
  { key: 'multiSchool', icon: Building2 },
  { key: 'security', icon: ShieldCheck },
  { key: 'bilingual', icon: Languages },
];

function PlaceholderVisual({ icon: Icon, label }) {
  return (
    <div className="relative aspect-[7/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--brand-strong)]">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
          <Icon className="h-6 w-6" />
        </span>
        <p className="max-w-[14rem] text-xs font-semibold text-white/40">{label}</p>
      </div>
    </div>
  );
}

function Spotlight({ tkey, icon, image, reverse, t }) {
  const bullets = [1, 2, 3].map((n) => t(`features.${tkey}Bullet${n}`));
  const title = t(`features.${tkey}Title`);
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? '' : ''}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        {image ? (
          <img src={image} alt={title} className="aspect-[7/4] w-full rounded-2xl object-cover shadow-2xl" loading="lazy" />
        ) : (
          <PlaceholderVisual icon={icon} label={t('features.placeholderLabel', { title })} />
        )}
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
          {(() => { const Icon = icon; return <Icon className="h-5 w-5" />; })()}
        </span>
        <h3 className="mt-4 text-2xl font-black text-[var(--brand-strong)]">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">{t(`features.${tkey}Desc`)}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PlatformFeaturesSection() {
  const { t, siteSlug } = useLanguage();

  return (
    <section id="features" className="bg-white py-24">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="brand-chip">{t('features.eyebrow')}</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--brand-strong)] sm:text-4xl">{t('features.title')}</h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">{t('features.subtitle')}</p>
        </div>

        <div className="mt-20 space-y-20">
          {SPOTLIGHTS.map(({ key, icon, imageKey, reverse }) => (
            <Spotlight key={key} tkey={key} icon={icon} image={siteImage(siteSlug, FEATURE_IMAGE_FILES[imageKey])} reverse={reverse} t={t} />
          ))}
        </div>

        <div className="mt-24">
          <div className="text-center">
            <h3 className="text-2xl font-black text-[var(--brand-strong)]">{t('features.gridTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">{t('features.gridSubtitle')}</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GRID_FEATURES.map(({ key, icon: Icon }) => (
              <div key={key} className="card flex gap-4 transition hover:-translate-y-1 hover:shadow-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-bold text-[var(--brand-strong)]">{t(`features.grid${key.charAt(0).toUpperCase()}${key.slice(1)}Title`)}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-soft)]">{t(`features.grid${key.charAt(0).toUpperCase()}${key.slice(1)}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center gap-4 rounded-3xl bg-[var(--brand-strong)] px-8 py-12 text-center sm:px-16">
          <h3 className="text-2xl font-black text-white sm:text-3xl">{t('features.ctaTitle')}</h3>
          <p className="max-w-xl text-sm text-white/70 sm:text-base">{t('features.ctaSubtitle')}</p>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--brand-strong)] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t('features.ctaButton')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
