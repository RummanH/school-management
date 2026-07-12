import { useState } from 'react';
import {
  BarChart3, Bell, BookOpenCheck, CheckCircle2, CircleDollarSign,
  ClipboardCheck, GraduationCap, LayoutDashboard, ReceiptText, Search,
  Settings, TrendingUp, UserPlus, UsersRound,
} from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';

const VIEWS = [
  {
    key: 'operations',
    icon: LayoutDashboard,
    bars: [68, 82, 74, 91, 88, 78, 94],
    stats: [
      ['students', GraduationCap, 'bg-blue-50 text-blue-600'],
      ['teachers', UsersRound, 'bg-emerald-50 text-emerald-600'],
      ['attendance', ClipboardCheck, 'bg-amber-50 text-amber-600'],
      ['admissions', UserPlus, 'bg-rose-50 text-rose-600'],
    ],
  },
  {
    key: 'academics',
    icon: BookOpenCheck,
    bars: [56, 70, 83, 66, 92, 78, 87],
    stats: [
      ['classes', GraduationCap, 'bg-indigo-50 text-indigo-600'],
      ['exams', ClipboardCheck, 'bg-amber-50 text-amber-600'],
      ['passRate', TrendingUp, 'bg-emerald-50 text-emerald-600'],
      ['lessons', BookOpenCheck, 'bg-blue-50 text-blue-600'],
    ],
  },
  {
    key: 'finance',
    icon: CircleDollarSign,
    bars: [44, 62, 58, 76, 69, 86, 93],
    stats: [
      ['collected', CircleDollarSign, 'bg-emerald-50 text-emerald-600'],
      ['outstanding', ReceiptText, 'bg-rose-50 text-rose-600'],
      ['collectionRate', TrendingUp, 'bg-blue-50 text-blue-600'],
      ['receipts', ReceiptText, 'bg-amber-50 text-amber-600'],
    ],
  },
];

const SIDE_ITEMS = [
  ['overview', LayoutDashboard],
  ['academics', BookOpenCheck],
  ['people', UsersRound],
  ['finance', CircleDollarSign],
  ['reports', BarChart3],
];
const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

