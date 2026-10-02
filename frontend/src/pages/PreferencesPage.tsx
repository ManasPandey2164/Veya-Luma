import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  RotateCcw,
  Check,
  Film,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

import { usePreferences, useSetAtmosphere } from '../context';
import {
  TASTE_GENRES,
  TASTE_MOODS,
  TASTE_THEMES,
  TASTE_VIEWING_PREFERENCES,
  getMovieFixtureById,
  getTasteDiscoverySeedMovies,
} from '../fixtures';
import { PersonalNav } from '../components/personal';
import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Tag,
  Button,
  Badge,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export interface PreferencesPageProps {
  tab?: 'taste' | 'recommendations';
}

export const PreferencesPage: React.FC<PreferencesPageProps> = ({ tab }) => {
  const [pageState, setPageState] = usePageState('populated');
  const location = useLocation();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Preferences operates in a clean, neutral curatorial atmosphere
  useSetAtmosphere(null);

  const {
    tasteState,
    recommendationPreferences,
    toggleGenre,
    toggleMood,
    toggleTheme,
    toggleAnchorMovie,
    setLanguage,
    updateRecommendationPreferences,
    resetTastePreferences,
    resetRecommendationPreferences,
  } = usePreferences();

  // Determine active tab from prop or route path
  const isRecsRoute = location.pathname.includes('/recommendations');
  const activeTab = tab || (isRecsRoute ? 'recommendations' : 'taste');

  const showNotification = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleResetTaste = () => {
    resetTastePreferences();
    showNotification('Taste signals restored to baseline.');
  };

  const handleResetRecs = () => {
    resetRecommendationPreferences();
    showNotification('Recommendation horizons restored to baseline.');
  };

  // Resolve anchored movies
  const anchoredMovies = tasteState.selectedMovieIds
    .map(getMovieFixtureById)
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // Available seed films that are not yet anchored
  const seedMovies = getTasteDiscoverySeedMovies().filter(
    (m) => !tasteState.selectedMovieIds.includes(m.id)
  );

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          as="h1"
          eyebrow="TASTE CALIBRATION & CONTROLS"
          title="Discovery Preferences"
          description="Adjust the explicit facets and algorithmic tuning dials governing your cinematic recommendations."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Personal Sub-Navigation */}
      <PersonalNav />

      {/* Interactive Sub-route Tab Indicator */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-8 font-sans">
        <Link
          to="/preferences/taste"
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'taste'
              ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Taste Preferences
        </Link>
        <Link
          to="/preferences/recommendations"
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'recommendations'
              ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Recommendation Calibration
        </Link>
      </div>

      {/* Temporary Feedback Notification */}
      {saveMessage && (
        <div
          role="status"
          className="mb-6 p-3 rounded-xl bg-luminous-cyan/15 border border-luminous-cyan/30 text-luminous-cyan text-xs flex items-center gap-2 animate-fadeIn"
        >
          <Check className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {pageState === 'loading' && (
        <LoadingState type="cards" count={3} message="Retrieving calibrated preference profiles..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Preference Vector Synchronization Failed"
          message="Could not load preference calibration data from local storage."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="No Custom Preferences Recorded"
          description="You are currently discovering cinema with default curatorial baselines."
          action={
            <Button size="sm" onClick={() => setPageState('populated')}>
              Initialize Custom Profile
            </Button>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="max-w-4xl space-y-8 font-sans">
          {/* ========================================================================= */}
          {/* TAB 1: TASTE PREFERENCES                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'taste' ? (
            <div className="space-y-6">
              {/* Reset / Actions Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Modifications instantly update in-memory candidate scoring and recommendation filters.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/taste-discovery">
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Recalibrate via Taste Discovery
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={handleResetTaste}
                  >
                    Reset to Baseline
                  </Button>
                </div>
              </div>

              {/* 1. Active Genre Affinities */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-editorial text-xl font-bold text-white">
                    Active Genre Affinities
                  </h3>
                  <Badge variant="cyan" size="sm">
                    {tasteState.selectedGenres.length} Selected
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Select themes and cinematic formats you want emphasized in candidate retrieval.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {TASTE_GENRES.map((g) => {
                    const isSelected = tasteState.selectedGenres.includes(g.label);
                    return (
                      <Tag
                        key={g.id}
                        label={g.label}
                        interactive
                        selected={isSelected}
                        onToggle={() => {
                          toggleGenre(g.label);
                          showNotification(`Updated genre affinity: ${g.label}`);
                        }}
                      />
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 2. Atmospheric Moods */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-editorial text-xl font-bold text-white">
                    Atmospheric Mood Horizons
                  </h3>
                  <Badge variant="violet" size="sm">
                    {tasteState.selectedMoods.length} Selected
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Emotional resonance and psychological textures you seek in cinematic storytelling.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {TASTE_MOODS.map((m) => {
                    const isSelected = tasteState.selectedMoods.includes(m.label);
                    return (
                      <Tag
                        key={m.id}
                        label={m.label}
                        interactive
                        variant="violet"
                        selected={isSelected}
                        onToggle={() => {
                          toggleMood(m.label);
                          showNotification(`Updated mood signal: ${m.label}`);
                        }}
                      />
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 3. Thematic Motifs */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-editorial text-xl font-bold text-white">
                    Thematic Motifs & Inquiries
                  </h3>
                  <Badge variant="teal" size="sm">
                    {tasteState.selectedThemes.length} Selected
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Philosophical conflicts, existential inquiries, and recurring motifs that captivate your mind.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {TASTE_THEMES.map((t) => {
                    const isSelected = tasteState.selectedThemes.includes(t.label);
                    return (
                      <Tag
                        key={t.id}
                        label={t.label}
                        interactive
                        variant="teal"
                        selected={isSelected}
                        onToggle={() => {
                          toggleTheme(t.label);
                          showNotification(`Updated thematic focus: ${t.label}`);
                        }}
                      />
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 4. Preferred Languages & World Cinema Horizon */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <h3 className="font-editorial text-xl font-bold text-white mb-2">
                  Preferred Languages & Audio Perspective
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Configure whether recommendations should prioritize domestic releases or international cinema with subtitles.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TASTE_VIEWING_PREFERENCES.languages.map((lang) => {
                    const isSelected = tasteState.selectedLanguage === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.id);
                          showNotification(`Language preference updated to ${lang.label}`);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-luminous-cyan/10 border-luminous-cyan text-white shadow-cyan-glow'
                            : 'bg-obsidian-surface border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{lang.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-luminous-cyan" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{lang.description}</p>
                      </button>
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 5. Anchored Cinematic Seeds (Selected Films) */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-luminous-cyan" />
                    <h3 className="font-editorial text-xl font-bold text-white">
                      Cinematic Anchors (Selected Films)
                    </h3>
                  </div>
                  <Badge variant="cyan" size="sm">
                    {anchoredMovies.length} Anchored
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Foundational films established during Taste Discovery that serve as core positive vectors for recommendation similarity.
                </p>

                {anchoredMovies.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {anchoredMovies.map((movie) => (
                      <div key={movie.id} className="relative group">
                        <MovieCard movie={movie} />
                        <button
                          type="button"
                          onClick={() => {
                            toggleAnchorMovie(movie.id);
                            showNotification(`Removed anchor: ${movie.title}`);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-obsidian-void/80 text-slate-400 hover:text-luminous-crimson hover:bg-obsidian-void border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Remove from anchors"
                          aria-label={`Remove ${movie.title} from anchors`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-obsidian-surface border border-dashed border-white/10 text-center mb-6">
                    <p className="text-xs text-slate-400 mb-2">No cinematic anchors currently set.</p>
                    <span className="text-[11px] text-slate-500">
                      Add films below to calibrate your vector space.
                    </span>
                  </div>
                )}

                {/* Additional Seed Candidates to Anchor */}
                {seedMovies.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      Add Candidate Anchors
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {seedMovies.slice(0, 4).map((movie) => (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => {
                            toggleAnchorMovie(movie.id);
                            showNotification(`Added anchor: ${movie.title}`);
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-surface border border-white/5 hover:border-luminous-cyan/40 text-left transition-all group"
                        >
                          <img
                            src={movie.poster}
                            alt=""
                            className="w-10 h-14 object-cover rounded-md shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-white font-medium truncate block group-hover:text-luminous-cyan">
                              {movie.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{movie.year}</span>
                            <span className="text-[10px] text-luminous-cyan flex items-center gap-0.5 mt-1 font-semibold">
                              <Plus className="w-3 h-3" /> Anchor
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </GlassPanel>
            </div>
          ) : (
            /* ========================================================================= */
            /* TAB 2: RECOMMENDATION CALIBRATION                                         */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Reset / Actions Row */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Calibrate algorithmic exploration appetites and stylistic diversity in clear human language.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleResetRecs}
                >
                  Reset Recommendations
                </Button>
              </div>

              {/* 1. Algorithmic Novelty & Exploration */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-6">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-white mb-2">
                    Algorithmic Novelty & Exploration
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Control the balance between safe, highly familiar suggestions and unexpected discoveries.
                  </p>
                </div>

                {/* Human question: How adventurous should your recommendations be? */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-white block">
                    How adventurous should your recommendations be?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'familiar',
                        label: 'Comforting Familiarity',
                        desc: 'Deeply focuses on close stylistic matches to your established favorites.',
                        pct: 35,
                      },
                      {
                        id: 'balanced',
                        label: 'Balanced Horizon',
                        desc: 'Blends your core affinities with adjacent cinematic styles and directors.',
                        pct: 70,
                      },
                      {
                        id: 'adventurous',
                        label: 'Daring Exploration',
                        desc: 'Actively surfaces provocative, unexpected masterworks outside your comfort zone.',
                        pct: 95,
                      },
                    ].map((item) => {
                      const isSelected = recommendationPreferences.adventurousness === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            updateRecommendationPreferences({
                              adventurousness: item.id as 'familiar' | 'balanced' | 'adventurous',
                              noveltyAppetite: item.pct,
                            });
                            showNotification(`Exploration level set to ${item.label}`);
                          }}
                          className={`text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-luminous-cyan/10 border-luminous-cyan text-white shadow-cyan-glow'
                              : 'bg-obsidian-surface border-white/5 text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-luminous-cyan" />}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantitative Dial Sliders for Fine-Tuning */}
                <div className="space-y-6 pt-4 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">Novelty Appetite</span>
                      <span className="text-luminous-cyan font-semibold">
                        {recommendationPreferences.noveltyAppetite}% (
                        {recommendationPreferences.noveltyAppetite > 75
                          ? 'High Discovery'
                          : recommendationPreferences.noveltyAppetite > 45
                          ? 'Balanced'
                          : 'Conservative'}
                        )
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      aria-label="Novelty Appetite"
                      value={recommendationPreferences.noveltyAppetite}
                      onChange={(e) =>
                        updateRecommendationPreferences({ noveltyAppetite: Number(e.target.value) })
                      }
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Governs the probability of recommending lesser-known or non-obvious titles.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">MMR Diversity Dispersion</span>
                      <span className="text-luminous-cyan font-semibold">
                        {recommendationPreferences.diversityDispersion}% (Varied Genres)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      aria-label="MMR Diversity Dispersion"
                      value={recommendationPreferences.diversityDispersion}
                      onChange={(e) =>
                        updateRecommendationPreferences({ diversityDispersion: Number(e.target.value) })
                      }
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Maximal Marginal Relevance penalty preventing duplicate sub-genres on a single shelf.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">Independent & Art-House Weighting</span>
                      <span className="text-luminous-cyan font-semibold">
                        {recommendationPreferences.indieTolerance}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      aria-label="Independent & Art-House Weighting"
                      value={recommendationPreferences.indieTolerance}
                      onChange={(e) =>
                        updateRecommendationPreferences({ indieTolerance: Number(e.target.value) })
                      }
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Proportion of festival circuit, auteur-driven, and independent productions.
                    </span>
                  </div>
                </div>
              </GlassPanel>

              {/* 2. Willingness to explore unfamiliar genres */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-4">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-white mb-1">
                    Willingness to Explore Unfamiliar Genres
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tell the recommender how far beyond your designated genre affinities it may venture.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    {
                      id: 'stick-to-favorites',
                      label: 'Confirmed Affinities Only',
                      desc: 'Confine recommendations strictly to genres explicitly saved in your profile.',
                    },
                    {
                      id: 'occasional',
                      label: 'Occasional Departures',
                      desc: 'Surface exceptional crossover films when mood or directorial style aligns.',
                    },
                    {
                      id: 'wide-open',
                      label: 'Broad Exploratory Aperture',
                      desc: 'No boundaries. Excellent cinema in any category is eligible.',
                    },
                  ].map((item) => {
                    const isSelected = recommendationPreferences.unfamiliarGenres === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateRecommendationPreferences({
                            unfamiliarGenres: item.id as 'stick-to-favorites' | 'occasional' | 'wide-open',
                          });
                          showNotification(`Unfamiliar genre openness set to ${item.label}`);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-luminous-cyan/10 border-luminous-cyan text-white shadow-cyan-glow'
                            : 'bg-obsidian-surface border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{item.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-luminous-cyan" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 3. Preferred Release Era & Pacing */}
              <GlassPanel elevation="plate" padding="lg" rounded="2xl" className="space-y-6">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-white mb-1">
                    Pacing & Era Tolerance
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Configure structural tolerances for narrative speed and chronological breadth.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Slow burn preference toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-surface border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">Slow-Burn Narratives</span>
                      <span className="text-[11px] text-slate-400">
                        Allow films emphasizing mood and visual contemplation over plot velocity
                      </span>
                    </div>
                    <Tag
                      label={
                        recommendationPreferences.pacingPreference === 'contemplative'
                          ? 'Preferred'
                          : 'Standard'
                      }
                      interactive
                      selected={recommendationPreferences.pacingPreference === 'contemplative'}
                      onToggle={() => {
                        const newPacing =
                          recommendationPreferences.pacingPreference === 'contemplative'
                            ? 'flexible'
                            : 'contemplative';
                        updateRecommendationPreferences({ pacingPreference: newPacing });
                        showNotification(`Slow-burn pacing toggled`);
                      }}
                    />
                  </div>

                  {/* Pre-1980 Golden Era toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-surface border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Classic & Golden Era (Pre-1980)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Include historical masterworks and mid-century cinema in discovery pool
                      </span>
                    </div>
                    <Tag
                      label={
                        recommendationPreferences.preferredEra === 'all' ? 'Active' : 'Muted'
                      }
                      interactive
                      selected={recommendationPreferences.preferredEra === 'all'}
                      onToggle={() => {
                        const newEra =
                          recommendationPreferences.preferredEra === 'all'
                            ? 'contemporary'
                            : 'all';
                        updateRecommendationPreferences({ preferredEra: newEra });
                        showNotification(`Era horizon toggled`);
                      }}
                    />
                  </div>

                  {/* Duration horizon selector */}
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-white block mb-2">
                      Preferred Duration Horizon
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {TASTE_VIEWING_PREFERENCES.runtimes.map((rt) => {
                        const isSelected = recommendationPreferences.preferredRuntime === rt.id;
                        return (
                          <button
                            key={rt.id}
                            type="button"
                            onClick={() => {
                              updateRecommendationPreferences({
                                preferredRuntime: rt.id as 'any' | 'concise' | 'extended',
                              });
                              showNotification(`Runtime horizon set to ${rt.label}`);
                            }}
                            className={`text-left p-3 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-luminous-cyan/10 border-luminous-cyan text-white shadow-cyan-glow'
                                : 'bg-obsidian-surface border-white/5 text-slate-300 hover:border-white/20'
                            }`}
                          >
                            <span className="text-xs font-semibold block mb-0.5">{rt.label}</span>
                            <span className="text-[10px] text-slate-400">{rt.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default PreferencesPage;
