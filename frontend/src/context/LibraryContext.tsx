import React, { createContext, useState } from 'react';
import { MOVIE_FIXTURES, type MovieFixture, getMovieFixtureById } from '../fixtures/movieFixtures';

export interface LibraryState {
  watchlistIds: string[];
  favouriteIds: string[];
  historyIds: string[];
}

export interface LibraryContextValue {
  watchlistIds: string[];
  favouriteIds: string[];
  historyIds: string[];
  isWatchlisted: (movieId: string) => boolean;
  isFavourite: (movieId: string) => boolean;
  isInHistory: (movieId: string) => boolean;
  toggleWatchlist: (movieId: string) => void;
  toggleFavourite: (movieId: string) => void;
  addToWatchlist: (movieId: string) => void;
  removeFromWatchlist: (movieId: string) => void;
  addToFavourites: (movieId: string) => void;
  removeFromFavourites: (movieId: string) => void;
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
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() =>
    initialState?.watchlistIds ?? getInitialWatchlistIds()
  );
  const [favouriteIds, setFavouriteIds] = useState<string[]>(() =>
    initialState?.favouriteIds ?? getInitialFavouriteIds()
  );
  const [historyIds, setHistoryIds] = useState<string[]>(() =>
    initialState?.historyIds ?? getInitialHistoryIds()
  );

  const isWatchlisted = (movieId: string) => watchlistIds.includes(movieId);
  const isFavourite = (movieId: string) => favouriteIds.includes(movieId);
  const isInHistory = (movieId: string) => historyIds.includes(movieId);

  const toggleWatchlist = (movieId: string) => {
    setWatchlistIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  };

  const toggleFavourite = (movieId: string) => {
    setFavouriteIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  };

  const addToWatchlist = (movieId: string) => {
    setWatchlistIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
  };

  const removeFromWatchlist = (movieId: string) => {
    setWatchlistIds((prev) => prev.filter((id) => id !== movieId));
  };

  const addToFavourites = (movieId: string) => {
    setFavouriteIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
  };

  const removeFromFavourites = (movieId: string) => {
    setFavouriteIds((prev) => prev.filter((id) => id !== movieId));
  };

  const addToHistory = (movieId: string) => {
    setHistoryIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
  };

  const removeFromHistory = (movieId: string) => {
    setHistoryIds((prev) => prev.filter((id) => id !== movieId));
  };

  const getWatchlistMovies = (): MovieFixture[] =>
    watchlistIds.map(getMovieFixtureById).filter((m): m is MovieFixture => m !== undefined);

  const getFavouriteMovies = (): MovieFixture[] =>
    favouriteIds.map(getMovieFixtureById).filter((m): m is MovieFixture => m !== undefined);

  const getHistoryMovies = (): MovieFixture[] =>
    historyIds.map(getMovieFixtureById).filter((m): m is MovieFixture => m !== undefined);

  return (
    <LibraryContext.Provider
      value={{
        watchlistIds,
        favouriteIds,
        historyIds,
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


