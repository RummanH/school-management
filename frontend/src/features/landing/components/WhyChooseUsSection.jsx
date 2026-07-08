import { useLanguage } from '../../../app/App.jsx';
import { WHY_CHOOSE_US, ACCENT_COLORS } from '../constants.js';

export default function WhyChooseUsSection() {
  const { t } = useLanguage();

  return (
    <section className="dot-pattern bg-slate-50 py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('whyChooseUs.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('whyChooseUs.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CHOOSE_US.map(({ key, descKey, icon }, i) => {
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <div
                key={key}
                className="card text-center transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${accent.bg}`}>
                  {icon}
                </div>
                <h3 className="font-bold text-[var(--brand-strong)]">{t(`whyChooseUs.${key}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(`whyChooseUs.${descKey}`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