export default function DashboardPreviewSection() {
  const { t } = useLanguage();
  const [activeKey, setActiveKey] = useState('operations');
  const view = VIEWS.find((item) => item.key === activeKey) || VIEWS[0];

  return (
    <section aria-labelledby="dashboard-preview-title" className="relative overflow-hidden bg-[#f5f3ed] py-20 sm:py-24">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="landing-container relative">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <p className="brand-chip">{t('preview.eyebrow')}</p>
            <h2 id="dashboard-preview-title" className="mt-4 text-3xl font-black tracking-tight text-[var(--brand-strong)] sm:text-4xl lg:text-5xl">
              {t('preview.title')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">{t('preview.subtitle')}</p>
          </div>
          <div role="tablist" aria-label={t('preview.tabLabel')} className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm lg:w-auto">
            {VIEWS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={key === activeKey}
                onClick={() => setActiveKey(key)}
                className={key === activeKey
                  ? 'flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-3 py-2.5 text-xs font-bold text-white shadow-md sm:px-4 sm:text-sm'
                  : 'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 sm:px-4 sm:text-sm'}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('preview.tabs.' + key)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 rounded-[1.75rem] border border-white/80 bg-white/45 p-2 shadow-[0_35px_100px_rgba(22,18,51,0.20)] ring-1 ring-slate-900/5 sm:mt-12 sm:rounded-[2.25rem] sm:p-3">
          <div className="overflow-hidden rounded-[1.3rem] border border-slate-900/10 bg-white sm:rounded-[1.75rem]">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 sm:h-12 sm:px-5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-3 flex h-7 max-w-sm flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-400 sm:text-[10px]">
                {t('preview.browserUrl')}
              </div>
              <div className="h-5 w-8 rounded-md border border-slate-200 bg-white" />
            </div>

            <div className="flex h-[460px] bg-[#f5f6fa] sm:h-[500px] lg:h-[560px]">
              <aside className="hidden w-48 shrink-0 flex-col bg-[var(--brand-strong)] text-white md:flex lg:w-56">
                <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4 lg:px-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-black leading-none lg:text-xs">{t('preview.productName')}</p>
                    <p className="mt-1 text-[8px] font-medium text-white/40 lg:text-[9px]">{t('preview.panelName')}</p>
                  </div>
                </div>
                <nav className="space-y-1 p-3">
                  {SIDE_ITEMS.map(([key, Icon], index) => (
                    <div key={key} className={index === 0
                      ? 'flex items-center gap-2.5 rounded-xl bg-white/15 px-3 py-2.5 text-[10px] font-bold text-white lg:text-xs'
                      : 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[10px] font-semibold text-white/45 lg:text-xs'}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {t('preview.sidebar.' + key)}
                    </div>
                  ))}
                </nav>
                <div className="mt-auto border-t border-white/10 p-3">
                  <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-[9px] font-black text-[var(--brand-strong)]">
                      {t('preview.adminInitials')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold">{t('preview.adminName')}</p>
                      <p className="text-[8px] text-white/40">{t('preview.adminRole')}</p>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:h-16 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">{t('preview.workspace')}</p>
                    <h3 className="truncate text-xs font-black text-slate-800 sm:text-sm">{t('preview.views.' + view.key + '.title')}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden h-8 w-36 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 lg:flex">
                      <Search className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] text-slate-400">{t('preview.search')}</span>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400"><Bell className="h-3.5 w-3.5" /></span>
                    <span className="hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 sm:flex"><Settings className="h-3.5 w-3.5" /></span>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold text-slate-800 sm:text-xs">{t('preview.views.' + view.key + '.heading')}</p>
                      <p className="mt-0.5 text-[8px] text-slate-400 sm:text-[10px]">{t('preview.views.' + view.key + '.subheading')}</p>
                    </div>
                    <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-bold text-emerald-700 sm:inline-flex">{t('preview.liveStatus')}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 xl:grid-cols-4">
                    {view.stats.map(([key, Icon, tone]) => (
                      <div key={key} className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-3">
                        <div className="flex items-center justify-between">
                          <span className={'flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ' + tone}><Icon className="h-3.5 w-3.5" /></span>
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        </div>
                        <p className="mt-2 text-sm font-black tracking-tight text-slate-800 sm:text-lg">{t('preview.views.' + view.key + '.stats.' + key + '.value')}</p>
                        <p className="truncate text-[8px] font-semibold text-slate-400 sm:text-[9px]">{t('preview.views.' + view.key + '.stats.' + key + '.label')}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-3 sm:mt-4 xl:grid-cols-[1.45fr_0.55fr]">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black text-slate-700 sm:text-[11px]">{t('preview.views.' + view.key + '.chartTitle')}</p>
                          <p className="mt-0.5 text-[8px] text-slate-400 sm:text-[9px]">{t('preview.views.' + view.key + '.chartSubtitle')}</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400 sm:text-[9px]">
                          <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />{t('preview.chartLegend')}
                        </span>
                      </div>
                      <div className="mt-4 flex h-28 items-end gap-2 border-b border-slate-100 sm:h-44 sm:gap-3">
                        {view.bars.map((height, index) => (
                          <div key={DAYS[index]} className="flex h-full flex-1 items-end">
                            <div className="w-full rounded-t-md bg-gradient-to-t from-[var(--brand-strong)] to-[#5b55a2] transition-all duration-500" style={{ height: height + '%' }} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2 sm:gap-3">
                        {DAYS.map((day) => <span key={day} className="flex-1 text-center text-[7px] font-semibold text-slate-400 sm:text-[8px]">{t('preview.days.' + day)}</span>)}
                      </div>
                    </div>

                    <div className="hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:block">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-slate-700">{t('preview.activityTitle')}</p>
                        <span className="text-[9px] font-bold text-[var(--brand)]">{t('preview.viewAll')}</span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {[1, 2, 3].map((item) => (
                          <div key={item} className="flex gap-2.5 rounded-xl bg-slate-50 p-2.5">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-3 w-3" /></span>
                            <div>
                              <p className="text-[9px] font-bold leading-snug text-slate-700">{t('preview.views.' + view.key + '.activity' + item)}</p>
                              <p className="mt-1 text-[8px] text-slate-400">{t('preview.recently')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-7 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/55 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{t('preview.proof' + item)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
