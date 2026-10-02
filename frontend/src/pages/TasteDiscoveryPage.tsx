import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Compass,
  Film,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  getTasteDiscoverySeedMovies,
  TASTE_GENRES,
  TASTE_MOODS,
  TASTE_THEMES,
  TASTE_VIEWING_PREFERENCES,
} from '../fixtures';
import {
  PageContainer,
  Button,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,

  ErrorState,
} from '../components/ui';
import {
  TasteProgress,
  TasteStepHeader,
  TasteOption,
  TasteNavigation,
} from '../components/taste';
import { resolveCinematicAtmosphere } from '../theme';

export type FlowStage = 'welcome' | 'movies' | 'genres' | 'moods' | 'themes' | 'preferences' | 'complete';

export interface TasteDiscoveryState {
  selectedMovieIds: string[];
  selectedGenres: string[];
  selectedMoods: string[];
  selectedThemes: string[];
  selectedLanguage: string;
  preferredRuntime: string;
  pacingPreference: string;
}

const STEP_INFOS = [
  { number: 1, label: 'Films' },
  { number: 2, label: 'Genres' },
  { number: 3, label: 'Moods' },
  { number: 4, label: 'Themes' },
  { number: 5, label: 'Viewing Horizons' },
];

export const TasteDiscoveryPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const [stage, setStage] = useState<FlowStage>('welcome');
  const navigate = useNavigate();

  // Structured taste state maintained locally during the onboarding flow
  const [tasteState, setTasteState] = useState<TasteDiscoveryState>({
    selectedMovieIds: [],
    selectedGenres: [],
    selectedMoods: [],
    selectedThemes: [],
    selectedLanguage: 'world',
    preferredRuntime: 'any',
    pacingPreference: 'flexible',
  });

  const seedMovies = getTasteDiscoverySeedMovies();

  // Contextual cinematic atmosphere resolved from current genre selection
  const primaryGenre = tasteState.selectedGenres[0] || null;
  const atmosphere = resolveCinematicAtmosphere({ genre: primaryGenre });

  // Selection toggle helpers
  const toggleMovie = (movieId: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedMovieIds: prev.selectedMovieIds.includes(movieId)
        ? prev.selectedMovieIds.filter((id) => id !== movieId)
        : [...prev.selectedMovieIds, movieId],
    }));
  };

  const toggleGenre = (genreLabel: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genreLabel)
        ? prev.selectedGenres.filter((g) => g !== genreLabel)
        : [...prev.selectedGenres, genreLabel],
    }));
  };

  const toggleMood = (moodLabel: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedMoods: prev.selectedMoods.includes(moodLabel)
        ? prev.selectedMoods.filter((m) => m !== moodLabel)
        : [...prev.selectedMoods, moodLabel],
    }));
  };

  const toggleTheme = (themeLabel: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedThemes: prev.selectedThemes.includes(themeLabel)
        ? prev.selectedThemes.filter((t) => t !== themeLabel)
        : [...prev.selectedThemes, themeLabel],
    }));
  };

  const setLanguage = (id: string) => {
    setTasteState((prev) => ({ ...prev, selectedLanguage: id }));
  };

  const setRuntime = (id: string) => {
    setTasteState((prev) => ({ ...prev, preferredRuntime: id }));
  };

  const setPacing = (id: string) => {
    setTasteState((prev) => ({ ...prev, pacingPreference: id }));
  };

  const handleReset = () => {
    setTasteState({
      selectedMovieIds: [],
      selectedGenres: [],
      selectedMoods: [],
      selectedThemes: [],
      selectedLanguage: 'world',
      preferredRuntime: 'any',
      pacingPreference: 'flexible',
    });
    setStage('welcome');
  };

  // Determine current numeric step for progress indicator
  const getStepNumber = (): number => {
    switch (stage) {
      case 'movies':
        return 1;
      case 'genres':
        return 2;
      case 'moods':
        return 3;
      case 'themes':
        return 4;
      case 'preferences':
        return 5;
      default:
        return 1;
    }
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      {/* Dev Mode Simulation State Selector */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-telemetry text-luminous-cyan uppercase tracking-wider text-xs font-semibold">
          Taste Discovery Experience
        </span>
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {pageState === 'loading' && (
        <LoadingState type="spinner" message="Preparing informative pairwise duel candidates..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Taste Calibration Interrupted"
          message="Could not load the next comparison pair. Re-establishing connection to taste vector engine."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="Taste Profile Fully Calibrated"
          description="Your current taste vectors are calibrated and stable. You can explore your recommendations or reset calibration."
          action={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  handleReset();
                  setPageState('populated');
                }}
              >
                Recalibrate
              </Button>
              <Button
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/discover')}
              >
                Explore Discover
              </Button>
            </div>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="w-full relative">
          {/* Subtle contextual ambient atmosphere bleed based on selected genre */}
          {primaryGenre && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none -z-10 transition-all duration-700 opacity-60"
              style={{ background: atmosphere.gradient.radial }}
              aria-hidden="true"
            />
          )}

          {/* ========================================================================= */}
          {/* STAGE 1: WELCOME SCREEN                                                   */}
          {/* ========================================================================= */}
          {stage === 'welcome' && (
            <div className="max-w-3xl mx-auto py-8 sm:py-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-luminous-cyan/10 border border-luminous-cyan/30 flex items-center justify-center mb-6 shadow-cyan-glow">
                <Sparkles className="w-8 h-8 text-luminous-cyan" />
              </div>

              <span className="text-telemetry text-luminous-cyan uppercase tracking-wider text-xs font-semibold mb-3">
                Cinematic Onboarding
              </span>

              <h1 className="font-editorial text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
                Tell Veya Luma what feels like you.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-sans max-w-xl leading-relaxed mb-10">
                A few instinctive choices will help shape future recommendations without locking you into rigid genres. Pick films you know, moods you seek, and stories that stay with you.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => setStage('movies')}
                  className="w-full sm:w-auto font-semibold px-8 shadow-cyan-glow"
                >
                  Start discovering
                </Button>

                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => navigate('/discover')}
                  className="w-full sm:w-auto text-slate-400 hover:text-white"
                >
                  Skip setup & explore
                </Button>
              </div>

              {/* Guiding Principles Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
                <div className="p-4 rounded-xl bg-obsidian-surface/60 border border-white/5">
                  <Film className="w-4 h-4 text-luminous-cyan mb-2" />
                  <h2 className="text-xs font-semibold text-white mb-1">Cinematic Anchors</h2>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Identify recognizable works you resonate with across eras and aesthetic traditions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-surface/60 border border-white/5">
                  <Compass className="w-4 h-4 text-secondary mb-2" />
                  <h2 className="text-xs font-semibold text-white mb-1">Atmospheric Tones</h2>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Focus on visceral emotional states and tempo rather than sterile database tags.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-surface/60 border border-white/5">
                  <Layers className="w-4 h-4 text-accent-teal mb-2" />
                  <h2 className="text-xs font-semibold text-white mb-1">Adaptive Elicitation</h2>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Unseen titles are never treated as negative signals; your taste remains open to wonder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PROGRESS INDICATOR (For active selection steps 1-5)                       */}
          {/* ========================================================================= */}
          {stage !== 'welcome' && stage !== 'complete' && (
            <TasteProgress
              currentStep={getStepNumber()}
              totalSteps={5}
              steps={STEP_INFOS}
            />
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: PICK MOVIES                                                      */}
          {/* ========================================================================= */}
          {stage === 'movies' && (
            <div className="max-w-5xl mx-auto">
              <TasteStepHeader
                eyebrow="Step 1 of 5 • Cinematic Anchors"
                title="Which of these would you watch?"
                description="Select recognizable films you have seen and appreciated, or whose atmosphere calls to you. Multiple selections welcome."
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 mb-4">
                {seedMovies.map((movie) => {
                  const isSelected = tasteState.selectedMovieIds.includes(movie.id);

                  return (
                    <div key={movie.id} className="relative">
                      <MovieCard
                        movie={movie}
                        isSelected={isSelected}
                        onClick={() => toggleMovie(movie.id)}
                      />
                    </div>
                  );
                })}
              </div>

              <TasteNavigation
                onBack={() => setStage('welcome')}
                onNext={() => setStage('genres')}
                onSkip={() => setStage('genres')}
                nextText="Continue to Genres"
                selectedCount={tasteState.selectedMovieIds.length}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: PICK GENRES                                                      */}
          {/* ========================================================================= */}
          {stage === 'genres' && (
            <div className="max-w-4xl mx-auto">
              <TasteStepHeader
                eyebrow="Step 2 of 5 • Narrative Traditions"
                title="Which genres resonate most with you?"
                description="Select the narrative worlds and storytelling traditions you naturally gravitate toward."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {TASTE_GENRES.map((genre) => (
                  <TasteOption
                    key={genre.id}
                    label={genre.label}
                    description={genre.description}
                    selected={tasteState.selectedGenres.includes(genre.label)}
                    onToggle={() => toggleGenre(genre.label)}
                    variant="cyan"
                  />
                ))}
              </div>

              <TasteNavigation
                onBack={() => setStage('movies')}
                onNext={() => setStage('moods')}
                onSkip={() => setStage('moods')}
                nextText="Continue to Moods"
                selectedCount={tasteState.selectedGenres.length}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: PICK MOODS                                                       */}
          {/* ========================================================================= */}
          {stage === 'moods' && (
            <div className="max-w-4xl mx-auto">
              <TasteStepHeader
                eyebrow="Step 3 of 5 • Emotional Atmosphere"
                title="What emotional atmosphere do you seek?"
                description="Select the feelings, tones, and sensory rhythms you want your cinema to evoke."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {TASTE_MOODS.map((mood) => (
                  <TasteOption
                    key={mood.id}
                    label={mood.label}
                    description={mood.description}
                    selected={tasteState.selectedMoods.includes(mood.label)}
                    onToggle={() => toggleMood(mood.label)}
                    variant="violet"
                  />
                ))}
              </div>

              <TasteNavigation
                onBack={() => setStage('genres')}
                onNext={() => setStage('themes')}
                onSkip={() => setStage('themes')}
                nextText="Continue to Themes"
                selectedCount={tasteState.selectedMoods.length}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 5: PICK THEMES                                                      */}
          {/* ========================================================================= */}
          {stage === 'themes' && (
            <div className="max-w-4xl mx-auto">
              <TasteStepHeader
                eyebrow="Step 4 of 5 • Intellectual Motifs"
                title="Which themes and motifs captivate you?"
                description="Explore the human situations, philosophical conflicts, and existential motifs that elevate cinema."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {TASTE_THEMES.map((theme) => (
                  <TasteOption
                    key={theme.id}
                    label={theme.label}
                    description={theme.description}
                    selected={tasteState.selectedThemes.includes(theme.label)}
                    onToggle={() => toggleTheme(theme.label)}
                    variant="amber"
                  />
                ))}
              </div>

              <TasteNavigation
                onBack={() => setStage('moods')}
                onNext={() => setStage('preferences')}
                onSkip={() => setStage('preferences')}
                nextText="Continue to Preferences"
                selectedCount={tasteState.selectedThemes.length}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 6: VIEWING PREFERENCES                                              */}
          {/* ========================================================================= */}
          {stage === 'preferences' && (
            <div className="max-w-4xl mx-auto">
              <TasteStepHeader
                eyebrow="Step 5 of 5 • Viewing Horizons"
                title="Fine-tune your viewing horizons."
                description="Lightweight constraints to ensure recommendations fit your rhythm, duration tolerance, and language openness."
              />

              <div className="space-y-8">
                {/* Languages Horizon */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-sans">
                    Language & World Cinema Horizon
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TASTE_VIEWING_PREFERENCES.languages.map((lang) => (
                      <TasteOption
                        key={lang.id}
                        label={lang.label}
                        description={lang.description}
                        selected={tasteState.selectedLanguage === lang.id}
                        onToggle={() => setLanguage(lang.id)}
                        size="sm"
                        variant="cyan"
                      />
                    ))}
                  </div>
                </div>

                {/* Duration Horizon */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-sans">
                    Runtime Duration Preference
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TASTE_VIEWING_PREFERENCES.runtimes.map((rt) => (
                      <TasteOption
                        key={rt.id}
                        label={rt.label}
                        description={rt.description}
                        selected={tasteState.preferredRuntime === rt.id}
                        onToggle={() => setRuntime(rt.id)}
                        size="sm"
                        variant="violet"
                      />
                    ))}
                  </div>
                </div>

                {/* Pacing Horizon */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-sans">
                    Pacing & Narrative Tempo
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TASTE_VIEWING_PREFERENCES.pacing.map((pc) => (
                      <TasteOption
                        key={pc.id}
                        label={pc.label}
                        description={pc.description}
                        selected={tasteState.pacingPreference === pc.id}
                        onToggle={() => setPacing(pc.id)}
                        size="sm"
                        variant="amber"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <TasteNavigation
                onBack={() => setStage('themes')}
                onNext={() => setStage('complete')}
                nextText="Finish Discovery"
                isLastStep
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 7: COMPLETION SCREEN                                                */}
          {/* ========================================================================= */}
          {stage === 'complete' && (
            <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-luminous-cyan/10 border border-luminous-cyan/40 flex items-center justify-center mb-6 shadow-cyan-glow">
                <CheckCircle2 className="w-8 h-8 text-luminous-cyan stroke-[2.2]" />
              </div>

              <span className="text-telemetry text-luminous-cyan uppercase tracking-wider text-xs font-semibold mb-2">
                Discovery Profile Assembled
              </span>

              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
                Your taste is taking shape.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-sans max-w-lg leading-relaxed mb-8">
                We've captured your initial cinematic anchors, atmospheric moods, and thematic vectors. Your discovery experience will now reflect these foundations.
              </p>

              {/* Summary Dossier Card */}
              <div className="w-full text-left p-6 rounded-2xl bg-obsidian-surface/80 border border-white/10 mb-8 space-y-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans border-b border-white/10 pb-2">
                  Captured Discovery Signals
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-slate-400 block mb-1">Film Anchors:</span>
                    <span className="text-white font-medium">
                      {tasteState.selectedMovieIds.length > 0
                        ? `${tasteState.selectedMovieIds.length} ${
                            tasteState.selectedMovieIds.length === 1 ? 'film' : 'films'
                          } selected`
                        : 'No specific anchors chosen'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Preferred Genres:</span>
                    <span className="text-white font-medium">
                      {tasteState.selectedGenres.length > 0
                        ? tasteState.selectedGenres.join(', ')
                        : 'Open to all genres'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Atmospheric Moods:</span>
                    <span className="text-white font-medium">
                      {tasteState.selectedMoods.length > 0
                        ? tasteState.selectedMoods.join(', ')
                        : 'Diverse emotional horizons'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Thematic Focus:</span>
                    <span className="text-white font-medium">
                      {tasteState.selectedThemes.length > 0
                        ? tasteState.selectedThemes.join(', ')
                        : 'Broad exploratory range'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                <Button
                  size="lg"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => navigate('/discover')}
                  className="w-full sm:w-auto font-semibold px-8 shadow-cyan-glow"
                >
                  Explore Veya Luma
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={handleReset}
                  className="w-full sm:w-auto text-slate-300"
                >
                  Reset & Refine Taste
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default TasteDiscoveryPage;
