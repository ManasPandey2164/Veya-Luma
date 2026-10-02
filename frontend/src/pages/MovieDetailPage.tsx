import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Heart,
  ArrowLeft,
  Info,
  AlertTriangle,
  ShieldCheck,
  Check,
  Film,
  User,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  getMovieFixtureById,
  getRelatedMovieFixtures,
  type MovieFixture,
} from '../fixtures/movieFixtures';
import {
  PageContainer,
  GlassPanel,
  Badge,
  Tag,
  Button,
  MovieShelf,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const MovieDetailPage: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const [pageState, setPageState] = usePageState('populated');
  const navigate = useNavigate();

  // Centralized fixture lookup strictly by route ID
  const movie: MovieFixture | undefined = movieId ? getMovieFixtureById(movieId) : undefined;
  const relatedMovies = movie ? getRelatedMovieFixtures(movie.id) : [];

  // Local interaction states for mock simulation with visual feedback
  const [isWatchlisted, setIsWatchlisted] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (movie) {
      setIsWatchlisted(Boolean(movie.isWatchlisted));
      setIsFavorite(Boolean(movie.isFavorite));
      setFeedbackNotice(null);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }
    }
  }, [movie]);

  const handleToggleWatchlist = () => {
    if (!movie) return;
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);
    setFeedbackNotice(
      nextState ? `Saved "${movie.title}" to Watchlist` : `Removed "${movie.title}" from Watchlist`
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleToggleFavorite = () => {
    if (!movie) return;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setFeedbackNotice(
      nextState ? `Added "${movie.title}" to Favourites` : `Removed "${movie.title}" from Favourites`
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      {/* Top Navigation & Simulation State Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan rounded px-1.5 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover</span>
        </Link>
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {pageState === 'loading' && (
        <LoadingState type="spinner" message="Decrypting cinematic dossier..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Film Dossier Unavailable"
          message="Could not load the catalog record for this film."
          onRetry={() => setPageState('populated')}
        />
      )}

      {/* Invalid Movie ID or Empty State */}
      {(pageState === 'empty' || (!movie && pageState === 'populated')) && (
        <EmptyState
          title="Film Record Not Found"
          description={`No cinematic entry exists for ID: "${movieId}". Explore the catalog to discover curated films.`}
          action={
            <Button size="sm" onClick={() => navigate('/discover')}>
              Return to Catalog
            </Button>
          }
        />
      )}

      {pageState === 'populated' && movie && (
        <div className="space-y-12 pb-16">
          {/* 1. CINEMATIC HERO SECTION */}
          <section
            aria-label={`${movie.title} Dossier Presentation`}
            className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-obsidian-surface shadow-2xl"
          >
            {/* Full-width Panoramic Backdrop Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={movie.backdrop}
                alt={`${movie.title} backdrop`}
                className="w-full h-full object-cover object-center filter brightness-[0.70]"
                loading="eager"
              />
              {/* Controlled Atmospheric Vignette Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-void via-obsidian-void/80 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-obsidian-void/95 via-obsidian-void/70 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-obsidian-void/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Hero Foreground Content */}
            <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                {/* Poster Artwork Column */}
                <div className="lg:col-span-4 w-full max-w-[280px] sm:max-w-[320px] mx-auto lg:mx-0">
                  <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-obsidian-card group">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-card group-hover:scale-105"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian-void via-transparent to-transparent pointer-events-none" />

                    {/* Match Score Badge */}
                    {movie.matchScore && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="cyan" size="md" dot>
                          {movie.matchScore}% Match
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Film Metadata & Action Suite Column */}
                <div className="lg:col-span-8 flex flex-col justify-end">
                  {/* Eyebrow Dossier Classification */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-telemetry text-luminous-cyan">
                      CINEMATIC DOSSIER • {movie.genres.join(' / ')}
                    </span>
                  </div>

                  {/* Monumental Editorial Title */}
                  <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 leading-[1.08]">
                    {movie.title}
                  </h1>

                  {/* Core Film Metadata Line */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300 font-sans mb-6">
                    <span className="font-medium text-white">{movie.year}</span>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-60" />
                      <span>{movie.runtime} minutes</span>
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 opacity-60" />
                      <span>Directed by <strong className="text-white">{movie.director}</strong></span>
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 opacity-60" />
                      <span>Language: <strong className="text-white">{movie.language}</strong></span>
                    </span>
                  </div>

                  {/* Short Synopsis */}
                  <div className="mb-6 max-w-2xl">
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
                      {movie.synopsis}
                    </p>
                  </div>

                  {/* Primary Actions Suite (Watchlist / Favorite) */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      variant={isWatchlisted ? 'primary' : 'outline'}
                      size="md"
                      leftIcon={
                        isWatchlisted ? (
                          <Check className="w-4 h-4 text-obsidian-void" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )
                      }
                      onClick={handleToggleWatchlist}
                      aria-pressed={isWatchlisted}
                    >
                      {isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                    </Button>

                    <Button
                      variant={isFavorite ? 'primary' : 'secondary'}
                      size="md"
                      leftIcon={
                        <Heart
                          className="w-4 h-4"
                          fill={isFavorite ? 'currentColor' : 'none'}
                        />
                      }
                      onClick={handleToggleFavorite}
                      aria-pressed={isFavorite}
                    >
                      {isFavorite ? 'Favorited' : 'Add to Favourites'}
                    </Button>
                  </div>

                  {/* Local Feedback Toast / Notice */}
                  {feedbackNotice && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-plate/90 border border-luminous-cyan/30 text-xs text-luminous-cyan font-sans animate-fade-in w-fit"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-luminous-cyan shrink-0" />
                      <span>{feedbackNotice}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 2. EDITORIAL INFORMATION, TAXONOMY & CAST */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Film Taxonomy & Cast */}
            <div className="lg:col-span-7 space-y-8">
              {/* Taxonomy: Genres, Themes, Moods */}
              <GlassPanel elevation="standard" padding="lg" rounded="2xl" className="space-y-6">
                <div>
                  <h2 className="font-editorial text-xl font-bold text-white mb-3">
                    Cinematic Taxonomy & Attributes
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mb-4">
                    Multidimensional descriptors mapped according to the Veya Luma controlled taxonomy.
                  </p>
                </div>

                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-sans">
                      Primary Genres
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((genre) => (
                        <Tag key={genre} label={genre} interactive={false} variant="cyan" selected />
                      ))}
                    </div>
                  </div>
                )}

                {/* Themes */}
                {movie.themes && movie.themes.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-sans">
                      Latent Thematic Motifs
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {movie.themes.map((theme) => (
                        <Tag key={theme} label={theme} interactive={false} variant="violet" selected />
                      ))}
                    </div>
                  </div>
                )}

                {/* Moods */}
                {movie.moods && movie.moods.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-sans">
                      Atmospheric & Emotional Tones
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {movie.moods.map((mood) => (
                        <Tag key={mood} label={mood} interactive={false} variant="teal" selected />
                      ))}
                    </div>
                  </div>
                )}

                {/* Curatorial Keywords / Tags */}
                {movie.tags && movie.tags.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-sans">
                      Curatorial Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.tags.map((tag) => (
                        <Tag key={tag} label={`#${tag}`} interactive={false} />
                      ))}
                    </div>
                  </div>
                )}
              </GlassPanel>

              {/* Cast and Director Presentation */}
              <GlassPanel elevation="standard" padding="lg" rounded="2xl" className="space-y-5">
                <h2 className="font-editorial text-xl font-bold text-white">
                  Auteur & Principal Ensemble
                </h2>

                {/* Director Spotlight */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-luminous-cyan font-sans font-semibold">
                      Director
                    </span>
                    <h3 className="font-editorial text-lg font-bold text-white mt-0.5">
                      {movie.director}
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-luminous-cyan/10 flex items-center justify-center text-luminous-cyan">
                    <Film className="w-4 h-4" />
                  </div>
                </div>

                {/* Principal Cast */}
                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2.5 font-sans">
                      Principal Cast
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {movie.cast.map((actor) => (
                        <div
                          key={actor}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-plate border border-white/10 text-xs text-slate-200 font-sans"
                        >
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{actor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassPanel>
            </div>

            {/* Right Column: Algorithmic Transparency & Dimensional Resonance */}
            <div className="lg:col-span-5 space-y-6">
              {/* Algorithmic Transparency Box (Section 10) */}
              <GlassPanel
                elevation="plate"
                padding="lg"
                rounded="2xl"
                className="space-y-4 border-luminous-cyan/30 shadow-cyan-glow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-luminous-cyan" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white font-sans">
                      Algorithmic Transparency Breakdown
                    </h2>
                  </div>
                  <Badge variant="cyan" size="sm">
                    Fixture Preview
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Grounded explanation of why this film was surfaced for this profile, including candid
                  friction and taste divergence alerts.
                </p>

                {movie.explanation?.whyRecommended && (
                  <div className="p-3.5 rounded-xl bg-luminous-teal/10 border border-luminous-teal/20 text-xs text-slate-200 font-sans flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-luminous-teal shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block mb-0.5">Resonance Basis:</strong>
                      <span className="leading-relaxed">{movie.explanation.whyRecommended}</span>
                    </div>
                  </div>
                )}

                {movie.explanation?.divergenceNote && (
                  <div className="p-3.5 rounded-xl bg-luminous-amber/10 border border-luminous-amber/20 text-xs text-slate-200 font-sans flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-luminous-amber shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block mb-0.5">Taste Divergence Note:</strong>
                      <span className="leading-relaxed">{movie.explanation.divergenceNote}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-sans italic border-t border-white/10 pt-3">
                  Note: Explanations are development fixture content demonstrating the Stage 1 transparent
                  recommendation contract.
                </p>
              </GlassPanel>

              {/* Cognitive Resonance Matrix (Dimensional Resonance Profile) */}
              <GlassPanel elevation="standard" padding="lg" rounded="2xl" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-white">
                  Dimensional Resonance Profile
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Multi-axial harmonic projection across signature aesthetic dimensions.
                </p>

                <div className="space-y-3 pt-2">
                  {[
                    { axis: 'Atmosphere', score: 98, note: 'Nocturnal, immersive worldbuilding' },
                    { axis: 'Narrative', score: 92, note: 'Non-linear and contemplative' },
                    { axis: 'Speculative', score: 96, note: 'Philosophical science fiction' },
                    { axis: 'Auteur', score: 95, note: 'Distinctive directorial vision' },
                    { axis: 'Dissonance', score: 70, note: 'Controlled psychological tension' },
                  ].map(({ axis, score, note }) => (
                    <div key={axis} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="text-slate-300 font-medium">{axis}</span>
                        <span className="text-luminous-cyan font-semibold">{score}%</span>
                      </div>
                      <div className="w-full bg-obsidian-plate h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-luminous-cyan to-luminous-ultraviolet"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block">{note}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* 3. RELATED MOVIES (CONTINUE EXPLORING) */}
          {relatedMovies.length > 0 && (
            <div className="pt-6 border-t border-white/10">
              <MovieShelf
                title="Related Discoveries"
                eyebrow="CONTINUE EXPLORING • FIXTURE DATA"
                description={`Films sharing stylistic depth, thematic resonance, or auteur vision with ${movie.title}.`}
              >
                {relatedMovies.map((relMovie) => (
                  <div key={relMovie.id} className="min-w-[190px] w-52 shrink-0">
                    <MovieCard
                      movie={relMovie}
                      to={`/movies/${relMovie.id}`}
                      isWatchlisted={Boolean(relMovie.isWatchlisted)}
                      onClick={(id) => navigate(`/movies/${id}`)}
                    />
                  </div>
                ))}
              </MovieShelf>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default MovieDetailPage;
