import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertTriangle } from 'lucide-react';

import { MOVIE_FIXTURES } from '../fixtures/movieFixtures';

import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Badge,
  Button,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

import { usePreferences, useSetAtmosphere, useLibraryOptional } from '../context';

export const RecommendationsPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const navigate = useNavigate();
  const { tasteState } = usePreferences();
  const library = useLibraryOptional();
  const primaryGenre = tasteState?.selectedGenres?.[0] || null;
  useSetAtmosphere(primaryGenre);

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <SectionHeader
          as="h1"
          eyebrow="DIMENSIONAL COGNITIVE MATCH"
          title="Your Recommendations"
          description="Films generated through content-based similarity, auteur resonance, and your calibrated preference vectors."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {pageState === 'loading' && (
        <LoadingState
          type="cards"
          count={6}
          message="Computing dimensional resonance across 15,000+ films..."
        />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Recommendation Pipeline Interrupted"
          message="Failed to compute similarity scores for your preference vector. Please try refreshing."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="No Recommendations Available"
          description="Your preference profile does not contain enough signal to formulate confident recommendations. Run a brief Taste Discovery session."
          action={
            <Button size="sm" onClick={() => navigate('/taste-discovery')}>
              Start Taste Discovery
            </Button>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="space-y-8">
          {/* Top Recommendation Dossier Card */}
          {MOVIE_FIXTURES[0] && (
            <GlassPanel
              elevation="plate"
              padding="lg"
              rounded="2xl"
              className="border-luminous-cyan/30 shadow-cyan-glow relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="cyan" size="md" dot>
                      Prime Resonance • {MOVIE_FIXTURES[0].matchScore}% Match
                    </Badge>
                    <span className="text-xs text-slate-400">Top Candidate</span>
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-white mb-1">
                    {MOVIE_FIXTURES[0].title} ({MOVIE_FIXTURES[0].year})
                  </h3>
                  <p className="text-xs text-luminous-cyan mb-4 font-sans font-medium">
                    Directed by {MOVIE_FIXTURES[0].director}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans mb-4">
                    {MOVIE_FIXTURES[0].synopsis}
                  </p>

                  {/* Radical Algorithmic Honesty (DESIGN.md 1) */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/10 text-xs font-sans">
                    {MOVIE_FIXTURES[0].explanation?.whyRecommended && (
                      <div className="flex items-start gap-2 text-luminous-teal">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>Why this fits:</strong> {MOVIE_FIXTURES[0].explanation.whyRecommended}</span>
                      </div>
                    )}
                    {MOVIE_FIXTURES[0].explanation?.divergenceNote && (
                      <div className="flex items-start gap-2 text-luminous-amber">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>Taste divergence:</strong> {MOVIE_FIXTURES[0].explanation.divergenceNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate(`/movies/${MOVIE_FIXTURES[0].id}`)}
                  >
                    View Film Dossier
                  </Button>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Grid of Remaining Recommended Films */}
          <div>
            <h3 className="font-editorial text-xl font-bold text-white mb-4">
              Harmonic Match Candidates
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {MOVIE_FIXTURES.slice(1).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isWatchlisted={library ? library.isWatchlisted(movie.id) : Boolean(movie.isWatchlisted)}
                  isFavorite={library ? library.isFavourite(movie.id) : Boolean(movie.isFavorite)}
                  onWatchlistToggle={(id) => library?.toggleWatchlist(id)}
                  onFavoriteToggle={(id) => library?.toggleFavourite(id)}
                  onClick={(id) => navigate(`/movies/${id}`)}
                  actionSlot={
                    movie.explanation?.whyRecommended ? (
                      <p className="text-[11px] text-luminous-cyan/90 line-clamp-2 mt-1">
                        {movie.explanation.whyRecommended}
                      </p>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </PageContainer>
  );
};

export default RecommendationsPage;
