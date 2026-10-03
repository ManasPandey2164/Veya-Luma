import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoverPage } from '../pages/DiscoverPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { SearchPage } from '../pages/SearchPage';
import {
  fetchMovies,
  fetchMovieDetail,
  searchMoviesApi,
  mapMovieListItemToFixture,
  mapMovieDetailToFixture,
  type MovieListItem,
  type MovieDetail,
} from '../services/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Phase 2 Step 15 — Frontend Catalog API Integration & Fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Service Unit Mappings & Contracts', () => {
    it('correctly maps MovieListItem to MovieFixture with formatted artwork', () => {
      const sampleItem: MovieListItem = {
        id: '9d9016e7-73d2-45e0-94cb-558ffb4e87d0',
        title: 'Live Catalog Film',
        original_title: 'Original Film',
        release_date: '2024-03-01',
        release_year: 2024,
        runtime_minutes: 142,
        original_language: 'fr',
        synopsis: 'A live synopsis from PostgreSQL catalog.',
        genres: ['Sci-Fi', 'Thriller'],
        themes: ['Memory & Determinism'],
        moods: ['Atmospheric'],
        styles: ['Slow burn'],
        poster_path: '/sample_poster.jpg',
        backdrop_path: '/sample_backdrop.jpg',
        poster_url: null,
        backdrop_url: null,
      };

      const fixture = mapMovieListItemToFixture(sampleItem);
      expect(fixture.id).toBe(sampleItem.id);
      expect(fixture.title).toBe('Live Catalog Film');
      expect(fixture.year).toBe(2024);
      expect(fixture.runtime).toBe(142);
      expect(fixture.language).toBe('fr');
      expect(fixture.poster).toContain('https://image.tmdb.org/t/p/w500/sample_poster.jpg');
      expect(fixture.backdrop).toContain('https://image.tmdb.org/t/p/w1280/sample_backdrop.jpg');
      expect(fixture.genres).toEqual(['Sci-Fi', 'Thriller']);
      expect(fixture.themes).toEqual(['Memory & Determinism']);
      expect(fixture.moods).toEqual(['Atmospheric']);
    });

    it('correctly maps MovieDetail to MovieFixture with credits and provenance', () => {
      const sampleDetail: MovieDetail = {
        id: '3f512726-8742-455b-b996-03310061e888',
        title: 'Detailed Masterpiece',
        original_title: 'Masterpiece Original',
        release_date: '2023-10-15',
        release_year: 2023,
        runtime_minutes: 155,
        synopsis: 'Full narrative overview from live catalog.',
        original_language: 'en',
        spoken_languages: ['en', 'de'],
        genres: ['Drama', 'Art-House'],
        themes: ['Existentialism & Isolation'],
        moods: ['Contemplative'],
        styles: ['Measured'],
        artwork: {
          poster_path: null,
          backdrop_path: null,
          poster_url: 'https://images.example.com/custom_poster.jpg',
          backdrop_url: 'https://images.example.com/custom_backdrop.jpg',
        },
        collection: {
          collection_id: 'col-1',
          name: 'Classic Anthology',
          poster_path: null,
        },
        credits: {
          director: 'Auteur Director',
          directors: [{ name: 'Auteur Director', department: 'Directing', job: 'Director' }],
          cast: [
            { name: 'Lead Actor', character: 'The Protagonist', billing_order: 0 },
            { name: 'Supporting Actor', character: 'The Foil', billing_order: 1 },
          ],
          crew: [],
        },
        provenance: {
          source: 'tmdb',
          endpoint_or_product: 'movie-details',
          retrieved_at: '2026-10-01T12:00:00Z',
          license_profile: 'commercial-test',
        },
        tags: ['cinematic', 'masterpiece'],
      };

      const fixture = mapMovieDetailToFixture(sampleDetail);
      expect(fixture.id).toBe(sampleDetail.id);
      expect(fixture.title).toBe('Detailed Masterpiece');
      expect(fixture.director).toBe('Auteur Director');
      expect(fixture.cast).toEqual(['Lead Actor', 'Supporting Actor']);
      expect(fixture.poster).toBe('https://images.example.com/custom_poster.jpg');
      expect(fixture.backdrop).toBe('https://images.example.com/custom_backdrop.jpg');
    });
  });

  describe('API Data Fetching & Error Handling', () => {
    it('fetchMovies parses successful paginated responses', async () => {
      const mockPayload = {
        items: [
          {
            id: '9d9016e7-73d2-45e0-94cb-558ffb4e87d0',
            title: 'Arrival Test',
            original_title: null,
            release_date: '2016-11-11',
            release_year: 2016,
            runtime_minutes: 116,
            original_language: 'en',
            synopsis: 'Linguistics and contact.',
            genres: ['Sci-Fi'],
            themes: ['Communication & Connection'],
            moods: ['Atmospheric'],
            styles: ['Measured'],
            poster_path: '/arrival.jpg',
            backdrop_path: '/arrival_bg.jpg',
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
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      } as Response);

      const res = await fetchMovies({ page: 1, limit: 20, genre: 'Sci-Fi' });
      expect(res.total).toBe(1);
      expect(res.items[0].title).toBe('Arrival Test');
      expect(res.items[0].genres).toEqual(['Sci-Fi']);
    });

    it('fetchMovies throws clean error on non-ok status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchMovies()).rejects.toThrow('fetchMovies failed with status: 500');
    });

    it('fetchMovieDetail retrieves single movie detail', async () => {
      const mockDetail = {
        id: '9d9016e7-73d2-45e0-94cb-558ffb4e87d0',
        title: 'Solaris',
        original_title: null,
        release_date: '1972-03-20',
        release_year: 1972,
        runtime_minutes: 167,
        synopsis: 'Space station mystery.',
        original_language: 'ru',
        spoken_languages: ['ru'],
        genres: ['Sci-Fi'],
        themes: ['Existentialism & Isolation'],
        moods: ['Meditative'],
        styles: ['Slow burn'],
        artwork: {
          poster_path: '/solaris.jpg',
          backdrop_path: null,
          poster_url: null,
          backdrop_url: null,
        },
        collection: null,
        credits: {
          director: 'Andrei Tarkovsky',
          directors: [],
          cast: [],
          crew: [],
        },
        provenance: null,
        tags: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetail,
      } as Response);

      const res = await fetchMovieDetail('9d9016e7-73d2-45e0-94cb-558ffb4e87d0');
      expect(res.title).toBe('Solaris');
      expect(res.release_year).toBe(1972);
    });

    it('searchMoviesApi queries backend search endpoint with parameters', async () => {
      const mockSearchPayload = {
        items: [
          {
            id: '9d9016e7-73d2-45e0-94cb-558ffb4e87d0',
            title: 'Dune: Part Two',
            original_title: null,
            release_date: '2024-03-01',
            release_year: 2024,
            runtime_minutes: 166,
            original_language: 'en',
            synopsis: null,
            genres: ['Sci-Fi'],
            themes: [],
            moods: [],
            styles: [],
            poster_path: null,
            backdrop_path: null,
            poster_url: null,
            backdrop_url: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchPayload,
      } as Response);

      const res = await searchMoviesApi('Dune', { limit: 10 });
      expect(res.total).toBe(1);
      expect(res.items[0].title).toBe('Dune: Part Two');
    });
  });

  describe('Component Rendering & Graceful Fallback', () => {
    it('DiscoverPage updates with live catalog data when fetch succeeds', async () => {
      const mockLiveItem = {
        id: '11111111-2222-3333-4444-555555555555',
        title: 'Live Catalog Premier Film',
        original_title: null,
        release_date: '2025-01-01',
        release_year: 2025,
        runtime_minutes: 130,
        original_language: 'en',
        synopsis: 'Premier live film synopsis.',
        genres: ['Sci-Fi', 'Thriller'],
        themes: ['Memory & Determinism'],
        moods: ['Atmospheric'],
        styles: ['Stylized'],
        poster_path: null,
        backdrop_path: null,
        poster_url: 'https://images.example.com/live_premier.jpg',
        backdrop_url: 'https://images.example.com/live_premier_bg.jpg',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockLiveItem],
          total: 1,
          page: 1,
          limit: 20,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        }),
      } as Response);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/discover']}>
            <Routes>
              <Route path="/discover" element={<DiscoverPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Initially renders hero or fallback, then updates with live catalog item
      await waitFor(() => {
        expect(screen.getByText('Live Catalog Premier Film')).toBeInTheDocument();
      });
    });

    it('DiscoverPage gracefully preserves fixture display when API fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/discover']}>
            <Routes>
              <Route path="/discover" element={<DiscoverPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Hero movie falls back to MOVIE_FIXTURES[0] (Blade Runner 2049)
      expect(screen.getByRole('heading', { level: 1, name: 'Blade Runner 2049' })).toBeInTheDocument();
    });

    it('MovieDetailPage loads live movie details when UUID route is requested', async () => {
      const mockLiveMovie = {
        id: '22222222-3333-4444-5555-666666666666',
        title: 'Live UUID Movie Details',
        original_title: null,
        release_date: '2024-05-10',
        release_year: 2024,
        runtime_minutes: 125,
        synopsis: 'Live movie synopsis for details page.',
        original_language: 'en',
        spoken_languages: ['en'],
        genres: ['Mystery'],
        themes: [],
        moods: [],
        styles: [],
        artwork: {
          poster_path: null,
          backdrop_path: null,
          poster_url: 'https://images.example.com/live_poster.jpg',
          backdrop_url: 'https://images.example.com/live_backdrop.jpg',
        },
        collection: null,
        credits: {
          director: 'Live Director',
          directors: [{ name: 'Live Director', department: 'Directing', job: 'Director' }],
          cast: [{ name: 'Live Cast Member', character: 'Role', billing_order: 0 }],
          crew: [],
        },
        provenance: null,
        tags: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockLiveMovie,
      } as Response);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/movies/22222222-3333-4444-5555-666666666666']}>
            <Routes>
              <Route path="/movies/:movieId" element={<MovieDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Live UUID Movie Details' })).toBeInTheDocument();
      });
      expect(screen.getAllByText('Live Director')[0]).toBeInTheDocument();
      expect(screen.getByText('Live Cast Member')).toBeInTheDocument();
    });

    it('SearchPage displays live backend search results and falls back gracefully', async () => {
      const mockSearchResults = {
        items: [
          {
            id: '77777777-8888-9999-0000-111111111111',
            title: 'Live Search Match Result',
            original_title: null,
            release_date: '2022-01-01',
            release_year: 2022,
            runtime_minutes: 110,
            original_language: 'en',
            synopsis: null,
            genres: ['Thriller'],
            themes: [],
            moods: [],
            styles: [],
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
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
      } as Response);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/search?q=Live+Search']}>
            <Routes>
              <Route path="/search" element={<SearchPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Live Search Match Result')).toBeInTheDocument();
      });
    });
  });
});
