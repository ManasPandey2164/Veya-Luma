import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Heart,
  Clock,
  LayoutGrid,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react';
import { useLibrary, useSetAtmosphere } from '../context';
import {
  PageContainer,
  SectionHeader,
  MovieCard,
  Button,
  Badge,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const LibraryPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const location = useLocation();
  const navigate = useNavigate();

  // Library operates within a calm, neutral curatorial atmosphere
  useSetAtmosphere(null);

  const {
    isWatchlisted,
    isFavourite,
    removeFromWatchlist,
    removeFromFavourites,
    removeFromHistory,
    toggleWatchlist,
    toggleFavourite,
    getWatchlistMovies,
    getFavouriteMovies,
    getHistoryMovies,
  } = useLibrary();

  const watchlistMovies = getWatchlistMovies();
  const favouriteMovies = getFavouriteMovies();
  const historyMovies = getHistoryMovies();

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTab: 'overview' | 'watchlist' | 'favourites' | 'history' = 'overview';
  if (currentPath.includes('/watchlist')) {
    activeTab = 'watchlist';
  } else if (currentPath.includes('/favourites')) {
    activeTab = 'favourites';
  } else if (currentPath.includes('/history')) {
    activeTab = 'history';
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/library',
      icon: LayoutGrid,
      count: watchlistMovies.length + favouriteMovies.length + historyMovies.length,
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      path: '/library/watchlist',
      icon: Bookmark,
      count: watchlistMovies.length,
    },
    {
      id: 'favourites',
      label: 'Favourites',
      path: '/library/favourites',
      icon: Heart,
      count: favouriteMovies.length,
    },
    {
      id: 'history',
      label: 'Watch History',
      path: '/library/history',
      icon: Clock,
      count: historyMovies.length,
    },
  ];

  const getSubrouteDescription = () => {
    switch (activeTab) {
      case 'watchlist':
        return 'Films you have earmarked to witness. Clear or curate your upcoming sessions.';
      case 'favourites':
        return 'Films that have left an indelible impression and resonate deeply with your taste.';
      case 'history':
        return 'Chronicle of past viewings and interactions (deterministic development state).';
      default:
        return 'Your personal cinematic archives, categorized by intention, adoration, and historical viewing sessions.';
    }
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          as="h1"
          eyebrow="CURATORIAL PANTHEON"
          title="My Library"
          description={getSubrouteDescription()}
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Library Sub-Navigation Tabs */}
      <nav
        aria-label="Library Navigation"
        className="flex items-center gap-2 border-b border-white/10 pb-4 mb-8 overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium font-sans whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan ${
                isActive
                  ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-obsidian-void/20 text-obsidian-void'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Multi-State Views (Loading / Error) */}
      {pageState === 'loading' && (
        <LoadingState
          type="cards"
          count={4}
          message={`Retrieving your ${activeTab === 'overview' ? 'library' : activeTab}...`}
        />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Archive Signal Interrupted"
          message="Could not synchronize with your local library storage. Please retry."
          onRetry={() => setPageState('populated')}
        />
      )}

      {/* OVERVIEW ROUTE (/library) */}
      {pageState === 'populated' && activeTab === 'overview' && (
        <div className="space-y-12">
          {/* Watchlist Section Preview */}
          <section aria-labelledby="overview-watchlist-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-luminous-cyan" />
                <h2
                  id="overview-watchlist-heading"
                  className="font-editorial text-xl md:text-2xl font-bold text-white tracking-wide"
                >
                  Watchlist
                </h2>
                <Badge variant="cyan" size="sm">
                  {watchlistMovies.length}
                </Badge>
              </div>
              <Link
                to="/library/watchlist"
                className="text-xs font-sans font-medium text-slate-400 hover:text-luminous-cyan transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan rounded"
              >
                <span>View full collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {watchlistMovies.length === 0 ? (
              <EmptyState
                title="Your watchlist is waiting."
                description="Curate upcoming cinema you intend to witness. Explore the catalog to begin archiving."
                action={
                  <Button size="sm" onClick={() => navigate('/discover')}>
                    Discover films
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {watchlistMovies.slice(0, 5).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isWatchlisted={true}
                    onWatchlistToggle={(id) => removeFromWatchlist(id)}
                    isFavorite={isFavourite(movie.id)}
                    onFavoriteToggle={(id) => toggleFavourite(id)}
                    actionSlot={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFromWatchlist(movie.id);
                        }}
                        aria-label={`Remove ${movie.title} from watchlist`}
                        className="w-full py-1 px-2 text-xs font-sans text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Favourites Section Preview */}
          <section aria-labelledby="overview-favourites-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-luminous-amber" />
                <h2
                  id="overview-favourites-heading"
                  className="font-editorial text-xl md:text-2xl font-bold text-white tracking-wide"
                >
                  Favourites
                </h2>
                <Badge variant="amber" size="sm">
                  {favouriteMovies.length}
                </Badge>
              </div>
              <Link
                to="/library/favourites"
                className="text-xs font-sans font-medium text-slate-400 hover:text-luminous-amber transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-amber rounded"
              >
                <span>View full collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {favouriteMovies.length === 0 ? (
              <EmptyState
                title="Keep the films that stay with you."
                description="Mark the cinematic masterworks that resonate most deeply with your perspective."
                action={
                  <Button size="sm" onClick={() => navigate('/discover')}>
                    Explore films
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {favouriteMovies.slice(0, 5).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isFavorite={true}
                    onFavoriteToggle={(id) => removeFromFavourites(id)}
                    isWatchlisted={isWatchlisted(movie.id)}
                    onWatchlistToggle={(id) => toggleWatchlist(id)}
                    actionSlot={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFromFavourites(movie.id);
                        }}
                        aria-label={`Remove ${movie.title} from favourites`}
                        className="w-full py-1 px-2 text-xs font-sans text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* History Section Preview */}
          <section aria-labelledby="overview-history-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <h2
                  id="overview-history-heading"
                  className="font-editorial text-xl md:text-2xl font-bold text-white tracking-wide"
                >
                  Watch History
                </h2>
                <Badge variant="neutral" size="sm">
                  {historyMovies.length}
                </Badge>
              </div>
              <Link
                to="/library/history"
                className="text-xs font-sans font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
              >
                <span>View full collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {historyMovies.length === 0 ? (
              <EmptyState
                title="Your viewing history will appear here."
                description="Your personal viewing history is waiting to be written. Explore cinema to chronicle your sessions."
                action={
                  <Button size="sm" onClick={() => navigate('/discover')}>
                    Start discovering
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {historyMovies.slice(0, 5).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isWatchlisted={isWatchlisted(movie.id)}
                    onWatchlistToggle={(id) => toggleWatchlist(id)}
                    isFavorite={isFavourite(movie.id)}
                    onFavoriteToggle={(id) => toggleFavourite(id)}
                    actionSlot={
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 font-sans">
                        {movie.watchedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {movie.watchedDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFromHistory(movie.id);
                          }}
                          aria-label={`Remove ${movie.title} from history`}
                          className="text-slate-400 hover:text-rose-300 transition-colors p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* WATCHLIST FULL SUBROUTE (/library/watchlist) */}
      {activeTab === 'watchlist' && (
        <>
          {pageState === 'empty' || (pageState === 'populated' && watchlistMovies.length === 0) ? (
            <EmptyState
              title="Your watchlist is waiting."
              description="Curate upcoming cinema you intend to witness. Explore the catalog to begin archiving."
              action={
                <Button size="sm" onClick={() => navigate('/discover')}>
                  Discover films
                </Button>
              }
            />
          ) : pageState === 'populated' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {watchlistMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isWatchlisted={true}
                  onWatchlistToggle={(id) => removeFromWatchlist(id)}
                  isFavorite={isFavourite(movie.id)}
                  onFavoriteToggle={(id) => toggleFavourite(id)}
                  actionSlot={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWatchlist(movie.id);
                      }}
                      aria-label={`Remove ${movie.title} from watchlist`}
                      className="w-full py-1 px-2 text-xs font-sans text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    >
                      <X className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  }
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* FAVOURITES FULL SUBROUTE (/library/favourites) */}
      {activeTab === 'favourites' && (
        <>
          {pageState === 'empty' || (pageState === 'populated' && favouriteMovies.length === 0) ? (
            <EmptyState
              title="Keep the films that stay with you."
              description="Mark the cinematic masterworks that resonate most deeply with your perspective."
              action={
                <Button size="sm" onClick={() => navigate('/discover')}>
                  Explore films
                </Button>
              }
            />
          ) : pageState === 'populated' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {favouriteMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  to={`/movies/${movie.id}`}
                  isFavorite={true}
                  onFavoriteToggle={(id) => removeFromFavourites(id)}
                  isWatchlisted={isWatchlisted(movie.id)}
                  onWatchlistToggle={(id) => toggleWatchlist(id)}
                  actionSlot={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromFavourites(movie.id);
                      }}
                      aria-label={`Remove ${movie.title} from favourites`}
                      className="w-full py-1 px-2 text-xs font-sans text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    >
                      <X className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  }
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* HISTORY FULL SUBROUTE (/library/history) */}
      {activeTab === 'history' && (
        <>
          {pageState === 'empty' || (pageState === 'populated' && historyMovies.length === 0) ? (
            <EmptyState
              title="Your viewing history will appear here."
              description="Your personal viewing history is waiting to be written. Explore cinema to chronicle your sessions."
              action={
                <Button size="sm" onClick={() => navigate('/discover')}>
                  Start discovering
                </Button>
              }
            />
          ) : pageState === 'populated' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm">
                  Deterministic Development Chronicle
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {historyMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    to={`/movies/${movie.id}`}
                    isWatchlisted={isWatchlisted(movie.id)}
                    onWatchlistToggle={(id) => toggleWatchlist(id)}
                    isFavorite={isFavourite(movie.id)}
                    onFavoriteToggle={(id) => toggleFavourite(id)}
                    actionSlot={
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 font-sans">
                        {movie.watchedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {movie.watchedDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFromHistory(movie.id);
                          }}
                          aria-label={`Remove ${movie.title} from history`}
                          className="text-slate-400 hover:text-rose-300 transition-colors p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Global Empty State for Overview when all collections are empty */}
      {pageState === 'empty' && activeTab === 'overview' && (
        <EmptyState
          title="Your library is waiting."
          description="Your personal film archive is currently empty. Explore the catalog to curate watchlists and record favourites."
          action={
            <Button size="sm" onClick={() => navigate('/discover')}>
              Discover films
            </Button>
          }
        />
      )}
    </PageContainer>
  );
};

export default LibraryPage;
