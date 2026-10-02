import React from 'react';
import { User, ShieldCheck, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePreferences, useLibrary, useSetAtmosphere } from '../context';
import { resolveCinematicAtmosphere } from '../theme';
import { PersonalNav } from '../components/personal';
import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Badge,
  Tag,
  Button,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const ProfilePage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const { tasteState, profileState, accountPreferences } = usePreferences();
  const { watchlistIds, favouriteIds, historyIds, getFavouriteMovies } = useLibrary();

  // Subtle atmospheric accent derived from the user's primary/dominant genre affinity
  const primaryGenre = tasteState.selectedGenres[0] || null;
  useSetAtmosphere(primaryGenre);
  const atmosphere = resolveCinematicAtmosphere({
    genre: primaryGenre,
    baseTheme: accountPreferences.baseTheme,
  });

  const favouriteMovies = getFavouriteMovies().slice(0, 3);

  // Consider uncalibrated if explicitly empty in simulation or taste discovery not yet completed
  const isUnformed = pageState === 'empty' || !tasteState.isTasteDiscovered;

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          as="h1"
          eyebrow="TASTE IDENTITY & CINEMATIC DNA"
          title="User Profile"
          description="Your curatorial clearance tier, latent taste archetype, and discovery history telemetry."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Personal Sub-Navigation */}
      <PersonalNav />

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

      {isUnformed && pageState !== 'loading' && pageState !== 'error' && (
        <EmptyState
          title="Cinematic DNA Unformed"
          description="Your taste profile is waiting to be discovered. Complete your first Taste Discovery duel to form your cinematic identity."
          action={
            <Link to="/taste-discovery">
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Start Taste Discovery
              </Button>
            </Link>
          }
        />
      )}

      {!isUnformed && pageState === 'populated' && (
        <div className="space-y-8 max-w-4xl font-sans relative">
          {/* Subtle contextual ambient aura bleed based on dominant genre affinity */}
          {primaryGenre && (
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none -z-10 transition-all duration-700 opacity-50"
              style={{ background: atmosphere.gradient.radial }}
              aria-hidden="true"
            />
          )}

          {/* Identity Header Card */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-obsidian-surface border-2 border-luminous-cyan flex items-center justify-center p-1 shadow-cyan-glow shrink-0">
              <User className="w-10 h-10 text-luminous-cyan" aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="font-editorial text-2xl font-bold text-white">
                  {profileState.displayName}
                </h3>
                <Badge variant="teal" size="sm" dot>
                  {profileState.curatorialTier}
                </Badge>
                {tasteState.isTasteDiscovered && (
                  <Badge variant="cyan" size="sm">
                    Calibrated
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Cinematic Archetype: <strong className="text-white">{profileState.archetype}</strong>
              </p>
              <p className="text-xs text-slate-300 italic mb-4 max-w-xl">
                "{profileState.bio}"
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {tasteState.selectedGenres.map((genre) => (
                  <Tag key={genre} label={genre} interactive={false} selected />
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* Personal Telemetry & Library Nodes */}
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
                {watchlistIds.length}
              </span>
            </GlassPanel>
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Adored Favourites
              </span>
              <span className="font-editorial text-3xl font-bold text-luminous-amber">
                {favouriteIds.length}
              </span>
            </GlassPanel>
            <GlassPanel elevation="dim" padding="md" rounded="xl" className="text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Screening History
              </span>
              <span className="font-editorial text-3xl font-bold text-luminous-teal">
                {historyIds.length}
              </span>
            </GlassPanel>
          </div>

          {/* Taste Calibration Matrix (Affinities & Moods) */}
          <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-editorial text-xl font-bold text-white">
                  Active Taste Signals
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Facets and narrative vectors currently shaping your recommendations.
                </p>
              </div>
              <Link to="/preferences/taste">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Refine Taste
                </Button>
              </Link>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/10">
              {/* Moods */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Atmospheric Moods
                </span>
                <div className="flex flex-wrap gap-2">
                  {tasteState.selectedMoods.map((mood) => (
                    <Tag key={mood} label={mood} interactive={false} variant="violet" selected />
                  ))}
                  {tasteState.selectedMoods.length === 0 && (
                    <span className="text-xs text-slate-500 italic">No specific moods prioritized</span>
                  )}
                </div>
              </div>

              {/* Themes */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Thematic Motifs
                </span>
                <div className="flex flex-wrap gap-2">
                  {tasteState.selectedThemes.map((theme) => (
                    <Tag key={theme} label={theme} interactive={false} variant="teal" selected />
                  ))}
                  {tasteState.selectedThemes.length === 0 && (
                    <span className="text-xs text-slate-500 italic">Open to all thematic inquiries</span>
                  )}
                </div>
              </div>

              {/* Pacing & Language Horizon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-obsidian-surface border border-white/5">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-0.5">
                    Viewing Pacing
                  </span>
                  <span className="text-xs text-white font-medium capitalize">
                    {tasteState.pacingPreference} Tempo
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-obsidian-surface border border-white/5">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-0.5">
                    Language Horizon
                  </span>
                  <span className="text-xs text-white font-medium capitalize">
                    {tasteState.selectedLanguage === 'world' ? 'World Cinema (Original Audio)' : 'English Primary'}
                  </span>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Personal Collection Cues (Adored Cinema) */}
          {favouriteMovies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-luminous-amber" aria-hidden="true" />
                  <h4 className="font-editorial text-xl font-bold text-white">
                    Personal Collection Cues
                  </h4>
                </div>
                <Link to="/library/favourites">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View All Favourites
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {favouriteMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Management Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassPanel elevation="plate" padding="md" rounded="xl" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-luminous-cyan shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Recommendation Horizons
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Adjust novelty appetite, era horizons, and diversity.
                  </span>
                </div>
              </div>
              <Link to="/preferences/recommendations" className="shrink-0">
                <Button variant="outline" size="sm">
                  Tune
                </Button>
              </Link>
            </GlassPanel>

            <GlassPanel elevation="plate" padding="md" rounded="xl" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-luminous-teal shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Curatorial Sanctum Assured
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Your vectors are stored locally in active session memory.
                  </span>
                </div>
              </div>
              <Link to="/account" className="shrink-0">
                <Button variant="outline" size="sm">
                  Sanctuary
                </Button>
              </Link>
            </GlassPanel>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ProfilePage;
