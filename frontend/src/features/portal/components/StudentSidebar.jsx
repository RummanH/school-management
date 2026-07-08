import { GraduationCap, LayoutDashboard, Award, Users, Calendar, Bell, User, FileText, MessageSquare, BadgeDollarSign, Globe, LogOut, X } from 'lucide-react';
import { useAuth, navigate } from '../../../app/App.jsx';

const NAV = [
  { label: 'Overview',   icon: LayoutDashboard, path: '/portal' },
  { label: 'Results',    icon: Award,           path: '/portal/results' },
  { label: 'Attendance', icon: Users,           path: '/portal/attendance' },
  { label: 'Routine',    icon: Calendar,        path: '/portal/routine' },
  { label: 'Notices',    icon: Bell,            path: '/portal/notices' },
  { label: 'Messages',   icon: MessageSquare,   path: '/portal/messages' },
  { label: 'Fees',       icon: BadgeDollarSign,path: '/portal/fees' },
  { label: 'Documents',  icon: FileText,       path: '/portal/documents' },
  { label: 'My Profile', icon: User,            path: '/portal/profile' },
];

export default function StudentSidebar({ activePath, onClose }) {
  const { logout, currentUser } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--brand-strong)] text-white">
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black leading-none">Student Panel</p>
            <p className="mt-0.5 truncate text-[10px] text-white/50">{currentUser?.name}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-white/10" />

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV.map(({ label, icon: Icon, path }) => {
          const active = activePath === path;
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

