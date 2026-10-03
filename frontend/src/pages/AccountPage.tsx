import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Trash2,
  Sun,
  Moon,
  Check,
  User,
  LogIn,
  LogOut,
  KeyRound,
} from 'lucide-react';

import { usePreferences, useLibrary, useSetAtmosphere, useAuth } from '../context';
import { PersonalNav } from '../components/personal';
import { cn } from '../utils/cn';
import { AuthModal } from '../components/auth/AuthModal';
import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Button,
  Badge,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const AccountPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const { user, isAuthenticated, guestSessionId, logout } = useAuth();

  // Account operates within a clean, neutral sanctuary atmosphere
  useSetAtmosphere(null);

  const {
    tasteState,
    recommendationPreferences,
    profileState,
    accountPreferences,
    updateAccountPreferences,
    resetTastePreferences,
  } = usePreferences();

  const { watchlistIds, favouriteIds, historyIds } = useLibrary();

  const notify = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleExportDNA = () => {
    const exportData = {
      version: '1.0.0-phase1',
      curator: profileState.displayName,
      exportedAt: new Date().toISOString(),
      tasteSignals: tasteState,
      recommendationCalibrations: recommendationPreferences,
      libraryRecords: {
        watchlistIds,
        favouriteIds,
        historyIds,
      },
      accountSettings: accountPreferences,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veya-luma-cinematic-dna-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSessionSaved(true);
    notify('Cinematic DNA exported successfully as JSON.');
    setTimeout(() => setSessionSaved(false), 3000);
  };

  const handleResetVectors = () => {
    resetTastePreferences();
    setResetConfirmed(true);
    notify('Taste vectors successfully reset to baseline.');
    setTimeout(() => setResetConfirmed(false), 3000);
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          as="h1"
          eyebrow="SANCTUARY & CREDENTIALS"
          title="Account & Privacy"
          description="Manage your local discovery profile, privacy boundaries, and vector retention policies."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Personal Sub-Navigation */}
      <PersonalNav />

      {/* Notification Banner */}
      {feedbackMessage && (
        <div
          role="status"
          className="mb-6 p-3 rounded-xl bg-luminous-cyan/15 border border-luminous-cyan/30 text-luminous-cyan text-xs flex items-center gap-2 animate-fadeIn"
        >
          <Check className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {pageState === 'loading' && (
        <LoadingState type="cards" count={2} message="Loading account sanctuary parameters..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Account Settings Unavailable"
          message="Could not load your local account profile settings."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="No Active Profile Record"
          description="Your local session has no persistent account profile configured."
          action={
            <Button size="sm" onClick={() => setPageState('populated')}>
              Create Local Profile
            </Button>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="max-w-3xl space-y-6 font-sans">
          {/* Identity & Session Credentials */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-luminous-cyan/15 border border-luminous-cyan/30 flex items-center justify-center text-luminous-cyan">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-theme-primary leading-tight">
                    Identity & Authentication
                  </h3>
                  <span className="text-[11px] text-theme-muted">
                    PostgreSQL authoritative session and cryptographic identity
                  </span>
                </div>
              </div>
              {isAuthenticated ? (
                <Badge variant="teal" size="sm" dot>
                  Authenticated
                </Badge>
              ) : (
                <Badge variant="amber" size="sm">
                  Guest Exploration
                </Badge>
              )}
            </div>

            {isAuthenticated && user ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-stone-50/90 dark:bg-obsidian-surface border border-stone-200/80 dark:border-white/5">
                  <div>
                    <span className="text-[11px] text-theme-muted uppercase tracking-wider font-semibold block mb-0.5">
                      Email Credential
                    </span>
                    <span className="text-xs font-medium text-theme-primary">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-theme-muted uppercase tracking-wider font-semibold block mb-0.5">
                      Curator Handle
                    </span>
                    <span className="text-xs font-medium text-theme-primary">
                      {user.username || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-theme-muted uppercase tracking-wider font-semibold block mb-0.5">
                      Session Model
                    </span>
                    <span className="text-xs font-medium text-luminous-cyan">
                      Authoritative DB Session (Rotating Refresh)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-theme-muted uppercase tracking-wider font-semibold block mb-0.5">
                      Account Status
                    </span>
                    <span className="text-xs font-medium text-emerald-500">
                      Active &bull; Argon2id Secured
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-theme-muted">
                    Revoking your session invalidates active refresh tokens across this device.
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                    onClick={() => {
                      logout();
                      notify('Session terminated and credentials revoked.');
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                  <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Anonymous Discovery Session Active</span>
                  </div>
                  You are exploring Veya Luma in guest mode. Your taste discoveries, preferences, and watchlist
                  are preserved locally. Creating an account or signing in will reconcile this guest session
                  with your persistent identity.
                </div>

                {guestSessionId && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 text-[11px] font-mono text-slate-400">
                    <span>Session Token:</span>
                    <span className="truncate max-w-[200px]">{guestSessionId}</span>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<LogIn className="w-3.5 h-3.5" />}
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Sign In or Create Account
                  </Button>
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Appearance & Base Theme Settings */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <div>
              <h3 className="font-editorial text-xl font-bold text-theme-primary mb-1">
                Appearance & Theme
              </h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                Choose your cinematic environment. Deep obsidian space is tuned for visual immersion; high-contrast light mode optimizes daylight reading.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  updateAccountPreferences({ baseTheme: 'dark' });
                  notify('Base theme set to Dark (Obsidian Void).');
                }}
                className={cn(
                  'flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all',
                  accountPreferences.baseTheme === 'dark'
                    ? 'bg-stone-900 text-white border-luminous-cyan/40 shadow-cyan-glow'
                    : 'bg-white/80 dark:bg-obsidian-surface border-black/[0.08] dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-black/20 dark:hover:border-white/20 shadow-sm dark:shadow-none'
                )}
                aria-pressed={accountPreferences.baseTheme === 'dark'}
              >
                <div className="w-9 h-9 rounded-lg bg-black/[0.04] dark:bg-obsidian-base border border-black/[0.08] dark:border-white/10 flex items-center justify-center shrink-0 text-slate-700 dark:text-luminous-cyan">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-theme-primary">Dark Theme</span>
                    {accountPreferences.baseTheme === 'dark' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-luminous-cyan/20 text-luminous-cyan border border-luminous-cyan/40">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-theme-muted block leading-tight">
                    Signature Obsidian Void palette with subtle luminous accents.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateAccountPreferences({ baseTheme: 'light' });
                  notify('Base theme set to Light (High-Contrast Editorial).');
                }}
                className={cn(
                  'flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all',
                  accountPreferences.baseTheme === 'light'
                    ? 'bg-white text-theme-primary border-slate-900/50 shadow-[0_2px_14px_rgba(20,23,31,0.08)]'
                    : 'bg-white/80 dark:bg-obsidian-surface border-black/[0.08] dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-black/20 dark:hover:border-white/20 shadow-sm dark:shadow-none'
                )}
                aria-pressed={accountPreferences.baseTheme === 'light'}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-700 dark:text-luminous-amber">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-theme-primary">Light Theme</span>
                    {accountPreferences.baseTheme === 'light' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#12151B] text-white border border-[#12151B]">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-theme-muted block leading-tight">
                    High optical contrast for illuminated viewing environments.
                  </span>
                </div>
              </button>
            </div>
          </GlassPanel>

          {/* Interface & Accessibility Preferences */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <div>
              <h3 className="font-editorial text-xl font-bold text-theme-primary mb-1">
                Interface & Accessibility
              </h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                Fine-tune interaction pacing, motion effects, and catalog presentation density.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/90 dark:bg-obsidian-surface border border-stone-200/80 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div>
                  <span className="text-xs font-semibold text-theme-primary block">Reduced Motion</span>
                  <span className="text-[11px] text-theme-muted">
                    Minimize ambient backdrop transitions and particle effects
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = accountPreferences.motionPreference === 'standard' ? 'reduced' : 'standard';
                    updateAccountPreferences({ motionPreference: next });
                    notify(`Motion preference set to ${next}.`);
                  }}
                  aria-pressed={accountPreferences.motionPreference === 'reduced'}
                  className={cn(
                    'w-11 h-6 flex items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70',
                    accountPreferences.motionPreference === 'reduced'
                      ? 'bg-[#12151B] dark:bg-luminous-cyan'
                      : 'bg-stone-300 dark:bg-obsidian-card'
                  )}
                >
                  <div
                    className={cn(
                      'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform',
                      accountPreferences.motionPreference === 'reduced' ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/90 dark:bg-obsidian-surface border border-stone-200/80 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div>
                  <span className="text-xs font-semibold text-theme-primary block">Compact Shelf Mode</span>
                  <span className="text-[11px] text-theme-muted">
                    Display denser movie card grids across discover and library surfaces
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !accountPreferences.compactMode;
                    updateAccountPreferences({ compactMode: next });
                    notify(`Compact mode ${next ? 'enabled' : 'disabled'}.`);
                  }}
                  aria-pressed={accountPreferences.compactMode}
                  className={cn(
                    'w-11 h-6 flex items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70',
                    accountPreferences.compactMode
                      ? 'bg-[#12151B] dark:bg-luminous-cyan'
                      : 'bg-stone-300 dark:bg-obsidian-card'
                  )}
                >
                  <div
                    className={cn(
                      'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform',
                      accountPreferences.compactMode ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* Privacy & Sanctuary Controls */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-luminous-teal" />
              <h3 className="font-editorial text-xl font-bold text-theme-primary">
                Data Sanctity & Privacy
              </h3>
            </div>
            <p className="text-xs text-theme-muted leading-relaxed mb-4">
              Veya Luma is an independent personalized discovery platform. In Phase 1, all preferences, taste vectors, and library entries are maintained in local development memory. We do not monetize your taste data or sell preference vectors to advertising brokers.
            </p>

            <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/10">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/90 dark:bg-obsidian-surface border border-stone-200/80 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div>
                  <span className="text-xs font-semibold text-theme-primary block">Anonymous Product Telemetry</span>
                  <span className="text-[11px] text-theme-muted">
                    Share anonymized performance and discovery telemetry to refine recommendation horizons
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !accountPreferences.analyticsConsent;
                    updateAccountPreferences({ analyticsConsent: next });
                    notify(`Product telemetry ${next ? 'enabled' : 'disabled'}.`);
                  }}
                  aria-pressed={accountPreferences.analyticsConsent}
                  className={cn(
                    'w-11 h-6 flex items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70',
                    accountPreferences.analyticsConsent
                      ? 'bg-[#12151B] dark:bg-luminous-cyan'
                      : 'bg-stone-300 dark:bg-obsidian-card'
                  )}
                >
                  <div
                    className={cn(
                      'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform',
                      accountPreferences.analyticsConsent ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* Data Export & Wipe */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <h3 className="font-editorial text-xl font-bold text-theme-primary mb-1">
              Taste Vector Management
            </h3>
            <p className="text-xs text-theme-muted leading-relaxed">
              Export your calibrated taste profile and viewing history or reset your personal vectors.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-black/[0.06] dark:border-white/10">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportDNA}
              >
                {sessionSaved ? 'Export Ready' : 'Export Cinematic DNA (JSON)'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleResetVectors}
              >
                {resetConfirmed ? 'Vectors Reset' : 'Reset Taste Vectors'}
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </PageContainer>
  );
};

export default AccountPage;
