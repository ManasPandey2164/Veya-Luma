import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Sparkles,
  X,
  Compass,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { DISCOVERY_SEEDS } from '../data/discoverySeeds';
import { MOVIE_FIXTURES, type MovieFixture } from '../fixtures/movieFixtures';
import { fetchMovies, mapMovieListItemToFixture } from '../services/api';

import {
  PageContainer,
  GlassPanel,
  SearchInput,
  Tag,
  Button,
  Badge,
  CelestialPrism,
  MovieShelf,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

import { useSetAtmosphere, useLibraryOptional } from '../context';

export const DiscoverPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const [searchPrompt, setSearchPrompt] = useState('');
  const [nlFeedback, setNlFeedback] = useState<string | null>(null);
  const [liveMovies, setLiveMovies] = useState<MovieFixture[] | null>(null);
  const navigate = useNavigate();

  // Centralized shared library context with fallback for standalone test harnesses
  const library = useLibraryOptional();
  const [localWatchlistMap, setLocalWatchlistMap] = useState<Record<string, boolean>>(() =>
    MOVIE_FIXTURES.reduce(
      (acc, movie) => ({
        ...acc,
        [movie.id]: Boolean(movie.isWatchlisted),
      }),
      {}
    )
  );

  // Fetch live movies from FastAPI backend with graceful fallback to fixtures
  useEffect(() => {
    let isMounted = true;
    fetchMovies({ limit: 20 })
      .then((data) => {
        if (isMounted && data.items && data.items.length > 0) {
          setLiveMovies(data.items.map(mapMovieListItemToFixture));
        }
      })
      .catch(() => {
        // Fallback silently to fixtures during offline or error states
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isMovieWatchlisted = (movieId: string): boolean => {
    if (library) {
      return library.isWatchlisted(movieId);
    }
    return localWatchlistMap[movieId] ?? false;
  };

  const toggleWatchlist = (movieId: string) => {
    if (library) {
      library.toggleWatchlist(movieId);
    } else {
      setLocalWatchlistMap((prev) => ({
        ...prev,
        [movieId]: !prev[movieId],
      }));
    }
  };

  // Primary hero movie showcase (preferred live API, fixture fallback)
  const heroMovie: MovieFixture = liveMovies && liveMovies.length > 0 ? liveMovies[0] : MOVIE_FIXTURES[0];
  const isHeroWatchlisted = isMovieWatchlisted(heroMovie.id);

  // Contextual cinematic atmosphere driven by the hero presentation's primary genre
  useSetAtmosphere(heroMovie?.genres[0] || null);

  // Pre-curated fixture subsets for deliberate editorial shelves with live enhancement
  const featuredMovies =
    liveMovies && liveMovies.length >= 5
      ? liveMovies.slice(0, 5)
      : [
          MOVIE_FIXTURES[2], // Arrival (2016)
          MOVIE_FIXTURES[1], // Solaris (1972)
          MOVIE_FIXTURES[7], // Parasite (2019)
          MOVIE_FIXTURES[0], // Blade Runner 2049 (2017)
          MOVIE_FIXTURES[4], // Drive (2011)
        ];

  const forYourTasteMovies =
    liveMovies && liveMovies.length >= 4
      ? liveMovies.slice(1, 5)
      : [
          MOVIE_FIXTURES[0], // Blade Runner 2049
          MOVIE_FIXTURES[2], // Arrival
          MOVIE_FIXTURES[1], // Solaris
          MOVIE_FIXTURES[5], // Memento
        ];

  const worthExploringMovies =
    liveMovies && liveMovies.length >= 8
      ? liveMovies.slice(4, 8)
      : [
          MOVIE_FIXTURES[4], // Drive
          MOVIE_FIXTURES[6], // In the Mood for Love
          MOVIE_FIXTURES[7], // Parasite
          MOVIE_FIXTURES[5], // Memento
        ];

  const hiddenGemsMovies = [
    MOVIE_FIXTURES[3], // Stalker
    MOVIE_FIXTURES[1], // Solaris
    MOVIE_FIXTURES[6], // In the Mood for Love
  ];

  const handleSeedClick = (query: string) => {
    setSearchPrompt(query);
    setNlFeedback(query);
  };

  const handlePromptSubmit = (query: string) => {
    if (query.trim()) {
      setNlFeedback(query.trim());
    }
  };

  const features = [
    {
      icon: Compass,
      title: 'Adaptive Taste Discovery',
      description:
        'Learn your cinematic preferences through instinctive pairwise duels and lightweight recognition rather than sterile questionnaires.',
      accent: 'text-luminous-cyan',
    },
    {
      icon: Eye,
      title: 'Radical Algorithmic Honesty',
      description:
        'Transparent dimensional resonance scores that clearly explain why a film fits your profile—and candidly reveal where it diverges.',
      accent: 'text-luminous-ultraviolet',
    },
    {
      icon: ShieldCheck,
      title: 'Curatorial Sanctuary',
      description:
        'Pure discovery untainted by streaming rights, ad agendas, or corporate catalog silos. Built exclusively to find your next great film.',
      accent: 'text-luminous-teal',
    },
  ];

  return (
    <PageContainer maxWidth="standard" paddingY="none" withAtmosphere>
      {/* State Switcher for Multi-State Verification */}
      <div className="flex justify-end pt-4 pb-2">
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {pageState === 'loading' && (
        <div className="pt-16 pb-24 text-center">
          <LoadingState type="spinner" message="Synthesizing your cinematic discovery horizons..." />
          <LoadingState type="shelf" count={4} />
        </div>
      )}

      {pageState === 'error' && (
        <div className="py-20 max-w-2xl mx-auto">
          <ErrorState
            title="Discovery Feed Interrupted"
            message="Unable to synthesize your dimensional resonance vectors. Check your connectivity or restart discovery calibration."
            onRetry={() => setPageState('populated')}
          />
        </div>
      )}

      {pageState === 'empty' && (
        <div className="py-20 max-w-2xl mx-auto">
          <EmptyState
            title="No Discovery Vectors Found"
            description="Your personal discovery stream has no active seeds. Begin Taste Discovery or search for a film to populate your feed."
            action={
              <Link to="/taste-discovery">
                <Button size="sm">Start Taste Discovery</Button>
              </Link>
            }
          />
        </div>
      )}

      {pageState === 'populated' && (
        <div className="space-y-12 sm:space-y-16 pb-20">
          {/* A. HERO SECTION WITH AMBIENT ATMOSPHERIC STAGE GLOW */}
          <div className="relative">
            {/* Contextual Genre Bloom radiating around and behind the hero */}
            <div
              className="absolute -inset-2 sm:-inset-6 rounded-3xl blur-2xl pointer-events-none opacity-40 transition-all duration-700 -z-0"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, var(--vl-atmosphere-glow) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />

            <section
              aria-label="Featured Presentation"
              className="preserve-dark relative z-10 w-full overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-obsidian-surface min-h-[480px] lg:min-h-[540px] flex items-end shadow-2xl transition-all duration-700"
              style={{
                borderColor: 'var(--vl-atmosphere-glow)',
                boxShadow: '0 20px 50px -15px var(--vl-atmosphere-glow)',
              }}
            >
            {/* Full-width Cinematic Backdrop Artwork */}
            <img
              src={heroMovie.backdrop}
              alt={`${heroMovie.title} cinematic backdrop`}
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.80]"
              loading="eager"
            />

            {/* Ambient atmospheric color bleed */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen"
              style={{ background: 'var(--vl-atmosphere-gradient)' }}
              aria-hidden="true"
            />

            {/* Controlled Atmospheric Vignette Overlays (Artwork remains visually dominant) */}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-void via-obsidian-void/70 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian-void/90 via-obsidian-void/60 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-obsidian-void/40 via-transparent to-transparent pointer-events-none" />

            {/* Hero Content Overlay */}
            <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-14 max-w-3xl">
              {/* Eyebrow Spotlight Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold uppercase tracking-wider text-luminous-cyan mb-4 transition-colors"
                style={{ color: 'var(--vl-accent)', borderColor: 'var(--vl-accent)' }}
              >
                <CelestialPrism size={14} />
                <span>Curated Spotlight • Featured Film</span>
              </div>

              {/* Title Treatment */}
              <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-3">
                {heroMovie.title}
              </h1>

              {/* Film Metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300 font-sans mb-4">
                <span>{heroMovie.year}</span>
                <span className="opacity-40">•</span>
                <span>{heroMovie.runtime}m</span>
                <span className="opacity-40">•</span>
                <span>Dir. {heroMovie.director}</span>
                <span className="opacity-40">•</span>
                <span>{heroMovie.genres.join(', ')}</span>
                {heroMovie.matchScore && (
                  <>
                    <span className="opacity-40">•</span>
                    <Badge variant="cyan" size="sm" dot>
                      {heroMovie.matchScore}% Match (Sample)
                    </Badge>
                  </>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans font-normal mb-6 line-clamp-3 md:line-clamp-4">
                {heroMovie.synopsis}
              </p>

              {/* Primary & Secondary Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/movies/${heroMovie.id}`}>
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Explore Film
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={
                    isHeroWatchlisted ? (
                      <Check className="w-4 h-4 text-luminous-cyan" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )
                  }
                  onClick={() => toggleWatchlist(heroMovie.id)}
                  aria-pressed={isHeroWatchlisted}
                >
                  {isHeroWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                </Button>
              </div>
            </div>
          </section>
        </div>

          {/* B. NATURAL-LANGUAGE DISCOVERY ENTRY */}
          <section
            aria-label="Natural-Language Discovery Portal"
            className="relative w-full max-w-4xl mx-auto pt-4 px-4 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-luminous-cyan mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt-Driven Intent Discovery (UI Preview)</span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Where Cinema Meets Personal Resonance
            </h2>

            <p className="mt-3 text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-sans">
              Discover movies that fit your taste. Describe an emotional mood, aesthetic atmosphere,
              or narrative impulse below.
            </p>

            {/* Input Interface */}
            <div className="mt-8 w-full max-w-2xl mx-auto">
              <SearchInput
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                onSearch={handlePromptSubmit}
                onClear={() => {
                  setSearchPrompt('');
                  setNlFeedback(null);
                }}
                placeholder="Describe a feeling, mood, visual aesthetic, or auteur..."
                ctaText="Discover"
              />

              {/* Seed prompt cues */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400 mr-1 font-sans">Try exploring:</span>
                {DISCOVERY_SEEDS.map((seed) => (
                  <Tag
                    key={seed.id}
                    label={seed.label}
                    interactive
                    selected={searchPrompt === seed.query}
                    onToggle={() => handleSeedClick(seed.query)}
                  />
                ))}
              </div>

              {/* Local Feedback State (UI Only — No Fake AI Calculation) */}
              {nlFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-6 p-4 rounded-xl bg-obsidian-plate border border-luminous-cyan/30 text-left flex items-start justify-between gap-4 animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-luminous-cyan shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-luminous-cyan uppercase tracking-wider mb-1">
                        Natural-Language Intent Preview
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        Query registered: <span className="text-white font-medium">"{nlFeedback}"</span>.
                        Natural-language semantic retrieval is scheduled for Stage 3 of the Veya Luma roadmap.
                        In this development baseline, browse the curated fixture shelves below.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNlFeedback(null)}
                    className="text-slate-400 hover:text-white text-xs p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan rounded"
                    aria-label="Dismiss discovery message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* C. MOVIE SHELVES */}

          {/* Shelf 1: Featured — Curated Resonance Horizons */}
          <MovieShelf
            title="Curated Resonance Horizons"
            eyebrow="FEATURED SPOTLIGHT • FIXTURE DATA"
            description="Auteur-driven visions balancing speculative atmosphere, psychological depth, and existential weight."
            action={
              <Link to="/recommendations">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Recommendations
                </Button>
              </Link>
            }
          >
            {featuredMovies.map((movie) => (
              <div key={movie.id} className="min-w-[190px] w-52 shrink-0">
                <MovieCard
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isWatchlisted={isMovieWatchlisted(movie.id)}
                  onWatchlistToggle={toggleWatchlist}
                  onClick={(id) => navigate(`/movies/${id}`)}
                />
              </div>
            ))}
          </MovieShelf>

          {/* Shelf 2: For Your Taste (With "Why This Movie" Explanation Area) */}
          <div>
            {/* Editorial Explanation Callout Area (Section 10) */}
            <div className="mb-3 p-4 rounded-xl bg-obsidian-chamber/90 border border-luminous-cyan/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-luminous-cyan/10 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="w-3.5 h-3.5 text-luminous-cyan" />
                </div>
                <div>
                  <span className="font-semibold text-white">Why This Section: </span>
                  <span className="text-slate-300">
                    "Because you enjoy cerebral science fiction, philosophical depth, and contemplative pacing."
                  </span>
                  <span className="text-slate-400 ml-1.5 opacity-80">(Curated selection)</span>
                </div>
              </div>
              <div className="text-[11px] text-luminous-cyan/80 shrink-0 font-medium self-end sm:self-center">
                Curated Resonance Slate
              </div>
            </div>

            <MovieShelf
              title="For Your Taste"
              eyebrow="CURATORIAL TASTE SELECTION"
              description="Curated shelf reflecting an affinity for atmospheric worldbuilding and non-linear narrative puzzles."
            >
              {forYourTasteMovies.map((movie) => (
                <div key={movie.id} className="min-w-[190px] w-52 shrink-0">
                  <MovieCard
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isWatchlisted={isMovieWatchlisted(movie.id)}
                    onWatchlistToggle={toggleWatchlist}
                    onClick={(id) => navigate(`/movies/${id}`)}
                    actionSlot={
                      movie.explanation?.whyRecommended ? (
                        <p className="text-[11px] text-luminous-cyan/90 line-clamp-2 mt-1">
                          "{movie.explanation.whyRecommended}"
                        </p>
                      ) : undefined
                    }
                  />
                </div>
              ))}
            </MovieShelf>
          </div>

          {/* Shelf 3: Worth Exploring */}
          <MovieShelf
            title="Worth Exploring"
            eyebrow="DISTINCTIVE VISIONS • FIXTURE DATA"
            description="Films offering distinctive stylistic breadth—from nocturnal synth-noir to intricate reverse chronology."
          >
            {worthExploringMovies.map((movie) => (
              <div key={movie.id} className="min-w-[190px] w-52 shrink-0">
                <MovieCard
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isWatchlisted={isMovieWatchlisted(movie.id)}
                  onWatchlistToggle={toggleWatchlist}
                  onClick={(id) => navigate(`/movies/${id}`)}
                />
              </div>
            ))}
          </MovieShelf>

          {/* Shelf 4: Hidden Gems */}
          <MovieShelf
            title="Hidden Gems"
            eyebrow="CONTEMPLATIVE REVERIES • FIXTURE DATA"
            description="Poetic, slow-burn art-house cinema prioritizing visual elegance and meditative resonance."
          >
            {hiddenGemsMovies.map((movie) => (
              <div key={movie.id} className="min-w-[190px] w-52 shrink-0">
                <MovieCard
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isWatchlisted={isMovieWatchlisted(movie.id)}
                  onWatchlistToggle={toggleWatchlist}
                  onClick={(id) => navigate(`/movies/${id}`)}
                />
              </div>
            ))}
          </MovieShelf>

          {/* Taste Discovery Invitation & Prototype Disclaimer */}
          <section className="w-full max-w-5xl mx-auto px-4 pt-10 border-t border-white/5 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <GlassPanel
                    key={feature.title}
                    elevation="standard"
                    padding="md"
                    rounded="2xl"
                    hoverEffect
                    className="flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                        <Icon className={cn('w-5 h-5', feature.accent)} />
                      </div>
                      <h3 className="font-editorial text-lg font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {feature.description}
                      </p>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>

            {/* Taste Discovery Callout */}
            <GlassPanel
              elevation="plate"
              padding="lg"
              rounded="2xl"
              className="border-white/10 flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div>
                <Badge variant="cyan" size="sm" dot>
                  Interactive Calibration
                </Badge>
                <h3 className="font-editorial text-xl font-bold text-white mt-2">
                  Begin Your Taste Discovery Journey
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl font-sans">
                  Calibrate your taste profile in under two minutes with intuitive cinematic duels.
                </p>
              </div>
              <Link to="/taste-discovery">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Explore Taste Discovery
                </Button>
              </Link>
            </GlassPanel>

            {/* Development Stage Transparency Disclaimer */}
            <p className="text-center text-[11px] text-slate-400 font-sans tracking-wide">
              Veya Luma Cinematic Discovery • Recommendation slates, match metrics, and curatorial notes are
              powered by centralized fixtures.
            </p>
          </section>
        </div>
      )}
    </PageContainer>
  );
};

export default DiscoverPage;
