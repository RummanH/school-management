import { useState } from 'react';
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Languages, ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';

const FAQ_ITEMS = [1, 2, 3, 4, 5, 6];

export default function FaqDemoSection() {
  const { t } = useLanguage();
  const [openItem, setOpenItem] = useState(1);

  function scrollToContact() {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="landing-container">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="brand-chip">{t('faq.eyebrow')}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--brand-strong)] sm:text-4xl">{t('faq.title')}</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-soft)]">{t('faq.subtitle')}</p>
            <button type="button" onClick={scrollToContact} className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:gap-3">
              {t('faq.askMore')}<ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openItem === item;
              return (
                <div key={item}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={'faq-answer-' + item}
                    onClick={() => setOpenItem(isOpen ? null : item)}
                    className="flex w-full items-center justify-between gap-5 py-5 text-left sm:py-6"
                  >
                    <span className={isOpen
                      ? 'text-base font-black text-[var(--brand-strong)] sm:text-lg'
                      : 'text-base font-bold text-slate-700 sm:text-lg'}>
                      {t('faq.item' + item + '.question')}
                    </span>
                    <span className={isOpen
                      ? 'flex h-8 w-8 shrink-0 rotate-180 items-center justify-center rounded-full bg-[var(--brand-strong)] text-white transition'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition'}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div id={'faq-answer-' + item} className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                      {t('faq.item' + item + '.answer')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-20 overflow-hidden rounded-[2rem] bg-[var(--brand-strong)] px-6 py-10 text-white shadow-[0_35px_90px_rgba(22,18,51,0.25)] sm:px-10 sm:py-12 lg:px-14">
          <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#5b55a2]/45 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-amber-200">
                <CalendarDays className="h-3.5 w-3.5" />{t('demo.eyebrow')}
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{t('demo.title')}</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">{t('demo.subtitle')}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={scrollToContact} className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-[var(--brand-strong)] shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-200">
                  {t('demo.primaryCta')}<ArrowRight className="h-4 w-4" />
                </button>
                <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  {t('demo.secondaryCta')}
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-white/45">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />{t('demo.proof1')}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />{t('demo.proof2')}</span>
                <span className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-emerald-300" />{t('demo.proof3')}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{t('demo.processLabel')}</p>
              <div className="mt-5 space-y-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.05] p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-xs font-black text-[var(--brand-strong)]">{t('demo.step' + step + 'Number')}</span>
                    <div>
                      <p className="text-sm font-black text-white">{t('demo.step' + step + 'Title')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">{t('demo.step' + step + 'Text')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
