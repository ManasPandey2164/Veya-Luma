import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { MOVIE_FIXTURES, type MovieFixture, getMovieFixtureById } from '../fixtures/movieFixtures';
import { mapMovieListItemToFixture } from '../services/api';
import {
  addToWatchlistApi,
  removeFromWatchlistApi,
  fetchWatchlistApi,
  addToFavouritesApi,
  removeFromFavouritesApi,
  fetchFavouritesApi,
  reconcileLibraryApi,
} from '../services/libraryApi';
import { useAuth } from './useAuth';

export interface LibraryState {
  watchlistIds: string[];
  favouriteIds: string[];
  historyIds: string[];
}

export interface LibraryContextValue {
  watchlistIds: string[];
  favouriteIds: string[];
  historyIds: string[];
  isLoading: boolean;
  error: string | null;
  isWatchlisted: (movieId: string) => boolean;
  isFavourite: (movieId: string) => boolean;
  isInHistory: (movieId: string) => boolean;
  toggleWatchlist: (movieId: string) => Promise<void> | void;
  toggleFavourite: (movieId: string) => Promise<void> | void;
  addToWatchlist: (movieId: string) => Promise<void> | void;
  removeFromWatchlist: (movieId: string) => Promise<void> | void;
  addToFavourites: (movieId: string) => Promise<void> | void;
  removeFromFavourites: (movieId: string) => Promise<void> | void;
  addToHistory: (movieId: string) => void;
  removeFromHistory: (movieId: string) => void;
  getWatchlistMovies: () => MovieFixture[];
  getFavouriteMovies: () => MovieFixture[];
  getHistoryMovies: () => MovieFixture[];
}

const getInitialWatchlistIds = () =>
  MOVIE_FIXTURES.filter((m) => m.isWatchlisted).map((m) => m.id);

const getInitialFavouriteIds = () =>
  MOVIE_FIXTURES.filter((m) => m.isFavorite).map((m) => m.id);

const getInitialHistoryIds = () =>
  MOVIE_FIXTURES.filter((m) => Boolean(m.watchedDate)).map((m) => m.id);

export const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export interface LibraryProviderProps {
  children: React.ReactNode;
  initialState?: Partial<LibraryState>;
}

