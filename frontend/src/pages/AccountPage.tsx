import React, { useState } from 'react';
import { ShieldCheck, Download, Trash2 } from 'lucide-react';

import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Button,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const AccountPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  const handleSave = () => {
    setSessionSaved(true);
    setTimeout(() => setSessionSaved(false), 2000);
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <SectionHeader
          eyebrow="SANCTUARY & CREDENTIALS"
          title="Account & Privacy"
          description="Manage your local discovery profile, privacy boundaries, and vector retention policies."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

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
          {/* Privacy & Sanctuary Controls */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-luminous-teal" />
              <h3 className="font-editorial text-xl font-bold text-white">
                Data Sanctity & Privacy
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Veya Luma is an independent personalized discovery platform. We do not monetize your taste data or sell preference vectors to advertising brokers.
            </p>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-surface border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white block">Anonymous Diagnostic Telemetry</span>
                  <span className="text-[11px] text-slate-400">Share anonymized latency and route diagnostic signals</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsConsent(!analyticsConsent)}
                  aria-pressed={analyticsConsent}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    analyticsConsent ? 'bg-luminous-cyan' : 'bg-obsidian-card'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      analyticsConsent ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* Data Export & Wipe */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
            <h3 className="font-editorial text-xl font-bold text-white mb-1">
              Taste Vector Management
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your calibrated taste profile and viewing history or reset your personal vectors.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleSave}
              >
                {sessionSaved ? 'Export Ready' : 'Export Cinematic DNA (JSON)'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => alert('Taste vectors reset.')}
              >
                Reset Taste Vectors
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </PageContainer>
  );
};

export default AccountPage;
