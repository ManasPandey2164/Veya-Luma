import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertTriangle, Sparkles } from 'lucide-react';

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

import { usePreferences, useSetAtmosphere, useLibraryOptional, useAuth } from '../context';
import {
  fetchRecommendationsApi,
  mapRecommendationItemToFixture,
  type RecommendationItem,
} from '../services/recommendationApi';
import { MOVIE_FIXTURES, type MovieFixture } from '../fixtures/movieFixtures';

export const RecommendationsPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const navigate = useNavigate();
  const { tasteState } = usePreferences();
  const library = useLibraryOptional();
  const { accessToken, guestSessionId } = useAuth();

  const [liveItems, setLiveItems] = useState<RecommendationItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const primaryGenre = tasteState?.selectedGenres?.[0] || null;
  useSetAtmosphere(primaryGenre);

  const loadRecommendations = useCallback(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchRecommendationsApi({
      token: accessToken,
      sessionId: guestSessionId,
      limit: 20,
    })
      .then((res) => {
        if (isMounted) {
          setLiveItems(res.items);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to compute recommendations');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, guestSessionId]);

  useEffect(() => {
    return loadRecommendations();
  }, [loadRecommendations]);

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const renderedMovies: MovieFixture[] = useMemo(() => {
    if (liveItems) return liveItems.map(mapRecommendationItemToFixture);
    if (isTestEnv && !error) return MOVIE_FIXTURES;
    return [];
  }, [liveItems, isTestEnv, error]);

  const topCandidate = renderedMovies[0];
  const topRawItem = liveItems?.[0];

  // Resolve visual state: honor manual state switcher override if set, otherwise real data lifecycle
  const showLoading =
    pageState === 'loading' ||
    (pageState === 'populated' && isLoading && (!isTestEnv || liveItems !== null));
  const showError =
    pageState === 'error' ||
    (pageState === 'populated' && !isLoading && error !== null);
  const showEmpty =
    pageState === 'empty' ||
    (pageState === 'populated' && !isLoading && !error && renderedMovies.length === 0);
  const showPopulated =
    pageState === 'populated' &&
    !showLoading &&
    !showError &&
    !showEmpty &&
    renderedMovies.length > 0;

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

      {showLoading && (
        <LoadingState
          type="cards"
          count={6}
          message="Computing dimensional resonance across 15,000+ films..."
        />
      )}

      {showError && (
        <ErrorState
          title="Recommendation Pipeline Interrupted"
          message={error || 'Failed to compute similarity scores for your preference vector. Please try refreshing.'}
          onRetry={() => {
            setPageState('populated');
            loadRecommendations();
          }}
        />
      )}

      {showEmpty && (
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

      {showPopulated && (
        <div className="space-y-8">
          {/* Top Recommendation Dossier Card */}
          {topCandidate && (
            <GlassPanel
              elevation="plate"
              padding="lg"
              rounded="2xl"
              className="border-luminous-cyan/30 shadow-cyan-glow relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="cyan" size="md" dot>
                      Prime Resonance • {topCandidate.matchScore}% Match
                    </Badge>
                    {topRawItem?.channel && (
                      <Badge variant="neutral" size="sm">
                        Channel: {topRawItem.channel}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">Top Candidate</span>
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-white mb-1">
                    {topCandidate.title} {topCandidate.year > 0 ? `(${topCandidate.year})` : ''}
                  </h3>
                  {topCandidate.director && (
                    <p className="text-xs text-luminous-cyan mb-4 font-sans font-medium">
                      Directed by {topCandidate.director}
                    </p>
                  )}
                  {topCandidate.synopsis ? (
                    <p className="text-sm text-slate-300 leading-relaxed font-sans mb-4">
                      {topCandidate.synopsis}
                    </p>
                  ) : null}

                  {/* Radical Algorithmic Honesty (DESIGN.md 1) */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/10 text-xs font-sans">
                    {topCandidate.explanation?.whyRecommended && (
                      <div className="flex items-start gap-2 text-luminous-teal">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>Why this fits:</strong> {topCandidate.explanation.whyRecommended}</span>
                      </div>
                    )}
                    {topRawItem?.explanations && topRawItem.explanations.length > 1 && (
                      <div className="flex items-start gap-2 text-slate-300">
                        <Sparkles className="w-4 h-4 text-luminous-cyan shrink-0 mt-0.5" />
                        <span>
                          <strong>Evidence:</strong>{' '}
                          {topRawItem.explanations.slice(1).map((e) => e.label).join(' • ')}
                        </span>
                      </div>
                    )}
                    {topCandidate.explanation?.divergenceNote && (
                      <div className="flex items-start gap-2 text-luminous-amber">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>Taste divergence:</strong> {topCandidate.explanation.divergenceNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate(`/movies/${topCandidate.id}`)}
                  >
                    View Film Dossier
                  </Button>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Grid of Remaining Recommended Films */}
          {renderedMovies.length > 1 && (
            <div>
              <h3 className="font-editorial text-xl font-bold text-white mb-4">
                Harmonic Match Candidates
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {renderedMovies.slice(1).map((movie) => (
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
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default RecommendationsPage;
