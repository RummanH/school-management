import { Facebook, GraduationCap, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { SCHOOL_FB, SCHOOL_YT } from '../constants.js';

const QUICK_LINKS = ['home', 'about', 'admission', 'contact'];
const HREFS = {
  home: '#hero',
  features: '#features',
  about: '#about',
  academics: '#academics',
  admission: '#admission',
  notice: '#notice',
  gallery: '#gallery',
  contact: '#contact',
};

const SCHOOL_ACCESS_LINKS = [
  { key: 'studentPortal', href: '#features' },
  { key: 'admissionProcess', href: '#admission' },
  { key: 'academicStructure', href: '#academics' },
  { key: 'campusGallery', href: '#gallery' },
];

export default function LandingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="relative overflow-hidden bg-[linear-gradient(180deg,#161233_0%,#201b46_55%,#0f172a_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/4 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      </div>

      <div className="landing-container relative z-10 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.7fr_0.7fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black">{t('school.name')}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{t('school.established')}</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/68">{t('footer.description')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={SCHOOL_FB} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/12 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={SCHOOL_YT} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/12 hover:text-white">
                <Youtube className="h-4 w-4" />
              </a>
              <a href={`mailto:${t('contact.email')}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/12 hover:text-white">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{t('footer.quickLinks')}</h4>
            <ul className="mt-4 space-y-3">
              {QUICK_LINKS.map((key) => (
                <li key={key}>
                  <a href={HREFS[key]} className="text-sm text-white/70 transition hover:text-white">
                    {t(`nav.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{t('footer.schoolAccess')}</h4>
            <ul className="mt-4 space-y-3">
              {SCHOOL_ACCESS_LINKS.map((item) => (
                <li key={item.key}>
                  <a href={item.href} className="text-sm text-white/70 transition hover:text-white">
                    {t(`footer.schoolAccessLinks.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{t('footer.contact')}</h4>
            <ul className="mt-4 space-y-4">
              {[
                { icon: MapPin, value: t('contact.address') },
                { icon: Phone, value: t('contact.phone') },
                { icon: Mail, value: t('contact.email') },
              ].map(({ icon: Icon, value }) => (
                <li key={value} className="flex items-start gap-3 text-sm leading-relaxed text-white/68">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/55">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10">
        <div className="landing-container flex flex-col gap-3 py-4 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('footer.bottomNote')}</p>
        </div>
      </div>
    </footer>
  );
}
