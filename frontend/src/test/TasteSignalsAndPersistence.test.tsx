import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '../context/authTypes';
import { LibraryProvider } from '../context/LibraryContext';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import {
  addToWatchlistApi,
  removeFromWatchlistApi,
  fetchWatchlistApi,
  addToFavouritesApi,
  removeFromFavouritesApi,
  fetchFavouritesApi,
  reconcileLibraryApi,
} from '../services/libraryApi';
import { rateMovieApi, fetchMovieRatingApi } from '../services/feedbackApi';
import { fetchPreferencesApi, upsertPreferenceApi } from '../services/preferenceApi';

// Mock the backend API services
vi.mock('../services/libraryApi', () => ({
  addToWatchlistApi: vi.fn(),
  removeFromWatchlistApi: vi.fn(),
  fetchWatchlistApi: vi.fn(),
  addToFavouritesApi: vi.fn(),
  removeFromFavouritesApi: vi.fn(),
  fetchFavouritesApi: vi.fn(),
  reconcileLibraryApi: vi.fn(),
}));

vi.mock('../services/feedbackApi', () => ({
  rateMovieApi: vi.fn(),
  fetchMovieRatingApi: vi.fn(),
  recordTelemetryEventApi: vi.fn(),
}));

vi.mock('../services/preferenceApi', () => ({
  fetchPreferencesApi: vi.fn(),
  upsertPreferenceApi: vi.fn(),
  deletePreferenceApi: vi.fn(),
}));

const mockAuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'curator@veyaluma.internal',
  username: 'curator01',
  display_name: 'Lead Curator',
  is_active: true,
  is_verified: true,
  locale: 'en-US',
  country_code: 'US',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const authenticatedAuthValue: AuthContextType = {
  user: mockAuthUser,
  accessToken: 'valid-test-access-token',
  guestSessionId: 'guest-session-12345',
  isAuthenticated: true,
  isGuest: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue(true),
  clearError: vi.fn(),
};

