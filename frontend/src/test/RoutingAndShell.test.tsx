import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AppShell } from '../components/ui/AppShell';
import { DiscoverPage } from '../pages/DiscoverPage';
import { SearchPage } from '../pages/SearchPage';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';
import { RecommendationsPage } from '../pages/RecommendationsPage';
import { LibraryPage } from '../pages/LibraryPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { PreferencesPage } from '../pages/PreferencesPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AccountPage } from '../pages/AccountPage';

afterEach(() => {
  cleanup();
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithRouter(initialEntry: string) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppShell>
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/movies/:movieId" element={<MovieDetailPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/watchlist" element={<LibraryPage />} />
            <Route path="/library/favourites" element={<LibraryPage />} />
            <Route path="/library/history" element={<LibraryPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
            <Route path="/preferences/taste" element={<PreferencesPage />} />
            <Route path="/preferences/recommendations" element={<PreferencesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountPage />} />
          </Routes>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Veya Luma — Application Shell, Routing & Page States', () => {
  describe('Navigation & Product Identity', () => {
    it('renders desktop navigation with clear Movie Discovery identity', () => {
      render(<App />);

      // Brand & Identity
      expect(screen.getAllByText('Veya Luma').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Movie Discovery').length).toBeGreaterThan(0);

      // Primary Navigation Links inside Header
      const primaryNav = screen.getByRole('navigation', { name: 'Primary Navigation' });
      expect(within(primaryNav).getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/discover');
      expect(within(primaryNav).getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
      expect(within(primaryNav).getByRole('link', { name: 'Taste Discovery' })).toHaveAttribute('href', '/taste-discovery');
      expect(within(primaryNav).getByRole('link', { name: 'Recommendations' })).toHaveAttribute('href', '/recommendations');
      expect(within(primaryNav).getByRole('link', { name: 'My Library' })).toHaveAttribute('href', '/library');

      // Secondary Navigation Links inside Header
      const secondaryNav = screen.getByRole('navigation', { name: 'Secondary Navigation' });
      expect(within(secondaryNav).getByRole('link', { name: 'Preferences' })).toHaveAttribute('href', '/preferences');
      expect(within(secondaryNav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
      expect(within(secondaryNav).getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');

      // Ensure unsupported products are not exposed as functional navigation
      expect(screen.queryByText('Games (Preview)')).not.toBeInTheDocument();
      expect(screen.queryByText('Anime (Preview)')).not.toBeInTheDocument();
    });
  });

  describe('Route Destinations', () => {
    it('navigates to Discover at /discover', () => {
      renderWithRouter('/discover');
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
      expect(screen.getByText('Curated Resonance Horizons')).toBeInTheDocument();
    });

    it('navigates to Search at /search with intent query filters', () => {
      renderWithRouter('/search');
      expect(screen.getByRole('heading', { name: /Find your next film|Search Cinema/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search films, directors, genres, moods|Search by title/i)).toBeInTheDocument();
      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
    });

    it('navigates to Taste Discovery at /taste-discovery with cinematic onboarding', () => {
      renderWithRouter('/taste-discovery');
      expect(screen.getByRole('heading', { level: 1, name: 'Tell Veya Luma what feels like you.' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start discovering' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip setup & explore' })).toBeInTheDocument();
    });

    it('navigates to Recommendations at /recommendations with algorithmic transparency', () => {
      renderWithRouter('/recommendations');
      expect(screen.getByRole('heading', { name: 'Your Recommendations' })).toBeInTheDocument();
      expect(screen.getByText(/Why this fits:/i)).toBeInTheDocument();
      expect(screen.getByText(/Taste divergence:/i)).toBeInTheDocument();
    });

    it('navigates to Library subroute /library/watchlist', () => {
      renderWithRouter('/library/watchlist');
      expect(screen.getByRole('heading', { name: 'My Library' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Watchlist/i })).toHaveAttribute('aria-current', 'page');
    });

    it('navigates to Library subroute /library/favourites', () => {
      renderWithRouter('/library/favourites');
      expect(screen.getByRole('heading', { name: 'My Library' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Favourites/i })).toHaveAttribute('aria-current', 'page');
    });

    it('navigates to Library subroute /library/history', () => {
      renderWithRouter('/library/history');
      expect(screen.getByRole('heading', { name: 'My Library' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Watch History/i })).toHaveAttribute('aria-current', 'page');
    });

    it('navigates to Movie Detail Dossier at /movies/:movieId', () => {
      renderWithRouter('/movies/blade-runner-2049');
      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
      expect(screen.getByText('Algorithmic Transparency Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Dimensional Resonance Profile')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add to Watchlist|In Watchlist/i })).toBeInTheDocument();
    });

    it('navigates to Preferences subroutes (/preferences/taste, /preferences/recommendations)', () => {
      renderWithRouter('/preferences/taste');
      expect(screen.getByRole('heading', { name: 'Discovery Preferences' })).toBeInTheDocument();
      expect(screen.getByText('Active Genre Affinities')).toBeInTheDocument();

      cleanup();

      // Recommendation Calibration subroute
      renderWithRouter('/preferences/recommendations');
      expect(screen.getByText('Algorithmic Novelty & Exploration')).toBeInTheDocument();
      expect(screen.getByText(/Novelty Appetite/i)).toBeInTheDocument();
    });

    it('navigates to User Profile at /profile', () => {
      renderWithRouter('/profile');
      expect(screen.getByRole('heading', { name: 'User Profile' })).toBeInTheDocument();
      expect(screen.getByText('Curator 0x2A9F')).toBeInTheDocument();
      expect(screen.getByText('Curatorial Level I')).toBeInTheDocument();
    });

    it('navigates to Account & Privacy at /account', () => {
      renderWithRouter('/account');
      expect(screen.getByRole('heading', { name: 'Account & Privacy' })).toBeInTheDocument();
      expect(screen.getByText('Data Sanctity & Privacy')).toBeInTheDocument();
      expect(screen.getByText('Taste Vector Management')).toBeInTheDocument();
    });
  });

  describe('Page Multi-State Support (loading, empty, error, populated)', () => {
    it('supports switching to Loading, Empty, and Error states on Discover', () => {
      renderWithRouter('/discover');

      // Default: Populated
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();

      // Switch to Loading
      const loadingBtn = screen.getByRole('button', { name: 'Loading' });
      fireEvent.click(loadingBtn);
      expect(screen.getByText('Synthesizing your cinematic discovery horizons...')).toBeInTheDocument();

      // Switch to Empty
      const emptyBtn = screen.getByRole('button', { name: 'Empty' });
      fireEvent.click(emptyBtn);
      expect(screen.getByText('No Discovery Vectors Found')).toBeInTheDocument();

      // Switch to Error
      const errorBtn = screen.getByRole('button', { name: 'Error' });
      fireEvent.click(errorBtn);
      expect(screen.getByText('Discovery Feed Interrupted')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('supports switching states on Search page', () => {
      renderWithRouter('/search');

      const loadingBtn = screen.getByRole('button', { name: 'Loading' });
      fireEvent.click(loadingBtn);
      expect(screen.getByText('Searching the cinematic catalog...')).toBeInTheDocument();

      const errorBtn = screen.getByRole('button', { name: 'Error' });
      fireEvent.click(errorBtn);
      expect(screen.getByText('Search Index Interrupted')).toBeInTheDocument();

      const emptyBtn = screen.getByRole('button', { name: 'Empty' });
      fireEvent.click(emptyBtn);
      expect(screen.getByText('No Films Found')).toBeInTheDocument();
    });

    it('supports switching states on Movie Detail Dossier', () => {
      renderWithRouter('/movies/solaris-1972');

      const loadingBtn = screen.getByRole('button', { name: 'Loading' });
      fireEvent.click(loadingBtn);
      expect(screen.getByText('Decrypting cinematic dossier...')).toBeInTheDocument();

      const errorBtn = screen.getByRole('button', { name: 'Error' });
      fireEvent.click(errorBtn);
      expect(screen.getByText('Film Dossier Unavailable')).toBeInTheDocument();

      const emptyBtn = screen.getByRole('button', { name: 'Empty' });
      fireEvent.click(emptyBtn);
      expect(screen.getByText('Film Record Not Found')).toBeInTheDocument();
    });
  });
});
