import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    setState({
      title: opts.title || 'Are you sure?',
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || 'Confirm',
      cancelLabel: opts.cancelLabel || 'Cancel',
      danger: opts.danger !== false,
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result) => {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => close(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${state.danger ? 'bg-rose-50 text-rose-600' : 'bg-[var(--secondary-soft)] text-[var(--secondary-strong)]'}`}>
              {state.danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">{state.title}</h3>
            {state.message && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{state.message}</p>}
            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" className="btn-secondary" onClick={() => close(false)}>{state.cancelLabel}</button>
              <button type="button" className={state.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)} autoFocus>{state.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
