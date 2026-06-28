import { useState } from 'react';
import { Menu, X, GraduationCap, LogIn } from 'lucide-react';
import { useLanguage, navigate } from '../../../app/App.jsx';

const NAV_KEYS = ['home', 'about', 'academics', 'admission', 'notice', 'gallery', 'contact'];
const NAV_HREFS = {
  home: '#hero',
  about: '#about',
  academics: '#academics',
  admission: '#admission',
  notice: '#notice',
  gallery: '#gallery',
  contact: '#contact',
};

export default function LandingHeader() {
  const { t, language, switchLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-[var(--brand-strong)] shadow-md">
      <div className="landing-container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-base font-black leading-tight">
            {t('school.name')}
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_KEYS.map((key) => (
            <a
              key={key}
              href={NAV_HREFS[key]}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            onClick={() => switchLanguage(language === 'en' ? 'bn' : 'en')}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
          >
            {language === 'en' ? 'বাং' : 'EN'}
          </button>

          {/* Admission CTA */}
          <a
            href="#admission"
            className="hidden rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[var(--brand-strong)] transition hover:bg-emerald-50 sm:inline-flex"
          >
            {t('hero.admissionCta')}
          </a>

          {/* Sign In */}
          <button
            onClick={() => navigate('/login')}
            className="hidden items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/15 sm:flex"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-1.5 text-white transition hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-[var(--brand-strong)] px-4 pb-4 lg:hidden">
          {NAV_KEYS.map((key) => (
            <a
              key={key}
              href={NAV_HREFS[key]}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
          <a
            href="#admission"
            onClick={() => setMenuOpen(false)}
            className="mt-2 block rounded-lg bg-white px-3 py-2.5 text-center text-sm font-bold text-[var(--brand-strong)]"
          >
            {t('hero.admissionCta')}
          </a>
          <button
            onClick={() => { setMenuOpen(false); navigate('/login'); }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-sm font-bold text-white"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </div>
      )}
    </header>
  );
}
