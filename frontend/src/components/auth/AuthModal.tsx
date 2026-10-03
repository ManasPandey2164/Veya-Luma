import React, { useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, guestSessionId } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
        setSuccessMsg('Authentication successful. Welcome back.');
      } else {
        await register({
          email,
          password,
          username: username.trim() || undefined,
          display_name: displayName.trim() || undefined,
        });
        setSuccessMsg('Account created successfully. Welcome to Veya Luma.');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication operation failed.';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e1117] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6)] p-6 sm:p-8 font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-luminous-cyan/15 border border-luminous-cyan/30 flex items-center justify-center text-luminous-cyan">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-luminous-cyan font-bold">
            Veya Luma Sanctuary
          </span>
        </div>

        <h2 id="auth-modal-title" className="font-editorial text-2xl font-bold text-white mb-1">
          {mode === 'login' ? 'Sign In to Your Sanctuary' : 'Join the Curatorial Circle'}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {mode === 'login'
            ? 'Access your saved cinematic horizons, library dossiers, and taste vectors.'
            : 'Establish your persistent cinematic identity and reconcile your guest exploration.'}
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex p-1 rounded-xl bg-black/40 border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white/15 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white/15 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Status Alerts */}
        {localError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="flex-1">{localError}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mb-4 p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2.5 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@veyaluma.internal"
              className="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-luminous-cyan/60 focus:ring-1 focus:ring-luminous-cyan/60 transition-all"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label
                  htmlFor="auth-username-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Curator Username <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="auth-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="auteur_explorer"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-luminous-cyan/60 focus:ring-1 focus:ring-luminous-cyan/60 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-display-name-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Display Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="auth-display-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Auteur Explorer"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-luminous-cyan/60 focus:ring-1 focus:ring-luminous-cyan/60 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-password-input"
                className="block text-xs font-medium text-slate-300"
              >
                Password
              </label>
              {mode === 'register' && (
                <span className="text-[10px] text-slate-400">Min. 8 chars, mixed case & numbers</span>
              )}
            </div>
            <input
              id="auth-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-luminous-cyan/60 focus:ring-1 focus:ring-luminous-cyan/60 transition-all"
            />
          </div>

          {/* Guest session reconciliation info */}
          {guestSessionId && (
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-slate-400">
              <span className="text-luminous-cyan font-medium">Guest Reconciliation:</span> Your
              anonymous taste discovery sessions will be automatically linked to this account upon sign in.
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center text-xs font-semibold py-2.5"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === 'login'
                  ? 'Authenticating...'
                  : 'Creating Account...'
                : mode === 'login'
                ? 'Sign In to Account'
                : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
