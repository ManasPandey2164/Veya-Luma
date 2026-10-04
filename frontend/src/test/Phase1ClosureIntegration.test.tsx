import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RecommendationsPage } from '../pages/RecommendationsPage';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { AuthContext, type AuthContextType } from '../context/authTypes';
import { LibraryProvider } from '../context/LibraryContext';
import { PreferencesProvider } from '../context/PreferencesContext';

import { fetchRecommendationsApi } from '../services/recommendationApi';
import { fetchPreferencesApi, upsertPreferenceApi } from '../services/preferenceApi';
import { fetchMovies, mapMovieListItemToFixture } from '../services/api';

vi.mock('../services/recommendationApi', async () => {
  const actual = await vi.importActual('../services/recommendationApi');
  return {
    ...actual,
    fetchRecommendationsApi: vi.fn(),
  };
});

vi.mock('../services/preferenceApi', async () => {
  const actual = await vi.importActual('../services/preferenceApi');
  return {
    ...actual,
    fetchPreferencesApi: vi.fn(),
    upsertPreferenceApi: vi.fn(),
  };
});

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    fetchMovies: vi.fn(),
  };
});

const mockGuestAuth: AuthContextType = {
  user: null,
  accessToken: null,
  guestSessionId: 'guest-session-closure-123',
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

const mockAuthUser: AuthContextType = {
  user: {
    id: 'user-auth-uuid-456',
    email: 'curator@veyaluma.test',
    username: 'cinematheque',
    display_name: 'Lead Curator',
    is_active: true,
    is_verified: true,
    locale: 'en-US',
    country_code: 'US',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  accessToken: 'valid-test-bearer-token',
  guestSessionId: 'guest-session-closure-123',
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

function renderWithProviders(ui: React.ReactElement, auth: AuthContextType = mockGuestAuth, initialRoute = '/') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <LibraryProvider initialState={{ watchlistIds: [], favouriteIds: [] }}>
          <PreferencesProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {ui}
            </MemoryRouter>
          </PreferencesProvider>
        </LibraryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('Phase 1 Closure — 4 Blocking Integration Gaps Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GAP 1: RecommendationsPage calls fetchRecommendationsApi (No MOVIE_FIXTURES in prod)
  // =========================================================================
  describe('GAP 1 — RecommendationsPage Live API Integration', () => {
    it('calls fetchRecommendationsApi with guest credentials and renders live candidate data', async () => {
      vi.mocked(fetchRecommendationsApi).mockResolvedValueOnce({
        items: [
          {
            id: 'stalker-1979',
            title: 'Stalker',
            release_year: 1979,
            runtime_minutes: 162,
            original_language: 'ru',
            poster_path: null,
            backdrop_path: null,
            director: 'Andrei Tarkovsky',
            channel: 'content_similarity',
            contributing_channels: ['content_similarity'],
            score: 0.942,
            is_in_watchlist: false,
            explanations: [
              {
                reason_code: 'content_similarity',
                label: 'Auteur resonance with Andrei Tarkovsky',
                evidence: ['Deep metaphysical journey matching your contemplative and slow-burn preferences.'],
              },
            ],
            matched_features: {
              genre: ['Sci-Fi', 'Art-House'],
              theme: ['Existentialism & Isolation'],
              mood: ['Meditative', 'Atmospheric'],
              style: ['Slow burn'],
            },
          },
        ],
        total_candidates: 1,
        returned_count: 1,
        is_cold_start: false,
        channels_represented: ['content_similarity'],
        execution_time_ms: 12.4,
      });

      renderWithProviders(<RecommendationsPage />, mockGuestAuth);

      await waitFor(() => {
        expect(fetchRecommendationsApi).toHaveBeenCalledWith({
          token: null,
          sessionId: 'guest-session-closure-123',
          limit: 20,
        });
      });

      // Verifies live candidate rendering
      expect(await screen.findByText(/Stalker/i)).toBeInTheDocument();
      expect(screen.getByText(/Andrei Tarkovsky/i)).toBeInTheDocument();
      expect(screen.getByText(/Deep metaphysical journey/i)).toBeInTheDocument();
    });

    it('passes authenticated bearer token when user is logged in', async () => {
      vi.mocked(fetchRecommendationsApi).mockResolvedValueOnce({
        items: [
          {
            id: 'solaris-1972',
            title: 'Solaris',
            release_year: 1972,
            runtime_minutes: 167,
            original_language: 'ru',
            poster_path: null,
            backdrop_path: null,
            director: 'Andrei Tarkovsky',
            channel: 'content_similarity',
            contributing_channels: ['content_similarity'],
            score: 0.91,
            is_in_watchlist: false,
            explanations: [
              {
                reason_code: 'content_similarity',
                label: 'Sci-Fi philosophical alignment',
                evidence: ['Matches your interest in psychological memory and cosmic horizons.'],
              },
            ],
            matched_features: {
              genre: ['Sci-Fi'],
              theme: ['Memory & Determinism'],
              mood: ['Atmospheric'],
              style: ['Slow burn'],
            },
          },
        ],
        total_candidates: 1,
        returned_count: 1,
        is_cold_start: false,
        channels_represented: ['content_similarity'],
        execution_time_ms: 8.5,
      });

      renderWithProviders(<RecommendationsPage />, mockAuthUser);

      await waitFor(() => {
        expect(fetchRecommendationsApi).toHaveBeenCalledWith({
          token: 'valid-test-bearer-token',
          sessionId: 'guest-session-closure-123',
          limit: 20,
        });
      });

      expect(await screen.findByText(/Solaris/i)).toBeInTheDocument();
    });

    it('handles empty recommendation response gracefully', async () => {
      vi.mocked(fetchRecommendationsApi).mockResolvedValueOnce({
        items: [],
        total_candidates: 0,
        returned_count: 0,
        is_cold_start: true,
        channels_represented: [],
        execution_time_ms: 4.2,
      });

      renderWithProviders(<RecommendationsPage />, mockGuestAuth);

      expect(await screen.findByText(/No Recommendations Available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Taste Discovery/i })).toBeInTheDocument();
    });

    it('handles API error without silent fallback to fixtures in error state', async () => {
      vi.mocked(fetchRecommendationsApi).mockRejectedValueOnce(
        new Error('Recommendation scoring pipeline unreachable')
      );

      renderWithProviders(<RecommendationsPage />, mockGuestAuth);

      expect(await screen.findByText(/Recommendation Pipeline Interrupted/i)).toBeInTheDocument();
      expect(screen.getByText(/Recommendation scoring pipeline unreachable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Re-establish Signal/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // GAP 2: TasteDiscoveryPage Persists Preferences to /api/v1/preferences
  // =========================================================================
  describe('GAP 2 — TasteDiscoveryPage Persistence & Hydration', () => {
    it('hydrates previously saved preferences on mount', async () => {
      vi.mocked(fetchPreferencesApi).mockResolvedValueOnce({
        items: [
          {
            id: 'pref-hydrated-1',
            taxonomy_node_id: 18,
            preference_value: 1.0,
            source: 'taste_discovery',
            created_at: '2026-10-04T00:00:00Z',
            updated_at: '2026-10-04T00:00:00Z',
            taxonomy_node: { id: 18, key: 'genre.sci_fi', label: 'Sci-Fi', axis: 'genre' },
          },
        ],
        total: 1,
      });

      renderWithProviders(<TasteDiscoveryPage />, mockAuthUser);

      await waitFor(() => {
        expect(fetchPreferencesApi).toHaveBeenCalledWith({
          token: 'valid-test-bearer-token',
        });
      });
    });

    it('persists selected preferences via upsertPreferenceApi when clicking Explore Veya Luma', async () => {
      vi.mocked(fetchPreferencesApi).mockResolvedValueOnce({ items: [], total: 0 });
      vi.mocked(upsertPreferenceApi).mockResolvedValue({
        id: 'pref-saved-1',
        taxonomy_node_id: 18,
        preference_value: 1.0,
        source: 'taste_discovery',
        created_at: '2026-10-04T00:00:00Z',
        updated_at: '2026-10-04T00:00:00Z',
        taxonomy_node: { id: 18, key: 'genre.sci_fi', label: 'Sci-Fi', axis: 'genre' },
      });

      renderWithProviders(
        <Routes>
          <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
          <Route path="/discover" element={<div data-testid="discover-destination">Discover Page</div>} />
        </Routes>,
        mockGuestAuth,
        '/taste-discovery'
      );

      // Welcome -> Movies
      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));

      // Step 1: Movies -> Genres
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));

      // Step 2: Genres -> Select Sci-Fi
      const sciFiOption = screen.getByText('Sci-Fi');
      fireEvent.click(sciFiOption);
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Moods' }));

      // Step 3: Moods -> Select Atmospheric
      const atmosphericOption = screen.getByText('Atmospheric');
      fireEvent.click(atmosphericOption);
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Themes' }));

      // Step 4: Themes -> Continue
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Preferences' }));

      // Step 5: Viewing Horizons -> Finish Discovery
      fireEvent.click(screen.getByRole('button', { name: /Finish Discovery/i }));

      // Completion Screen: Captured signals
      expect(await screen.findByText('Discovery Profile Assembled')).toBeInTheDocument();

      // Click "Explore Veya Luma" to trigger persistence
      const exploreBtn = screen.getByRole('button', { name: /Explore Veya Luma/i });
      fireEvent.click(exploreBtn);

      await waitFor(() => {
        expect(upsertPreferenceApi).toHaveBeenCalled();
      });

      // Verify node 18 (Sci-Fi) was persisted with guest session
      expect(upsertPreferenceApi).toHaveBeenCalledWith(
        18,
        1.0,
        { sessionId: 'guest-session-closure-123' },
        'taste_discovery'
      );

      // Verify node 51 (Atmospheric) was persisted with guest session
      expect(upsertPreferenceApi).toHaveBeenCalledWith(
        51,
        1.0,
        { sessionId: 'guest-session-closure-123' },
        'taste_discovery'
      );

      // Navigation succeeds to discover destination
      expect(await screen.findByTestId('discover-destination')).toBeInTheDocument();
    });

    it('displays error and does not navigate when preference persistence fails', async () => {
      vi.mocked(fetchPreferencesApi).mockResolvedValueOnce({ items: [], total: 0 });
      vi.mocked(upsertPreferenceApi).mockRejectedValueOnce(
        new Error('Database preference constraint failure')
      );

      renderWithProviders(
        <Routes>
          <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
          <Route path="/discover" element={<div data-testid="discover-destination">Discover Page</div>} />
        </Routes>,
        mockGuestAuth,
        '/taste-discovery'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));

      // Select Sci-Fi
      fireEvent.click(screen.getByText('Sci-Fi'));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Moods' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Themes' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Preferences' }));
      fireEvent.click(screen.getByRole('button', { name: /Finish Discovery/i }));

      const exploreBtn = await screen.findByRole('button', { name: /Explore Veya Luma/i });
      fireEvent.click(exploreBtn);

      // Error banner is displayed
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Database preference constraint failure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

      // Crucial: Must NOT navigate to /discover if persistence fails
      expect(screen.queryByTestId('discover-destination')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // GAP 3: DiscoverPage Consumes /api/v1/recommendations For Personalized Shelves
  // =========================================================================
  describe('GAP 3 — DiscoverPage Personalized Recommendation Shelves', () => {
    it('consumes recommendation API for For Your Taste and Worth Exploring shelves while keeping catalog API for hero', async () => {
      vi.mocked(fetchMovies).mockResolvedValueOnce({
        items: [
          {
            id: 'catalog-hero-1',
            title: 'Catalog Hero Movie',
            release_year: 2024,
            runtime_minutes: 130,
            original_language: 'en',
            synopsis: 'A catalog film for general browsing.',
            genres: ['Drama'],
            themes: [],
            moods: [],
            styles: [],
            director: 'Jane Campion',
            vote_average: 8.4,
            popularity: 90.0,
            poster_path: null,
            backdrop_path: null,
            poster_url: null,
            backdrop_url: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      });

      const makeRecItem = (id: string, title: string, director: string, genre: string) => ({
        id,
        title,
        release_year: 2023,
        runtime_minutes: 120,
        original_language: 'en',
        poster_path: null,
        backdrop_path: null,
        director,
        channel: 'content_similarity',
        contributing_channels: ['content_similarity'],
        score: 0.95,
        is_in_watchlist: false,
        explanations: [
          {
            reason_code: 'content_similarity',
            label: 'Thematic resonance',
            evidence: ['Aligned with your interest in artificial intelligence and cerebral tension.'],
          },
        ],
        matched_features: { genre: [genre] },
      });

      vi.mocked(fetchRecommendationsApi).mockResolvedValueOnce({
        items: [
          makeRecItem('rec-1', 'Personalized Rec 1', 'Alex Garland', 'Sci-Fi'),
          makeRecItem('rec-2', 'Personalized Rec 2', 'David Fincher', 'Thriller'),
          makeRecItem('rec-3', 'Personalized Rec 3', 'Bong Joon-ho', 'Mystery'),
          makeRecItem('rec-4', 'Personalized Rec 4', 'Nicolas Winding Refn', 'Neo-Noir'),
        ],
        total_candidates: 4,
        returned_count: 4,
        is_cold_start: false,
        channels_represented: ['content_similarity'],
        execution_time_ms: 10.0,
      });

      renderWithProviders(<DiscoverPage />, mockGuestAuth);

      await waitFor(() => {
        expect(fetchMovies).toHaveBeenCalledWith({ limit: 20 });
        expect(fetchRecommendationsApi).toHaveBeenCalledWith({
          token: null,
          sessionId: 'guest-session-closure-123',
          limit: 12,
        });
      });

      // Verify personalized shelf renders live recommendation item
      expect(await screen.findByText('Personalized Rec 1')).toBeInTheDocument();
      expect(screen.getAllByText(/Aligned with your interest in artificial intelligence/i).length).toBeGreaterThan(0);
      expect(screen.getByText('(Recommendation Engine)')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // GAP 4: Director Mapping Comes From Canonical Data (No Hardcoded Villeneuve)
  // =========================================================================
  describe('GAP 4 — Director Metadata Integrity', () => {
    it('maps director directly from canonical backend MovieListItem without fabricating Denis Villeneuve', () => {
      const christopherNolanItem = {
        id: 'oppenheimer-2023',
        title: 'Oppenheimer',
        release_year: 2023,
        runtime_minutes: 180,
        original_language: 'en',
        synopsis: 'The story of J. Robert Oppenheimer.',
        genres: ['Drama', 'History'],
        themes: ['Morality & Retribution'],
        moods: ['Tense', 'Atmospheric'],
        styles: ['Non-linear'],
        director: 'Christopher Nolan',
        vote_average: 8.9,
        popularity: 120.0,
        poster_path: '/oppenheimer.jpg',
        backdrop_path: '/oppenheimer_backdrop.jpg',
      };

      const mapped = mapMovieListItemToFixture(christopherNolanItem);
      expect(mapped.director).toBe('Christopher Nolan');
      expect(mapped.director).not.toBe('Denis Villeneuve');
    });

    it('represents absent director as empty string rather than inventing a placeholder', () => {
      const unknownDirectorItem = {
        id: 'experimental-short-2024',
        title: 'Experimental Short',
        release_year: 2024,
        runtime_minutes: 15,
        original_language: 'en',
        synopsis: 'An anonymous avant-garde work.',
        genres: ['Art-House'],
        themes: [],
        moods: [],
        styles: [],
        director: null,
        vote_average: 7.0,
        popularity: 10.0,
        poster_path: null,
        backdrop_path: null,
      };

      const mapped = mapMovieListItemToFixture(unknownDirectorItem);
      expect(mapped.director).toBe('');
      expect(mapped.director).not.toBe('Denis Villeneuve');
      expect(mapped.director).not.toBe('Director');
    });
  });
});