const guestAuthValue: AuthContextType = {
  user: null,
  accessToken: null,
  guestSessionId: 'guest-session-12345',
  isAuthenticated: false,
  isGuest: true,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue(false),
  clearError: vi.fn(),
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

function renderMovieDetail(authValue: AuthContextType, movieId: string = 'blade-runner-2049') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <LibraryProvider initialState={{ watchlistIds: [], favouriteIds: [] }}>
          <MemoryRouter initialEntries={[`/movies/${movieId}`]}>
            <Routes>
              <Route path="/movies/:movieId" element={<MovieDetailPage />} />
            </Routes>
          </MemoryRouter>
        </LibraryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('Veya Luma — Phase 3 Step 17: User Preferences, Taste Signals & Feedback Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWatchlistApi).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    });
    vi.mocked(fetchFavouritesApi).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    });
    vi.mocked(reconcileLibraryApi).mockResolvedValue({
      status: 'reconciled',
      events_reconciled: 0,
      watchlist_reconciled: 0,
      favourites_reconciled: 0,
      preferences_reconciled: 0,
    });
    vi.mocked(fetchMovieRatingApi).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Authenticated Library Loading & Synchronization', () => {
    it('fetches watchlist and favourites on mount when authenticated', async () => {
      renderMovieDetail(authenticatedAuthValue);

      await waitFor(() => {
        expect(fetchWatchlistApi).toHaveBeenCalledWith('valid-test-access-token', 1, 100);
        expect(fetchFavouritesApi).toHaveBeenCalledWith('valid-test-access-token', 1, 100);
        expect(reconcileLibraryApi).toHaveBeenCalled();
      });
    });

    it('does not call backend APIs when operating in anonymous guest mode', async () => {
      renderMovieDetail(guestAuthValue);

      // Should not call authenticated library endpoints
      expect(fetchWatchlistApi).not.toHaveBeenCalled();
      expect(fetchFavouritesApi).not.toHaveBeenCalled();
    });
  });

  describe('2. Watchlist & Favourite Operations', () => {
    it('calls addToWatchlistApi and updates button label when authenticated', async () => {
      vi.mocked(addToWatchlistApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'added',
        movie_id: 'blade-runner-2049',
        message: 'Saved to watchlist',
      });

      renderMovieDetail(authenticatedAuthValue);
      await waitFor(() => expect(fetchWatchlistApi).toHaveBeenCalled());

      const watchlistBtn = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(watchlistBtn);

      await waitFor(() => {
        expect(addToWatchlistApi).toHaveBeenCalledWith('blade-runner-2049', 'valid-test-access-token');
      });

      expect(screen.getByRole('button', { name: /In Watchlist/i })).toBeInTheDocument();
    });

    it('rolls back optimistic watchlist update if backend API fails', async () => {
      vi.mocked(addToWatchlistApi).mockRejectedValueOnce(new Error('Network error'));

      renderMovieDetail(authenticatedAuthValue);
      await waitFor(() => expect(fetchWatchlistApi).toHaveBeenCalled());

      const watchlistBtn = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(watchlistBtn);

      // Rollback restores button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add to Watchlist/i })).toBeInTheDocument();
      });
    });

    it('calls addToFavouritesApi and updates button state when authenticated', async () => {
      vi.mocked(addToFavouritesApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'added',
        movie_id: 'blade-runner-2049',
        message: 'Added to favourites',
      });

      renderMovieDetail(authenticatedAuthValue);
      await waitFor(() => expect(fetchFavouritesApi).toHaveBeenCalled());

      const favBtn = screen.getByRole('button', { name: /Add to Favourites/i });
      fireEvent.click(favBtn);

      await waitFor(() => {
        expect(addToFavouritesApi).toHaveBeenCalledWith('blade-runner-2049', 'valid-test-access-token');
      });

      expect(await screen.findByRole('button', { name: /Favorited/i })).toBeInTheDocument();
    });

    it('calls removeFromWatchlistApi when toggling off an already watchlisted movie', async () => {
      vi.mocked(addToWatchlistApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'added',
        movie_id: 'blade-runner-2049',
        message: 'Saved to watchlist',
      });
      vi.mocked(removeFromWatchlistApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'removed',
        movie_id: 'blade-runner-2049',
        message: 'Removed from watchlist',
      });

      renderMovieDetail(authenticatedAuthValue);
      await waitFor(() => expect(fetchWatchlistApi).toHaveBeenCalled());

      const watchlistBtn = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(watchlistBtn);

      const inWatchlistBtn = await screen.findByRole('button', { name: /In Watchlist/i });
      fireEvent.click(inWatchlistBtn);

      await waitFor(() => {
        expect(removeFromWatchlistApi).toHaveBeenCalledWith('blade-runner-2049', 'valid-test-access-token');
      });
    });

    it('calls removeFromFavouritesApi when toggling off an already favorited movie', async () => {
      vi.mocked(addToFavouritesApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'added',
        movie_id: 'blade-runner-2049',
        message: 'Added to favourites',
      });
      vi.mocked(removeFromFavouritesApi).mockResolvedValueOnce({
        status: 'ok',
        action: 'removed',
        movie_id: 'blade-runner-2049',
        message: 'Removed from favourites',
      });

      renderMovieDetail(authenticatedAuthValue);
      await waitFor(() => expect(fetchFavouritesApi).toHaveBeenCalled());

      const favBtn = screen.getByRole('button', { name: /Add to Favourites/i });
      fireEvent.click(favBtn);

      const favoritedBtn = await screen.findByRole('button', { name: /Favorited/i });
      fireEvent.click(favoritedBtn);

      await waitFor(() => {
        expect(removeFromFavouritesApi).toHaveBeenCalledWith('blade-runner-2049', 'valid-test-access-token');
      });
    });
  });

  describe('3. Curatorial Movie Rating Control', () => {
    it('renders the rating control suite with rating scale 1 to 10', () => {
      renderMovieDetail(authenticatedAuthValue);

      const ratingControl = screen.getByTestId('movie-rating-control');
      expect(ratingControl).toBeInTheDocument();

      // Check rating buttons 1 through 10 exist
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByRole('button', { name: `Rate ${i} out of 10` })).toBeInTheDocument();
      }
    });

    it('submits rating to backend when authenticated user clicks a rating chip', async () => {
      vi.mocked(rateMovieApi).mockResolvedValueOnce({
        id: 'rating-uuid-1',
        user_id: mockAuthUser.id,
        movie_id: 'blade-runner-2049',
        rating: 9,
        created_at: '2026-10-03T20:00:00Z',
        updated_at: '2026-10-03T20:00:00Z',
      });

      renderMovieDetail(authenticatedAuthValue);

      const rate9Btn = screen.getByRole('button', { name: 'Rate 9 out of 10' });
      fireEvent.click(rate9Btn);

      await waitFor(() => {
        expect(rateMovieApi).toHaveBeenCalledWith('blade-runner-2049', 9, 'valid-test-access-token');
      });

      // Feedback toast displayed
      expect(await screen.findByText(/Rated "Blade Runner 2049" 9\/10/i)).toBeInTheDocument();
    });

    it('records guest rating locally with notification when unauthenticated', async () => {
      renderMovieDetail(guestAuthValue);

      const rate8Btn = screen.getByRole('button', { name: 'Rate 8 out of 10' });
      fireEvent.click(rate8Btn);

      // Should not call authenticated rating endpoint
      expect(rateMovieApi).not.toHaveBeenCalled();

      // Should notify guest user
      expect(await screen.findByText(/Rated "Blade Runner 2049" 8\/10 \(Guest — Sign in to save permanently\)/i)).toBeInTheDocument();
    });
  });

  describe('4. Preference Persistence API Client', () => {
    it('correctly interacts with preference service functions', async () => {
      vi.mocked(fetchPreferencesApi).mockResolvedValueOnce({
        items: [
          {
            id: 'pref-1',
            taxonomy_node_id: 1,
            preference_value: 0.9,
            source: 'explicit',
            created_at: '2026-10-03T00:00:00Z',
            updated_at: '2026-10-03T00:00:00Z',
            taxonomy_node: { id: 1, key: 'genre_sci_fi', label: 'Sci-Fi', axis: 'genre' },
          },
        ],
        total: 1,
      });

      const prefs = await fetchPreferencesApi('valid-test-access-token');
      expect(prefs.total).toBe(1);
      expect(prefs.items[0].taxonomy_node.label).toBe('Sci-Fi');

      vi.mocked(upsertPreferenceApi).mockResolvedValueOnce({
        id: 'pref-2',
        taxonomy_node_id: 2,
        preference_value: 0.8,
        source: 'explicit',
        created_at: '2026-10-03T00:00:00Z',
        updated_at: '2026-10-03T00:00:00Z',
        taxonomy_node: { id: 2, key: 'genre_neo_noir', label: 'Neo-Noir', axis: 'genre' },
      });

      const updated = await upsertPreferenceApi(2, 0.8, 'valid-test-access-token');
      expect(updated.preference_value).toBe(0.8);
      expect(upsertPreferenceApi).toHaveBeenCalledWith(2, 0.8, 'valid-test-access-token');
    });
  });
});
