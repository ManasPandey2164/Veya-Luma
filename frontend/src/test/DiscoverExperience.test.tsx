import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoverPage } from '../pages/DiscoverPage';
import { MovieCard } from '../components/ui/MovieCard';
import { MOVIE_FIXTURES } from '../fixtures/movieFixtures';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderDiscoverPage(initialEntry = '/discover') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/movies/:movieId" element={<div data-testid="movie-detail-stub">Movie Detail Stub</div>} />
          <Route path="/recommendations" element={<div data-testid="recommendations-stub">Recommendations Stub</div>} />
          <Route path="/taste-discovery" element={<div data-testid="taste-discovery-stub">Taste Discovery Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Step 5 — Discover Experience & MovieCard Specifications', () => {
  describe('Discover Page — Hero Section', () => {
    it('renders the cinematic hero section using fixture data with artwork, metadata, and actions', () => {
      renderDiscoverPage();

      const heroMovie = MOVIE_FIXTURES[0]; // Blade Runner 2049

      // Hero Heading
      const heroTitle = screen.getByRole('heading', { level: 1, name: heroMovie.title });
      expect(heroTitle).toBeInTheDocument();

      const heroSection = screen.getByRole('region', { name: 'Featured Presentation' });

      // Backdrop artwork
      const backdrop = within(heroSection).getByAltText(`${heroMovie.title} cinematic backdrop`);
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute('src', heroMovie.backdrop);

      // Metadata readouts within hero
      expect(within(heroSection).getByText('2017')).toBeInTheDocument();
      expect(within(heroSection).getByText('164m')).toBeInTheDocument();
      expect(within(heroSection).getByText(`Dir. ${heroMovie.director}`)).toBeInTheDocument();
      expect(within(heroSection).getByText(heroMovie.genres.join(', '))).toBeInTheDocument();
      expect(within(heroSection).getByText(`${heroMovie.matchScore}% Match (Sample)`)).toBeInTheDocument();

      // Primary Action: "Explore Film" linking to /movies/:movieId
      const exploreLink = within(heroSection).getByRole('link', { name: /Explore Film/i });
      expect(exploreLink).toHaveAttribute('href', `/movies/${heroMovie.id}`);

      // Secondary Action: "Add to Watchlist" / "In Watchlist" toggle with local state
      const watchlistBtn = within(heroSection).getByRole('button', { name: /Add to Watchlist|In Watchlist/i });
      expect(watchlistBtn).toBeInTheDocument();
      expect(watchlistBtn).toHaveTextContent('In Watchlist'); // Blade Runner 2049 isWatchlisted is true initially

      // Toggle watchlist state
      fireEvent.click(watchlistBtn);
      expect(within(heroSection).getByRole('button', { name: /Add to Watchlist/i })).toHaveTextContent('Add to Watchlist');
    });
  });

  describe('Discover Page — Natural-Language Discovery Entry', () => {
    it('renders the natural-language search aperture and prompt examples', () => {
      renderDiscoverPage();

      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
      expect(screen.getByText('Prompt-Driven Intent Discovery (UI Preview)')).toBeInTheDocument();

      // Input aperture
      const input = screen.getByPlaceholderText('Describe a feeling, mood, visual aesthetic, or auteur...');
      expect(input).toBeInTheDocument();

      // Seed prompts
      expect(screen.getByText('Find me something atmospheric and unsettling.')).toBeInTheDocument();
      expect(screen.getByText('Something like Interstellar, but more intimate.')).toBeInTheDocument();
      expect(screen.getByText('Give me a clever mystery for tonight.')).toBeInTheDocument();
      expect(screen.getByText('Find a beautiful slow-burn sci-fi film.')).toBeInTheDocument();
    });

    it('displays UI preview feedback upon prompt submission without claiming fake AI processing', () => {
      renderDiscoverPage();

      // Click a seed prompt chip
      const seedChip = screen.getByText('Find me something atmospheric and unsettling.');
      fireEvent.click(seedChip);

      // Verify the preview feedback banner appears
      expect(screen.getByText('Natural-Language Intent Preview')).toBeInTheDocument();
      expect(
        screen.getByText(/Natural-language semantic retrieval is scheduled for Stage 3/i)
      ).toBeInTheDocument();

      // Dismiss feedback
      const dismissBtn = screen.getByRole('button', { name: 'Dismiss discovery message' });
      fireEvent.click(dismissBtn);
      expect(screen.queryByText('Natural-Language Intent Preview')).not.toBeInTheDocument();
    });
  });

  describe('Discover Page — Curated Movie Shelves', () => {
    it('renders multiple editorial shelves populated from centralized fixtures', () => {
      renderDiscoverPage();

      // Shelves
      expect(screen.getByRole('heading', { level: 2, name: 'Curated Resonance Horizons' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'For Your Taste' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Worth Exploring' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Hidden Gems' })).toBeInTheDocument();

      // Check for presence of fixture titles within shelves
      expect(screen.getAllByText('Arrival').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Solaris').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Parasite').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Drive').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Stalker').length).toBeGreaterThan(0);
    });

    it('renders the "Why This Movie" explanation area for the "For Your Taste" section', () => {
      renderDiscoverPage();

      // Curatorial rationale header callout
      expect(screen.getByText('Why This Section:')).toBeInTheDocument();
      expect(
        screen.getByText(/"Because you enjoy cerebral science fiction, philosophical depth, and contemplative pacing."/)
      ).toBeInTheDocument();

      // Fixture whyRecommended strings on individual cards
      expect(
        screen.getByText(/"Matches your interest in non-linear temporal structure and intellectual curiosity."/)
      ).toBeInTheDocument();
    });

    it('ensures movie cards navigate to /movies/:movieId', () => {
      renderDiscoverPage();

      // Movie links point to /movies/:movieId
      const arrivalLinks = screen.getAllByRole('link', { name: /Arrival/i });
      expect(arrivalLinks.length).toBeGreaterThan(0);
      expect(arrivalLinks[0]).toHaveAttribute('href', '/movies/arrival-2016');

      const solarisLinks = screen.getAllByRole('link', { name: /Solaris/i });
      expect(solarisLinks.length).toBeGreaterThan(0);
      expect(solarisLinks[0]).toHaveAttribute('href', '/movies/solaris-1972');
    });

    it('provides horizontal shelf scroll controls for accessible browsing', () => {
      renderDiscoverPage();

      const leftScrollBtns = screen.getAllByRole('button', { name: 'Scroll left' });
      const rightScrollBtns = screen.getAllByRole('button', { name: 'Scroll right' });

      expect(leftScrollBtns.length).toBeGreaterThanOrEqual(4);
      expect(rightScrollBtns.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Discover Page — Multi-State Verification', () => {
    it('supports switching between loading, empty, error, and populated states', () => {
      renderDiscoverPage();

      // Switch to Loading
      fireEvent.click(screen.getByRole('button', { name: 'Loading' }));
      expect(screen.getByText('Synthesizing your cinematic discovery horizons...')).toBeInTheDocument();

      // Switch to Error
      fireEvent.click(screen.getByRole('button', { name: 'Error' }));
      expect(screen.getByText('Discovery Feed Interrupted')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Switch to Empty
      fireEvent.click(screen.getByRole('button', { name: 'Empty' }));
      expect(screen.getByText('No Discovery Vectors Found')).toBeInTheDocument();

      // Return to Populated
      fireEvent.click(screen.getByRole('button', { name: 'Populated' }));
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
    });
  });

  describe('MovieCard Component Specification', () => {
    const testMovie = MOVIE_FIXTURES[2]; // Arrival (2016)

    it('renders title, artwork, and metadata accurately', () => {
      render(
        <MemoryRouter>
          <MovieCard movie={testMovie} to={`/movies/${testMovie.id}`} />
        </MemoryRouter>
      );

      expect(screen.getByText('Arrival')).toBeInTheDocument();
      expect(screen.getByText('2016')).toBeInTheDocument();
      expect(screen.getByText('116m')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
      expect(screen.getByText('Dir. Denis Villeneuve')).toBeInTheDocument();
      expect(screen.getByText('95% Match')).toBeInTheDocument();

      const posterImg = screen.getByAltText('Arrival');
      expect(posterImg).toHaveAttribute('src', testMovie.poster);
    });

    it('renders accessible semantic Link when "to" prop is passed', () => {
      render(
        <MemoryRouter>
          <MovieCard movie={testMovie} to={`/movies/${testMovie.id}`} />
        </MemoryRouter>
      );

      const cardLink = screen.getByRole('link', { name: 'Arrival (2016)' });
      expect(cardLink).toHaveAttribute('href', `/movies/${testMovie.id}`);
    });

    it('supports keyboard navigation via Enter key on interactive card', () => {
      const handleClick = vi.fn();
      render(
        <MovieCard movie={testMovie} onClick={handleClick} />
      );

      const cardBtn = screen.getByRole('button', { name: 'Arrival (2016)' });
      fireEvent.keyDown(cardBtn, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith(testMovie.id);
    });

    it('allows watchlist and favorite toggles without navigating', () => {
      const handleWatchlist = vi.fn();
      const handleFavorite = vi.fn();
      const handleClick = vi.fn();

      render(
        <MemoryRouter>
          <MovieCard
            movie={testMovie}
            to={`/movies/${testMovie.id}`}
            onClick={handleClick}
            onWatchlistToggle={handleWatchlist}
            onFavoriteToggle={handleFavorite}
          />
        </MemoryRouter>
      );

      const watchlistBtn = screen.getByRole('button', { name: `Add ${testMovie.title} to watchlist` });
      fireEvent.click(watchlistBtn);
      expect(handleWatchlist).toHaveBeenCalledWith(testMovie.id);
      expect(handleClick).not.toHaveBeenCalled();

      const favBtn = screen.getByRole('button', { name: `Add ${testMovie.title} to favourites` });
      fireEvent.click(favBtn);
      expect(handleFavorite).toHaveBeenCalledWith(testMovie.id);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
