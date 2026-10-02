import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Compass, Film, Clapperboard, Hash } from 'lucide-react';
import {
  MOVIE_FIXTURES,
  searchMovies,
  getCuratedFeaturedFixtures,
  SUGGESTED_SEARCHES,
} from '../fixtures/movieFixtures';
import {
  PageContainer,
  SearchInput,
  Tag,
  MovieCard,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';
import { useLibraryOptional, useSetAtmosphere } from '../context';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [pageState, setPageState] = usePageState('populated');

  // Search operates within a clean, neutral cinematic atmosphere
  useSetAtmosphere(null);

  // Centralized shared library context with fallback for standalone test harnesses
  const library = useLibraryOptional();
  const [watchlistMap, setWatchlistMap] = useState<Record<string, boolean>>(() =>
    MOVIE_FIXTURES.reduce(
      (acc, movie) => ({
        ...acc,
        [movie.id]: Boolean(movie.isWatchlisted),
      }),
      {}
    )
  );

  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>(() =>
    MOVIE_FIXTURES.reduce(
      (acc, movie) => ({
        ...acc,
        [movie.id]: Boolean(movie.isFavorite),
      }),
      {}
    )
  );

  const isMovieWatchlisted = (movieId: string): boolean => {
    if (library) return library.isWatchlisted(movieId);
    return watchlistMap[movieId] ?? false;
  };

  const isMovieFavorite = (movieId: string): boolean => {
    if (library) return library.isFavourite(movieId);
    return favoritesMap[movieId] ?? false;
  };

  const toggleWatchlist = (movieId: string) => {
    if (library) {
      library.toggleWatchlist(movieId);
    } else {
      setWatchlistMap((prev) => ({
        ...prev,
        [movieId]: !prev[movieId],
      }));
    }
  };

  const toggleFavorite = (movieId: string) => {
    if (library) {
      library.toggleFavourite(movieId);
    } else {
      setFavoritesMap((prev) => ({
        ...prev,
        [movieId]: !prev[movieId],
      }));
    }
  };

  // Synchronize internal query state with URL parameter (supports back/forward navigation)
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Execute client-side normalized search across movie fixtures
  const hasActiveQuery = query.trim().length > 0;
  const searchResults = hasActiveQuery ? searchMovies(query) : [];
  const curatedMovies = getCuratedFeaturedFixtures();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSearchSubmit = (val: string) => {
    setQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val);
      setSearchParams(newParams);
    } else {
      newParams.delete('q');
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleClear = () => {
    setQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams, { replace: true });
  };

  const handleSelectSuggestion = (term: string) => {
    setQuery(term);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', term);
    setSearchParams(newParams);
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <span className="text-telemetry text-luminous-cyan uppercase tracking-wider text-xs font-semibold mb-2 block">
            Catalog Discovery & Search
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Find your next film.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-sans max-w-2xl leading-relaxed">
            Explore cinema through title, director, actor, genre, theme, mood, language, or release year.
          </p>
        </div>
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Prominent Search Input */}
      <div className="mb-6 max-w-3xl">
        <SearchInput
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onSearch={(val) => handleSearchSubmit(val)}
          onClear={handleClear}
          placeholder="Search films, directors, genres, moods..."
          ctaText="Search"
          autoFocus={false}
        />
      </div>

      {/* Simulated Multi-State Views */}
      {pageState === 'loading' && (
        <LoadingState type="cards" count={6} message="Searching the cinematic catalog..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Search Index Interrupted"
          message="Could not connect to the movie index. Please try your search again."
          onRetry={() => setPageState('populated')}
        />
      )}

      {/* Empty pageState simulation override */}
      {pageState === 'empty' && (
        <EmptyState
          title="No Films Found"
          description="No cinematic records matched the active query criteria."
          action={
            <button
              type="button"
              onClick={() => {
                handleClear();
                setPageState('populated');
              }}
              className="text-xs text-luminous-cyan hover:underline font-semibold"
            >
              Reset Search
            </button>
          }
        />
      )}

      {pageState === 'populated' && (
        <>
          {/* STATE 1: ACTIVE QUERY WITH RESULTS */}
          {hasActiveQuery && searchResults.length > 0 && (
            <div>
              {/* Subtle Result Count & Clear Action */}
              <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/10">
                <span className="text-xs text-slate-400 font-sans tracking-wide">
                  {searchResults.length} {searchResults.length === 1 ? 'film found' : 'films found'} for{' '}
                  <span className="text-white font-medium">"{query.trim()}"</span>
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-luminous-cyan transition-colors"
                >
                  Clear query
                </button>
              </div>

              {/* Cinematic Results Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {searchResults.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isWatchlisted={isMovieWatchlisted(movie.id)}
                    isFavorite={isMovieFavorite(movie.id)}
                    onWatchlistToggle={toggleWatchlist}
                    onFavoriteToggle={toggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STATE 2: ACTIVE QUERY WITH ZERO RESULTS */}
          {hasActiveQuery && searchResults.length === 0 && (
            <div className="py-12 flex flex-col items-center text-center max-w-xl mx-auto">
              <EmptyState
                title={`No films found for "${query.trim()}"`}
                description="Try a different title, genre, director, mood, or theme. Or explore one of the suggested curations below."
                action={
                  <div className="flex flex-col items-center gap-4 mt-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
                    >
                      Clear search
                    </button>

                    <div className="pt-4 border-t border-white/10 w-full">
                      <span className="text-xs text-slate-400 block mb-2 font-sans">
                        Or try one of these fixture searches:
                      </span>
                      <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTED_SEARCHES.slice(0, 5).map((item) => (
                          <Tag
                            key={item.label}
                            label={item.label}
                            interactive
                            onToggle={() => handleSelectSuggestion(item.label)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          )}

          {/* STATE 3: EMPTY QUERY INITIAL DISCOVERY STATE */}
          {!hasActiveQuery && (
            <div>
              {/* Popular Curatorial Searches */}
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-luminous-cyan" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Popular Curatorial Searches
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SEARCHES.map((item) => (
                    <Tag
                      key={item.label}
                      label={item.label}
                      interactive
                      onToggle={() => handleSelectSuggestion(item.label)}
                    />
                  ))}
                </div>
              </div>

              {/* Curatorial Search Dimensions Dossier */}
              <div className="mb-12 p-6 rounded-2xl bg-obsidian-surface/60 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <Compass className="w-4 h-4 text-luminous-cyan" aria-hidden="true" />
                  <h2 className="font-editorial text-lg font-bold text-white tracking-wide">
                    Curatorial Search Dimensions
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300 font-sans">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-1.5 text-luminous-cyan font-semibold mb-1">
                      <Film className="w-3.5 h-3.5" />
                      <span>Titles & Eras</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Search exact or partial titles and release years (e.g.,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Solaris"
                        onClick={() => handleSelectSuggestion('Solaris')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Solaris
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        aria-label="Example query: 2049"
                        onClick={() => handleSelectSuggestion('2049')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        2049
                      </button>
                      ).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-1.5 text-luminous-amber font-semibold mb-1">
                      <Clapperboard className="w-3.5 h-3.5" />
                      <span>Auteurs & Cast</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Query visionary directors or performers (e.g.,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Christopher Nolan"
                        onClick={() => handleSelectSuggestion('Christopher Nolan')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Christopher Nolan
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Denis Villeneuve"
                        onClick={() => handleSelectSuggestion('Denis Villeneuve')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Denis Villeneuve
                      </button>
                      ).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-1.5 text-secondary font-semibold mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aesthetic & Mood</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Explore emotional frequency and pace (e.g.,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Atmospheric"
                        onClick={() => handleSelectSuggestion('Atmospheric')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Atmospheric
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Psychological"
                        onClick={() => handleSelectSuggestion('Psychological')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Psychological
                      </button>
                      ).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-1.5 text-accent-teal font-semibold mb-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Themes & Form</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Probe intellectual motifs and structure (e.g.,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Artificial Intelligence"
                        onClick={() => handleSelectSuggestion('Artificial Intelligence')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Artificial Intelligence
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        aria-label="Example query: Non-Linear"
                        onClick={() => handleSelectSuggestion('Non-Linear')}
                        className="text-white hover:text-luminous-cyan underline"
                      >
                        Non-Linear
                      </button>
                      ).
                    </p>
                  </div>
                </div>
              </div>

              {/* Small Curated Selection for Empty State */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-editorial text-xl md:text-2xl font-bold text-white tracking-wide">
                      Curated Selection
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      A small collection of iconic fixture films to inspire your search.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
                  {curatedMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      to={`/movies/${movie.id}`}
                      isWatchlisted={isMovieWatchlisted(movie.id)}
                      isFavorite={isMovieFavorite(movie.id)}
                      onWatchlistToggle={toggleWatchlist}
                      onFavoriteToggle={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default SearchPage;
