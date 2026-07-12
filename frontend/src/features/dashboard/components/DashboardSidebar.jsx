import { GraduationCap, LayoutDashboard, MessageSquare, Building2, Users, BookOpen, BriefcaseBusiness, Globe, LogOut, X, BookMarked, Bell, Images, User, UserPlus, BadgeDollarSign, BarChart3, ShieldCheck, Mail, FileText } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';

// Nav is grouped into sections so the sidebar reads as related clusters
// instead of one long undifferentiated stack. A group with `label: null`
// renders its items with no header (used for the single always-visible
// Dashboard link).
const ADMIN_NAV_GROUPS = [
  { label: null, items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  ]},
  { label: 'Academic', items: [
    { label: 'Academic',   icon: BookMarked,    path: '/dashboard/academic' },
    { label: 'Students',   icon: GraduationCap, path: '/dashboard/students' },
    { label: 'Teachers',   icon: BookOpen,      path: '/dashboard/teachers' },
    { label: 'Admissions', icon: UserPlus,      path: '/dashboard/admissions' },
    { label: 'Documents',  icon: FileText,      path: '/dashboard/documents' },
  ]},
  { label: 'Finance & HR', items: [
    { label: 'Fees',      icon: BadgeDollarSign,   path: '/dashboard/fees' },
    { label: 'HR & Staff', icon: BriefcaseBusiness, path: '/dashboard/hr' },
  ]},
  { label: 'Communication', items: [
    { label: 'Messages',         icon: MessageSquare, path: '/dashboard/messages' },
    { label: 'Notices',          icon: Bell,           path: '/dashboard/notices' },
    { label: 'Gallery',          icon: Images,         path: '/dashboard/gallery' },
    { label: 'Contact Messages', icon: Mail,           path: '/dashboard/contacts' },
  ]},
  { label: 'Administration', items: [
    { label: 'Users',    icon: Users,       path: '/dashboard/users' },
    { label: 'Reports',  icon: BarChart3,   path: '/dashboard/reports' },
    { label: 'Security', icon: ShieldCheck, path: '/dashboard/security' },
  ]},
];

const PLATFORM_NAV_GROUPS = [
  { label: null, items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Contact Messages', icon: Mail, path: '/dashboard/contacts' },
  ]},
  { label: 'Platform', items: [
    { label: 'Organizations', icon: Building2,   path: '/dashboard/tenants' },
    { label: 'All Users',     icon: Users,       path: '/dashboard/users' },
    { label: 'Security',      icon: ShieldCheck, path: '/dashboard/security' },
  ]},
];

// Accountants only get the finance side of the admin nav — fees/accounting
// plus payroll (via HR & Staff, gated server-side to payroll-only for them).
const ACCOUNTANT_NAV_GROUPS = [
  { label: null, items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Messages',  icon: MessageSquare,   path: '/dashboard/messages' },
  ]},
  { label: 'Finance & HR', items: [
    { label: 'Fees',      icon: BadgeDollarSign,   path: '/dashboard/fees' },
    { label: 'HR & Staff', icon: BriefcaseBusiness, path: '/dashboard/hr' },
    { label: 'Documents', icon: FileText,          path: '/dashboard/documents' },
  ]},
];

// Teachers get academic management here, plus a link back to their portal
// profile (they're the only dashboard role that also has a /portal profile).
const TEACHER_NAV_GROUPS = [
  { label: null, items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Contact Messages', icon: Mail, path: '/dashboard/contacts' },
  ]},
  { label: 'Academic', items: [
    { label: 'Academic',  icon: BookMarked,    path: '/dashboard/academic' },
    { label: 'Messages',  icon: MessageSquare, path: '/dashboard/messages' },
    { label: 'Documents', icon: FileText,      path: '/dashboard/documents' },
  ]},
  { label: null, items: [
    { label: 'My Profile', icon: User, path: '/portal' },
  ]},
];

function panelLabelFor(role) {
  if (role === 'system_developer') return 'Platform Panel';
  if (role === 'teacher') return 'Teacher Panel';
  if (role === 'accountant') return 'Accountant Panel';
  return 'Admin Panel';
}

export default function DashboardSidebar({ activePath, onClose }) {
  const { logout, currentUser } = useAuth();
  const role = currentUser?.role;

  // system_developer -> platform nav (orgs + all users)
  // admin -> tenant nav (academic, finance/hr, communication, administration)
  // teacher -> academic management + link to their own portal profile
  // student / guardian never reach this sidebar (they live on /portal)
  let groups;
  if (role === 'system_developer') groups = PLATFORM_NAV_GROUPS;
  else if (role === 'admin') groups = ADMIN_NAV_GROUPS;
  else if (role === 'accountant') groups = ACCOUNTANT_NAV_GROUPS;
  else if (role === 'teacher') groups = TEACHER_NAV_GROUPS;
  else groups = [{ label: null, items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }] }];

  return (
    <aside className="flex h-full min-h-0 w-64 flex-col overflow-hidden bg-[var(--brand-strong)] text-white">
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black leading-none">{panelLabelFor(role)}</p>
            <p className="mt-0.5 text-[10px] text-white/50 capitalize">{currentUser?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/50 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-white/10" />

      {/* Nav */}
      <nav className="premium-scrollbar mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-3">
        {groups.map((group, i) => (
          <div key={group.label || `group-${i}`} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest text-white/30">{group.label}</p>
            )}
            {group.items.map(({ label, icon: Icon, path }) => {
              const active = activePath === path || (path !== '/dashboard' && activePath.startsWith(path));
              return (
                <button
                  key={path}
                  onClick={() => { navigate(path); onClose?.(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        <button
          onClick={() => { navigate('/'); onClose?.(); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Globe className="h-4 w-4 shrink-0" />
          View Website
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-red-500/20 hover:text-red-300"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

