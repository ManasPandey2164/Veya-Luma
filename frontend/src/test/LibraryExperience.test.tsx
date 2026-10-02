import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryProvider, type LibraryState } from '../context';
import { LibraryPage } from '../pages/LibraryPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { AppShell } from '../components/ui/AppShell';

afterEach(() => {
  cleanup();
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithLibrary(initialEntry: string, initialLibraryState?: Partial<LibraryState>) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LibraryProvider initialState={initialLibraryState}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AppShell>
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/watchlist" element={<LibraryPage />} />
              <Route path="/library/favourites" element={<LibraryPage />} />
              <Route path="/library/history" element={<LibraryPage />} />
              <Route path="/movies/:movieId" element={<MovieDetailPage />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </LibraryProvider>
    </QueryClientProvider>
  );
}

describe('Veya Luma — Step 9: My Library Experience', () => {
  describe('Library Overview (/library)', () => {
    it('renders the library overview with curatorial title, sub-navigation tabs, and section previews', () => {
      renderWithLibrary('/library');

      // Top title and curatorial eyebrow
      expect(screen.getByRole('heading', { level: 1, name: 'My Library' })).toBeInTheDocument();
      expect(screen.getByText('CURATORIAL PANTHEON')).toBeInTheDocument();

      // Navigation tabs with counts
      const libraryNav = screen.getByRole('navigation', { name: 'Library Navigation' });
      const overviewTab = within(libraryNav).getByRole('link', { name: /Overview/i });
      const watchlistTab = within(libraryNav).getByRole('link', { name: /Watchlist/i });
      const favouritesTab = within(libraryNav).getByRole('link', { name: /Favourites/i });
      const historyTab = within(libraryNav).getByRole('link', { name: /Watch History/i });

      expect(overviewTab).toHaveAttribute('aria-current', 'page');
      expect(watchlistTab).not.toHaveAttribute('aria-current');
      expect(favouritesTab).not.toHaveAttribute('aria-current');
      expect(historyTab).not.toHaveAttribute('aria-current');

      // Section preview headings
      expect(screen.getByRole('heading', { level: 2, name: 'Watchlist' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Favourites' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Watch History' })).toBeInTheDocument();

      // "View full collection" links
      const viewCollectionLinks = screen.getAllByRole('link', { name: /View full collection/i });
      expect(viewCollectionLinks[0]).toHaveAttribute('href', '/library/watchlist');
      expect(viewCollectionLinks[1]).toHaveAttribute('href', '/library/favourites');
      expect(viewCollectionLinks[2]).toHaveAttribute('href', '/library/history');
    });

    it('displays movie previews in overview and allows clicking to navigate to Movie Details', () => {
      renderWithLibrary('/library');

      // Check for Blade Runner 2049 in the populated overview previews
      const bladeRunnerLinks = screen.getAllByRole('link', { name: /Blade Runner 2049/i });
      expect(bladeRunnerLinks.length).toBeGreaterThan(0);
      expect(bladeRunnerLinks[0]).toHaveAttribute('href', '/movies/blade-runner-2049');
    });
  });

  describe('Watchlist View (/library/watchlist)', () => {
    it('renders the dedicated watchlist collection with active tab styling and MovieCards', () => {
      renderWithLibrary('/library/watchlist');

      const libraryNav = screen.getByRole('navigation', { name: 'Library Navigation' });
      const watchlistTab = within(libraryNav).getByRole('link', { name: /Watchlist/i });
      expect(watchlistTab).toHaveAttribute('aria-current', 'page');

      // Watchlisted movie present from fixtures
      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);
    });

    it('removes a movie immediately from the watchlist when clicking remove', () => {
      renderWithLibrary('/library/watchlist');

      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);

      // Find remove button for Blade Runner 2049
      const removeBtns = screen.getAllByRole('button', { name: 'Remove Blade Runner 2049 from watchlist' });
      fireEvent.click(removeBtns[0]);

      // Blade Runner 2049 should now be removed from watchlist
      expect(screen.queryByText('Blade Runner 2049')).not.toBeInTheDocument();
    });
  });

  describe('Favourites View (/library/favourites)', () => {
    it('renders the favourites collection with active tab styling', () => {
      renderWithLibrary('/library/favourites');

      const libraryNav = screen.getByRole('navigation', { name: 'Library Navigation' });
      const favouritesTab = within(libraryNav).getByRole('link', { name: /Favourites/i });
      expect(favouritesTab).toHaveAttribute('aria-current', 'page');

      // Blade Runner 2049 is in initial favourites fixtures
      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);
    });

    it('removes an item from favourites immediately when clicking remove', () => {
      renderWithLibrary('/library/favourites');

      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);

      const removeBtns = screen.getAllByRole('button', { name: 'Remove Blade Runner 2049 from favourites' });
      fireEvent.click(removeBtns[0]);

      expect(screen.queryByText('Blade Runner 2049')).not.toBeInTheDocument();
    });
  });

  describe('History View (/library/history)', () => {
    it('renders deterministic development watch history with notice badge', () => {
      renderWithLibrary('/library/history');

      const libraryNav = screen.getByRole('navigation', { name: 'Library Navigation' });
      const historyTab = within(libraryNav).getByRole('link', { name: /Watch History/i });
      expect(historyTab).toHaveAttribute('aria-current', 'page');

      expect(screen.getByText('Deterministic Development Chronicle')).toBeInTheDocument();
      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);
    });

    it('allows removing an entry from history', () => {
      renderWithLibrary('/library/history');

      const removeBtn = screen.getByRole('button', { name: 'Remove Blade Runner 2049 from history' });
      fireEvent.click(removeBtn);

      expect(screen.queryByText('Blade Runner 2049')).not.toBeInTheDocument();
    });
  });

  describe('Empty States & Discover CTAs', () => {
    it('renders the specified empty state and CTA for Watchlist when empty', () => {
      renderWithLibrary('/library/watchlist', { watchlistIds: [] });

      expect(screen.getByText('Your watchlist is waiting.')).toBeInTheDocument();
      const ctaBtn = screen.getByRole('button', { name: 'Discover films' });
      expect(ctaBtn).toBeInTheDocument();

      fireEvent.click(ctaBtn);
      // Navigates to /discover
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
    });

    it('renders the specified empty state and CTA for Favourites when empty', () => {
      renderWithLibrary('/library/favourites', { favouriteIds: [] });

      expect(screen.getByText('Keep the films that stay with you.')).toBeInTheDocument();
      const ctaBtn = screen.getByRole('button', { name: 'Explore films' });
      expect(ctaBtn).toBeInTheDocument();

      fireEvent.click(ctaBtn);
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
    });

    it('renders the specified empty state and CTA for History when empty', () => {
      renderWithLibrary('/library/history', { historyIds: [] });

      expect(screen.getByText('Your viewing history will appear here.')).toBeInTheDocument();
      const ctaBtn = screen.getByRole('button', { name: 'Start discovering' });
      expect(ctaBtn).toBeInTheDocument();

      fireEvent.click(ctaBtn);
      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
    });
  });

  describe('Shared State Synchronization (Movie Details ↔ Library)', () => {
    it('reflects changes made in Movie Details immediately in Library', () => {
      // Start with Arrival (arrival-2016) NOT in watchlist
      renderWithLibrary('/movies/arrival-2016', {
        watchlistIds: [],
        favouriteIds: [],
        historyIds: [],
      });

      // Arrival is rendered
      expect(screen.getByRole('heading', { level: 1, name: 'Arrival' })).toBeInTheDocument();

      // Click "Add to Watchlist" on MovieDetailPage
      const addWatchlistBtn = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(addWatchlistBtn);

      // Now navigate to /library/watchlist
      const nav = screen.getByRole('navigation', { name: 'Primary Navigation' });
      const libraryLink = within(nav).getByRole('link', { name: 'My Library' });
      fireEvent.click(libraryLink);

      // We should be on /library overview where Arrival is in the watchlist section
      expect(screen.getByText('Arrival')).toBeInTheDocument();
    });
  });

  describe('StateSwitcher Multi-State Simulation', () => {
    it('switches between populated, loading, and error states', () => {
      renderWithLibrary('/library/watchlist');

      // Switch to loading
      const loadingBtn = screen.getByRole('button', { name: 'Loading' });
      fireEvent.click(loadingBtn);
      expect(screen.getByText(/Retrieving your watchlist.../i)).toBeInTheDocument();

      // Switch to error
      const errorBtn = screen.getByRole('button', { name: 'Error' });
      fireEvent.click(errorBtn);
      expect(screen.getByText('Archive Signal Interrupted')).toBeInTheDocument();

      // Retry restores populated state
      const retryBtn = screen.getByRole('button', { name: 'Re-establish Signal' });
      fireEvent.click(retryBtn);
      expect(screen.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);
    });
  });
});
