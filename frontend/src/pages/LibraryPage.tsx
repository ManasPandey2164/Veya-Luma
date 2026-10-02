import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bookmark, Heart, Clock, Calendar } from 'lucide-react';
import {
  getWatchlistFixtures,
  getFavouritesFixtures,
  getHistoryFixtures,
} from '../fixtures/movieFixtures';
import {
  PageContainer,
  SectionHeader,
  MovieCard,
  GlassPanel,
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

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTab: 'watchlist' | 'favourites' | 'history' = 'watchlist';
  if (currentPath.includes('/favourites')) {
    activeTab = 'favourites';
  } else if (currentPath.includes('/history')) {
    activeTab = 'history';
  }

  const tabs = [
    { id: 'watchlist', label: 'Watchlist', path: '/library/watchlist', icon: Bookmark },
    { id: 'favourites', label: 'Favourites', path: '/library/favourites', icon: Heart },
    { id: 'history', label: 'Watch History', path: '/library/history', icon: Clock },
  ];

  const watchlistMovies = getWatchlistFixtures();
  const favouritesMovies = getFavouritesFixtures();
  const historyMovies = getHistoryFixtures();


  const getMoviesForTab = () => {
    switch (activeTab) {
      case 'watchlist':
        return watchlistMovies;
      case 'favourites':
        return favouritesMovies;
      case 'history':
        return historyMovies;
    }
  };

  const movies = getMoviesForTab();

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          eyebrow="CURATORIAL PANTHEON"
          title="My Library"
          description="Your personal cinematic archives, categorized by intention, adoration, and historical viewing sessions."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Library Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium font-sans transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan ${
                isActive
                  ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-obsidian-void/20 text-obsidian-void' : 'bg-white/10 text-slate-400'}`}>
                {tab.id === 'watchlist' ? watchlistMovies.length : tab.id === 'favourites' ? favouritesMovies.length : historyMovies.length}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Multi-State Views */}
      {pageState === 'loading' && (
        <LoadingState type="cards" count={4} message={`Retrieving your ${activeTab}...`} />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Archive Signal Interrupted"
          message="Could not synchronize with your local library storage. Please retry."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' || (pageState === 'populated' && movies.length === 0) ? (
        <EmptyState
          title={`No Films in ${tabs.find((t) => t.id === activeTab)?.label}`}
          description={`Your ${activeTab} collection is currently empty. Explore recommendations or search to bookmark films.`}
          action={
            <Button size="sm" onClick={() => navigate('/discover')}>
              Discover Films
            </Button>
          }
        />
      ) : null}

      {pageState === 'populated' && movies.length > 0 && (
        <>
          {activeTab === 'history' ? (
            /* Chronological Odyssey View (DESIGN.md 5.5) */
            <div className="space-y-4 max-w-3xl">
              {movies.map((movie) => (
                <GlassPanel
                  key={movie.id}
                  elevation="plate"
                  padding="md"
                  rounded="xl"
                  hoverEffect
                  className="flex items-center justify-between gap-4 cursor-pointer"
                  onClick={() => navigate(`/movies/${movie.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 rounded-md bg-obsidian-card overflow-hidden shrink-0 border border-white/10">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Film</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-editorial text-lg font-bold text-white">
                        {movie.title}
                      </h4>
                      <p className="text-xs text-slate-400 font-sans">
                        {movie.year} • Dir. {movie.director}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="neutral" size="sm">
                      <Calendar className="w-3 h-3 mr-1 inline" />
                      {movie.watchedDate}
                    </Badge>
                  </div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            /* Grid View for Watchlist and Favourites */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isWatchlisted={movie.isWatchlisted}
                  isFavorite={movie.isFavorite}
                  onClick={(id) => navigate(`/movies/${id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default LibraryPage;
