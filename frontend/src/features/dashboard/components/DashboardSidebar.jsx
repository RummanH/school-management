import { GraduationCap, LayoutDashboard, MessageSquare, Building2, Users, BookOpen, Globe, LogOut, X, BookMarked, Bell, Images, User, UserPlus, BadgeDollarSign, BarChart3 } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';

const SHARED_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Contact Messages', icon: MessageSquare, path: '/dashboard/contacts' },
];

const TENANT_ADMIN_NAV = [
  { label: 'Messages',   icon: MessageSquare, path: '/dashboard/messages' },
  { label: 'Academic',   icon: BookMarked,   path: '/dashboard/academic' },
  { label: 'Teachers',   icon: BookOpen,     path: '/dashboard/teachers' },
  { label: 'Students',   icon: GraduationCap,path: '/dashboard/students' },
  { label: 'Admissions', icon: UserPlus,     path: '/dashboard/admissions' },
  { label: 'Fees',       icon: BadgeDollarSign,path: '/dashboard/fees' },
  { label: 'Reports',    icon: BarChart3,    path: '/dashboard/reports' },
  { label: 'Users',      icon: Users,        path: '/dashboard/users' },
  { label: 'Notices',    icon: Bell,         path: '/dashboard/notices' },
  { label: 'Gallery',    icon: Images,       path: '/dashboard/gallery' },
];

const PLATFORM_NAV = [
  { label: 'Organizations', icon: Building2, path: '/dashboard/tenants' },
  { label: 'All Users',     icon: Users,     path: '/dashboard/users' },
];

// Teachers get academic management here, plus a link back to their portal
// profile (they're the only dashboard role that also has a /portal profile).
const TEACHER_NAV = [
  { label: 'Messages',   icon: MessageSquare, path: '/dashboard/messages' },
  { label: 'Academic',   icon: BookMarked, path: '/dashboard/academic' },
  { label: 'My Profile', icon: User,       path: '/portal' },
];

function panelLabelFor(role) {
  if (role === 'system_developer') return 'Platform Panel';
  if (role === 'teacher') return 'Teacher Panel';
  return 'Admin Panel';
}

export default function DashboardSidebar({ activePath, onClose }) {
  const { logout, currentUser } = useAuth();
  const role = currentUser?.role;
  const isPlatform = role === 'system_developer';

  // system_developer -> full platform nav (orgs + all users)
  // admin -> tenant nav (academic, teachers, students, users, notices, gallery)
  // teacher -> academic management + link to their own portal profile
  // student / guardian never reach this sidebar (they live on /portal)
  let nav;
  if (isPlatform) {
    nav = [...SHARED_NAV, ...PLATFORM_NAV];
  } else if (role === 'admin') {
    nav = [...SHARED_NAV, ...TENANT_ADMIN_NAV];
  } else if (role === 'teacher') {
    nav = [...SHARED_NAV, ...TEACHER_NAV];
  } else {
    nav = SHARED_NAV;
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--brand-strong)] text-white">
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
          <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-white/10" />

      {isPlatform && (
        <p className="mt-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/30">Platform</p>
      )}

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {nav.map(({ label, icon: Icon, path }) => {
          const active = activePath === path || (path !== '/dashboard' && activePath.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => { navigate(path); onClose?.(); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
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

