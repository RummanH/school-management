import { GraduationCap, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { SCHOOL_ADDRESS, SCHOOL_EMAIL, SCHOOL_PHONE, SCHOOL_FB, SCHOOL_YT } from '../constants.js';

const QUICK_LINKS = ['home', 'features', 'about', 'academics', 'admission', 'notice', 'gallery', 'contact'];
const HREFS = {
  home: '#hero', features: '#features', about: '#about', academics: '#academics', admission: '#admission',
  notice: '#notice', gallery: '#gallery', contact: '#contact',
};

export default function LandingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[var(--brand-strong)] text-white">
      <div className="landing-container py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-lg font-black">{t('school.name')}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">{t('footer.description')}</p>
            <p className="mt-2 text-xs text-white/50">{t('school.established')} · {t('school.eiin')}</p>
            <div className="mt-4 flex gap-3">
              <a href={SCHOOL_FB} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={SCHOOL_YT} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white">
                <Youtube className="h-4 w-4" />
              </a>
              <a href={`mailto:${SCHOOL_EMAIL}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/50">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {QUICK_LINKS.map((key) => (
                <li key={key}>
                  <a href={HREFS[key]} className="text-sm text-white/70 transition hover:text-white">
                    {t(`nav.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/50">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              {[
                { icon: MapPin, value: SCHOOL_ADDRESS },
                { icon: Phone, value: SCHOOL_PHONE },
                { icon: Mail, value: SCHOOL_EMAIL },
              ].map(({ icon: Icon, value }) => (
                <li key={value} className="flex items-start gap-2 text-sm text-white/65">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                  {value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
