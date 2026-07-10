import { useState } from 'react';
import { GraduationCap, Eye, EyeOff, LogIn } from 'lucide-react';
import { login as apiLogin, requestPasswordReset, confirmPasswordReset } from '../../../services/api/authApi.js';
import { useAuth, navigate } from '../../../app/App.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }


  async function handleResetRequest() {
    setError('');
    setResetMessage('');
    try {
      const result = await requestPasswordReset({ email: form.email });
      setResetToken(result.resetToken || '');
      setResetMessage(result.resetToken ? 'Reset token generated. Use it below to set a new password.' : 'If the account exists, a reset token has been generated.');
    } catch (err) { setError(err.message || 'Could not request password reset.'); }
  }

  async function handleResetConfirm() {
    setError('');
    setResetMessage('');
    try {
      await confirmPasswordReset({ token: resetToken, password: newPassword });
      setResetMessage('Password reset complete. You can sign in now.');
      setNewPassword('');
    } catch (err) { setError(err.message || 'Could not reset password.'); }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(form);
      login(data.user, data.tenant);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--brand-strong)] px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Portal</h1>
          <p className="mt-1 text-sm text-white/60">School Management System</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white">Sign in</h2>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">

            <div>
              <label className="mb-1.5 block text-xs font-bold text-white/70">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="developer@school.local"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-white/70">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-[var(--brand-strong)] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="border-t border-white/10 pt-4">
              <button type="button" onClick={() => setResetOpen((v) => !v)} className="text-xs font-semibold text-white/70 transition hover:text-white">
                Forgot password?
              </button>
              {resetOpen && (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  {resetMessage && <p className="text-xs text-emerald-100">{resetMessage}</p>}
                  <button type="button" onClick={handleResetRequest} className="w-full rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20">
                    Generate Reset Token
                  </button>
                  <input className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/30 outline-none" value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Reset token" />
                  <input type="password" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/30 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                  <button type="button" onClick={handleResetConfirm} className="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-[var(--brand-strong)]">
                    Set New Password
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          <button onClick={() => navigate('/')} className="transition hover:text-white/70">
            ← Back to website
          </button>
        </p>
      </div>
    </div>
  );
}
