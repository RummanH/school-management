import { ArrowUpRight, Facebook, GraduationCap, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { SCHOOL_ADDRESS, SCHOOL_EMAIL, SCHOOL_PHONE, SCHOOL_FB, SCHOOL_YT } from '../constants.js';

const QUICK_LINKS = ['home', 'features', 'about', 'academics', 'admission', 'notice', 'gallery', 'contact'];
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

const PROGRAM_LINKS = [
  { label: 'Student Portal', href: '#features' },
  { label: 'Admission Process', href: '#admission' },
  { label: 'Academic Structure', href: '#academics' },
  { label: 'Campus Gallery', href: '#gallery' },
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
        <div className="rounded-[2rem] border border-white/10 bg-white/6 px-6 py-8 backdrop-blur-sm sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/70">Admissions open</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Build a stronger school journey with a campus that feels modern from day one.</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/68 sm:text-base">Bring admissions, communication, fees, notices, and academic visibility into one reliable experience for students, staff, and families.</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0 lg:justify-end">
            <a href="#admission" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[var(--brand-strong)] transition hover:-translate-y-0.5">
              Start Admission
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-bold text-white/85 backdrop-blur-sm transition hover:bg-white/12 hover:text-white">
              Contact School
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.7fr_0.7fr_0.9fr]">
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
              <a href={`mailto:${SCHOOL_EMAIL}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/12 hover:text-white">
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
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">School Access</h4>
            <ul className="mt-4 space-y-3">
              {PROGRAM_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-white/70 transition hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{t('footer.contact')}</h4>
            <ul className="mt-4 space-y-4">
              {[
                { icon: MapPin, value: SCHOOL_ADDRESS },
                { icon: Phone, value: SCHOOL_PHONE },
                { icon: Mail, value: SCHOOL_EMAIL },
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
          <p>Designed for modern school communication, operations, and family trust.</p>
        </div>
      </div>
    </footer>
  );
}
