import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { MOVIE_FIXTURES } from '../fixtures/movieFixtures';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderMovieDetailPage(movieId = 'solaris-1972') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/movies/${movieId}`]}>
        <Routes>
          <Route path="/movies/:movieId" element={<MovieDetailPage />} />
          <Route path="/discover" element={<div data-testid="discover-page-stub">Discover Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Step 6 — Movie Details Experience Specifications', () => {
  const targetMovie = MOVIE_FIXTURES[1]; // Solaris (1972)

  describe('Valid Movie Rendering', () => {
    it('renders the movie title, backdrop, and poster artwork', () => {
      renderMovieDetailPage(targetMovie.id);

      // Title
      expect(screen.getByRole('heading', { level: 1, name: targetMovie.title })).toBeInTheDocument();

      // Panoramic backdrop artwork
      const backdrop = screen.getByAltText(`${targetMovie.title} backdrop`);
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute('src', targetMovie.backdrop);

      // Poster artwork
      const poster = screen.getByAltText(targetMovie.title);
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', targetMovie.poster);
    });

    it('renders comprehensive film metadata and taxonomy tags', () => {
      renderMovieDetailPage(targetMovie.id);

      // Core metadata
      expect(screen.getByText('1972')).toBeInTheDocument();
      expect(screen.getByText(/167 minutes/i)).toBeInTheDocument();
      expect(screen.getByText(targetMovie.language)).toBeInTheDocument();
      expect(screen.getAllByText(targetMovie.director).length).toBeGreaterThan(0);
      expect(screen.getByText(`${targetMovie.matchScore}% Match`)).toBeInTheDocument();

      // Synopsis
      expect(screen.getByText(targetMovie.synopsis)).toBeInTheDocument();

      // Taxonomy genres, themes, and moods
      targetMovie.genres.forEach((genre) => {
        expect(screen.getAllByText(genre).length).toBeGreaterThan(0);
      });
      targetMovie.themes.forEach((theme) => {
        expect(screen.getByText(theme)).toBeInTheDocument();
      });
      targetMovie.moods.forEach((mood) => {
        expect(screen.getByText(mood)).toBeInTheDocument();
      });
    });

    it('renders director and principal ensemble cast cleanly', () => {
      renderMovieDetailPage(targetMovie.id);

      expect(screen.getByText('Auteur & Principal Ensemble')).toBeInTheDocument();
      expect(screen.getAllByText(targetMovie.director).length).toBeGreaterThan(0);

      // Principal cast members
      targetMovie.cast.forEach((actor) => {
        expect(screen.getByText(actor)).toBeInTheDocument();
      });
    });

    it('renders the "Why This Movie" algorithmic transparency breakdown from fixtures', () => {
      renderMovieDetailPage(targetMovie.id);

      expect(screen.getByText('Algorithmic Transparency Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Resonance Basis:')).toBeInTheDocument();
      expect(screen.getByText(targetMovie.explanation!.whyRecommended!)).toBeInTheDocument();
      expect(screen.getByText('Taste Divergence Note:')).toBeInTheDocument();
      expect(screen.getByText(targetMovie.explanation!.divergenceNote!)).toBeInTheDocument();
      expect(screen.getByText('Dimensional Resonance Profile')).toBeInTheDocument();
    });

    it('renders the related movies shelf with links pointing to /movies/:movieId', () => {
      renderMovieDetailPage(targetMovie.id);

      expect(screen.getByRole('heading', { level: 2, name: 'Related Discoveries' })).toBeInTheDocument();

      // Related films should be present (e.g. Stalker)
      const stalkerLinks = screen.getAllByRole('link', { name: /Stalker/i });
      expect(stalkerLinks.length).toBeGreaterThan(0);
      expect(stalkerLinks[0]).toHaveAttribute('href', '/movies/stalker-1979');
    });

    it('renders link back to Discover', () => {
      renderMovieDetailPage(targetMovie.id);

      const backLink = screen.getByRole('link', { name: /Back to Discover/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/discover');
    });
  });

  describe('Invalid Movie Handling', () => {
    it('gracefully renders not-found state without crashing when movie ID is invalid', () => {
      renderMovieDetailPage('non-existent-film-xyz-999');

      expect(screen.getByRole('region', { name: 'Film Record Not Found' })).toBeInTheDocument();
      expect(screen.getByText(/No cinematic entry exists for ID: "non-existent-film-xyz-999"/i)).toBeInTheDocument();

      const returnBtn = screen.getByRole('button', { name: 'Return to Catalog' });
      expect(returnBtn).toBeInTheDocument();
    });
  });

  describe('Primary Action Suite & Local State Feedback', () => {
    it('toggles Watchlist action with local state and visual feedback', () => {
      // Use Arrival where isWatchlisted is false initially
      renderMovieDetailPage('arrival-2016');

      const watchlistBtn = screen.getByRole('button', { name: /Add to Watchlist/i });
      expect(watchlistBtn).toHaveAttribute('aria-pressed', 'false');

      // Click to add
      fireEvent.click(watchlistBtn);
      expect(screen.getByRole('button', { name: /In Watchlist/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/Saved "Arrival" to Watchlist/i)).toBeInTheDocument();

      // Click to remove
      fireEvent.click(screen.getByRole('button', { name: /In Watchlist/i }));
      expect(screen.getByRole('button', { name: /Add to Watchlist/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles Favourite action with local state and visual feedback', () => {
      // Use Solaris where isFavorite is false initially
      renderMovieDetailPage('solaris-1972');

      const favBtn = screen.getByRole('button', { name: /Add to Favourites/i });
      expect(favBtn).toHaveAttribute('aria-pressed', 'false');

      // Click to favourite
      fireEvent.click(favBtn);
      expect(screen.getByRole('button', { name: /Favorited/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/Added "Solaris" to Favourites/i)).toBeInTheDocument();

      // Click to unfavourite
      fireEvent.click(screen.getByRole('button', { name: /Favorited/i }));
      expect(screen.getByRole('button', { name: /Add to Favourites/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