export const LibraryProvider: React.FC<LibraryProviderProps> = ({
  children,
  initialState,
}) => {
  const { isAuthenticated, accessToken, guestSessionId } = useAuth();

  const [watchlistIds, setWatchlistIds] = useState<string[]>(() =>
    initialState?.watchlistIds ?? getInitialWatchlistIds()
  );
  const [favouriteIds, setFavouriteIds] = useState<string[]>(() =>
    initialState?.favouriteIds ?? getInitialFavouriteIds()
  );
  const [historyIds, setHistoryIds] = useState<string[]>(() =>
    initialState?.historyIds ?? getInitialHistoryIds()
  );

  const [liveMoviesMap, setLiveMoviesMap] = useState<Record<string, MovieFixture>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track reconciliation status for current authenticated session
  const reconciledRef = useRef<boolean>(false);
  const guestWatchlistRef = useRef<string[]>(watchlistIds);
  const guestFavouriteRef = useRef<string[]>(favouriteIds);

  useEffect(() => {
    if (!isAuthenticated) {
      guestWatchlistRef.current = watchlistIds;
      guestFavouriteRef.current = favouriteIds;
    }
  }, [isAuthenticated, watchlistIds, favouriteIds]);

  // Synchronize with backend when authenticated
  useEffect(() => {
    let isMounted = true;

    async function syncBackendLibrary() {
      if (!isAuthenticated || !accessToken) {
        reconciledRef.current = false;
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. If not yet reconciled this login, reconcile guest IDs
        if (!reconciledRef.current) {
          try {
            await reconcileLibraryApi(accessToken, {
              guest_session_id: guestSessionId,
              watchlist_movie_ids: guestWatchlistRef.current,
              favourite_movie_ids: guestFavouriteRef.current,
            });
            reconciledRef.current = true;
          } catch {
            // Reconcile non-fatal
          }
        }

        // 2. Fetch authenticated library from backend
        const [wlRes, favRes] = await Promise.all([
          fetchWatchlistApi(accessToken, 1, 100),
          fetchFavouritesApi(accessToken, 1, 100),
        ]);

        if (isMounted) {
          const newLiveMap: Record<string, MovieFixture> = {};

          const fetchedWatchlistIds: string[] = [];
          for (const item of wlRes.items) {
            fetchedWatchlistIds.push(item.movie_id);
            if (item.movie) {
              newLiveMap[item.movie_id] = mapMovieListItemToFixture(item.movie);
            }
          }

          const fetchedFavouriteIds: string[] = [];
          for (const item of favRes.items) {
            fetchedFavouriteIds.push(item.movie_id);
            if (item.movie) {
              newLiveMap[item.movie_id] = mapMovieListItemToFixture(item.movie);
            }
          }

          setWatchlistIds(fetchedWatchlistIds);
          setFavouriteIds(fetchedFavouriteIds);
          setLiveMoviesMap((prev) => ({ ...prev, ...newLiveMap }));
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to sync library';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    syncBackendLibrary();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, accessToken, guestSessionId]);

  const isWatchlisted = useCallback(
    (movieId: string) => watchlistIds.includes(movieId),
    [watchlistIds]
  );
  const isFavourite = useCallback(
    (movieId: string) => favouriteIds.includes(movieId),
    [favouriteIds]
  );
  const isInHistory = useCallback(
    (movieId: string) => historyIds.includes(movieId),
    [historyIds]
  );

  const addToWatchlist = useCallback(
    async (movieId: string) => {
      // Optimistic update
      setWatchlistIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));

      if (isAuthenticated && accessToken) {
        try {
          await addToWatchlistApi(movieId, accessToken);
        } catch (err) {
          // Rollback on failure
          setWatchlistIds((prev) => prev.filter((id) => id !== movieId));
          const msg = err instanceof Error ? err.message : 'Failed to save to watchlist';
          setError(msg);
        }
      }
    },
    [isAuthenticated, accessToken]
  );

  const removeFromWatchlist = useCallback(
    async (movieId: string) => {
      const prevIds = watchlistIds;
      // Optimistic update
      setWatchlistIds((prev) => prev.filter((id) => id !== movieId));

      if (isAuthenticated && accessToken) {
        try {
          await removeFromWatchlistApi(movieId, accessToken);
        } catch (err) {
          // Rollback on failure
          setWatchlistIds(prevIds);
          const msg = err instanceof Error ? err.message : 'Failed to remove from watchlist';
          setError(msg);
        }
      }
    },
    [isAuthenticated, accessToken, watchlistIds]
  );

  const toggleWatchlist = useCallback(
    async (movieId: string) => {
      if (watchlistIds.includes(movieId)) {
        await removeFromWatchlist(movieId);
      } else {
        await addToWatchlist(movieId);
      }
    },
    [watchlistIds, removeFromWatchlist, addToWatchlist]
  );

  const addToFavourites = useCallback(
    async (movieId: string) => {
      // Optimistic update
      setFavouriteIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));

      if (isAuthenticated && accessToken) {
        try {
          await addToFavouritesApi(movieId, accessToken);
        } catch (err) {
          // Rollback on failure
          setFavouriteIds((prev) => prev.filter((id) => id !== movieId));
          const msg = err instanceof Error ? err.message : 'Failed to add to favourites';
          setError(msg);
        }
      }
    },
    [isAuthenticated, accessToken]
  );

  const removeFromFavourites = useCallback(
    async (movieId: string) => {
      const prevIds = favouriteIds;
      // Optimistic update
      setFavouriteIds((prev) => prev.filter((id) => id !== movieId));

      if (isAuthenticated && accessToken) {
        try {
          await removeFromFavouritesApi(movieId, accessToken);
        } catch (err) {
          // Rollback on failure
          setFavouriteIds(prevIds);
          const msg = err instanceof Error ? err.message : 'Failed to remove from favourites';
          setError(msg);
        }
      }
    },
    [isAuthenticated, accessToken, favouriteIds]
  );

  const toggleFavourite = useCallback(
    async (movieId: string) => {
      if (favouriteIds.includes(movieId)) {
        await removeFromFavourites(movieId);
      } else {
        await addToFavourites(movieId);
      }
    },
    [favouriteIds, removeFromFavourites, addToFavourites]
  );

  const addToHistory = useCallback((movieId: string) => {
    setHistoryIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
  }, []);

  const removeFromHistory = useCallback((movieId: string) => {
    setHistoryIds((prev) => prev.filter((id) => id !== movieId));
  }, []);

  const getWatchlistMovies = useCallback((): MovieFixture[] => {
    return watchlistIds
      .map((id) => liveMoviesMap[id] || getMovieFixtureById(id))
      .filter((m): m is MovieFixture => m !== undefined);
  }, [watchlistIds, liveMoviesMap]);

  const getFavouriteMovies = useCallback((): MovieFixture[] => {
    return favouriteIds
      .map((id) => liveMoviesMap[id] || getMovieFixtureById(id))
      .filter((m): m is MovieFixture => m !== undefined);
  }, [favouriteIds, liveMoviesMap]);

  const getHistoryMovies = useCallback((): MovieFixture[] => {
    return historyIds
      .map((id) => liveMoviesMap[id] || getMovieFixtureById(id))
      .filter((m): m is MovieFixture => m !== undefined);
  }, [historyIds, liveMoviesMap]);

  return (
    <LibraryContext.Provider
      value={{
        watchlistIds,
        favouriteIds,
        historyIds,
        isLoading,
        error,
        isWatchlisted,
        isFavourite,
        isInHistory,
        toggleWatchlist,
        toggleFavourite,
        addToWatchlist,
        removeFromWatchlist,
        addToFavourites,
        removeFromFavourites,
        addToHistory,
        removeFromHistory,
        getWatchlistMovies,
        getFavouriteMovies,
        getHistoryMovies,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};
