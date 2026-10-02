import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Badge,
  Tag,
  Button,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const ProfilePage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <SectionHeader
          eyebrow="TASTE IDENTITY & CINEMATIC DNA"
          title="User Profile"
          description="Your curatorial clearance tier, latent taste archetype, and discovery history telemetry."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {pageState === 'loading' && (
        <LoadingState type="cards" count={3} message="Analyzing cinematic DNA vectors..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Profile Readout Interrupted"
          message="Unable to decode your latent taste matrix. Please retry."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="Cinematic DNA Unformed"
          description="You haven't calibrated your taste profile yet. Run your first Taste Discovery duel to form your cinematic identity."
          action={
            <Link to="/taste-discovery">
              <Button size="sm">Start Taste Discovery</Button>
            </Link>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="space-y-8 max-w-4xl font-sans">
          {/* Identity Header Card */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-obsidian-surface border-2 border-luminous-cyan flex items-center justify-center p-1 shadow-cyan-glow shrink-0">
              <User className="w-10 h-10 text-luminous-cyan" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="font-editorial text-2xl font-bold text-white">
                  Curator 0x2A9F
                </h3>
                <Badge variant="teal" size="sm" dot>
                  Curatorial Level I
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Cinematic Archetype: <strong className="text-white">Atmospheric Speculative Explorer</strong>
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <Tag label="Non-Linear Narrative" interactive={false} selected />
                <Tag label="Nocturnal Synth-Noir" interactive={false} selected />
                <Tag label="Philosophical Sci-Fi" interactive={false} selected />
              </div>
            </div>
          </GlassPanel>

          {/* Telemetry Stat Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Calibrated Duels
              </span>
              <span className="font-editorial text-3xl font-bold text-white">
                12
              </span>
            </GlassPanel>
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Saved to Watchlist
              </span>
              <span className="font-editorial text-3xl font-bold text-luminous-cyan">
                24
              </span>
            </GlassPanel>
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Adored Favourites
              </span>
              <span className="font-editorial text-3xl font-bold text-luminous-amber">
                8
              </span>
            </GlassPanel>
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Vector Confidence
              </span>
              <span className="font-editorial text-3xl font-bold text-luminous-teal">
                94%
              </span>
            </GlassPanel>
          </div>

          {/* Curatorial Principles Callout */}
          <GlassPanel elevation="plate" padding="md" rounded="xl" className="border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-luminous-teal shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Curatorial Sanctum Assured
                </span>
                <span className="text-[11px] text-slate-400">
                  Your taste vectors are stored privately and used exclusively for your personalized discovery.
                </span>
              </div>
            </div>
            <Link to="/preferences" className="shrink-0">
              <Button variant="outline" size="sm">
                Fine-tune
              </Button>
            </Link>
          </GlassPanel>
        </div>
      )}
    </PageContainer>
  );
};

export default ProfilePage;
