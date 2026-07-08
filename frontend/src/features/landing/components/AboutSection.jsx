import { Eye, Target } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { ACCENT_COLORS } from '../constants.js';

export default function AboutSection() {
  const { t } = useLanguage();

  return (
    <section id="about" className="dot-pattern bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('about.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('about.subtitle')}</p>
        </div>

        {/* Vision + Mission */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="card flex gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ACCENT_COLORS[0].bg} ${ACCENT_COLORS[0].text}`}>
              <Eye className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-[var(--brand-strong)]">{t('about.vision')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{t('about.visionText')}</p>
            </div>
          </div>
          <div className="card flex gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ACCENT_COLORS[1].bg} ${ACCENT_COLORS[1].text}`}>
              <Target className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-[var(--brand-strong)]">{t('about.mission')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{t('about.missionText')}</p>
            </div>
          </div>
        </div>

        {/* Chairman + Principal messages */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[
            { titleKey: 'chairmanTitle', nameKey: 'chairmanName', msgKey: 'chairmanMessage', initial: 'C' },
            { titleKey: 'principalTitle', nameKey: 'principalName', msgKey: 'principalMessage', initial: 'P' },
          ].map(({ titleKey, nameKey, msgKey, initial }) => (
            <div key={titleKey} className="card">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{t(`about.${titleKey}`)}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-black text-white">
                  {initial}
                </span>
                <p className="text-sm font-bold text-[var(--brand-strong)]">{t(`about.${nameKey}`)}</p>
              </div>
              <blockquote className="mt-4 border-l-4 border-emerald-200 pl-4 text-sm italic leading-relaxed text-[var(--text-soft)]">
                "{t(`about.${msgKey}`)}"
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
