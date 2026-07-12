import { Menu } from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import Avatar from '../../../components/Avatar.jsx';

export default function DashboardHeader({ title, onMenuClick }) {
  const { currentUser, currentTenant } = useAuth();

  const roleLabel = currentUser?.role?.replace(/_/g, ' ') ?? '';

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800">{title}</h1>
          {currentTenant && (
            <p className="text-[10px] text-slate-400">{currentTenant.name}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar name={currentUser?.name} photoUrl={currentUser?.photoUrl} size="h-8 w-8" textSize="text-xs" tone="bg-[var(--brand)] text-white" />
        <div className="hidden sm:block">
          <p className="text-xs font-bold text-slate-700 leading-none">{currentUser?.name}</p>
          <p className="mt-0.5 text-[10px] text-slate-400 capitalize">{roleLabel}</p>
        </div>
      </div>
    </header>
  );
}
