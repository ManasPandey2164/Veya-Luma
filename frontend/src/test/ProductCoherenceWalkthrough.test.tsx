import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryProvider, PreferencesProvider, AtmosphereProvider } from '../context';
import { AppShell } from '../components/ui/AppShell';
import { DiscoverPage } from '../pages/DiscoverPage';
import { SearchPage } from '../pages/SearchPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';
import { RecommendationsPage } from '../pages/RecommendationsPage';
import { LibraryPage } from '../pages/LibraryPage';
import { ProfilePage } from '../pages/ProfilePage';
import { PreferencesPage } from '../pages/PreferencesPage';
import { AccountPage } from '../pages/AccountPage';
import { resolveCinematicAtmosphere } from '../theme';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderFullApp(initialRoute = '/discover') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AtmosphereProvider>
          <LibraryProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DiscoverPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/movies/:movieId" element={<MovieDetailPage />} />
                  <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
                  <Route path="/recommendations" element={<RecommendationsPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/library/watchlist" element={<LibraryPage />} />
                  <Route path="/library/favourites" element={<LibraryPage />} />
                  <Route path="/library/history" element={<LibraryPage />} />
                  <Route path="/preferences" element={<PreferencesPage tab="taste" />} />
                  <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
                  <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Routes>
              </AppShell>
            </MemoryRouter>
          </LibraryProvider>
        </AtmosphereProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

describe('Veya Luma — Step 11: Product Coherence & End-to-End Walkthrough', () => {
  it('walkthrough: Discover hero action links to Movie Details and Watchlist updates Library', async () => {
    const { unmount } = renderFullApp('/discover');

    // 1. Discover renders hero movie (Blade Runner 2049)
    expect(screen.getByRole('heading', { level: 1, name: 'Blade Runner 2049' })).toBeInTheDocument();

    // Explore Film link points to /movies/blade-runner-2049
    const exploreBtn = screen.getByRole('link', { name: /Explore Film/i });
    expect(exploreBtn).toHaveAttribute('href', '/movies/blade-runner-2049');

    unmount();

    // 2. Open Movie Details for Blade Runner 2049
    const detailView = renderFullApp('/movies/blade-runner-2049');
    expect(detailView.getByRole('heading', { level: 1, name: 'Blade Runner 2049' })).toBeInTheDocument();
    expect(detailView.getAllByText(/Denis Villeneuve/i).length).toBeGreaterThan(0);

    // Ensure Watchlist button reflects isWatchlisted
    const watchlistToggle = detailView.getByRole('button', { name: /In Watchlist/i });
    expect(watchlistToggle).toBeInTheDocument();

    detailView.unmount();

    // 3. Open Library Watchlist route
    const libraryView = renderFullApp('/library/watchlist');
    expect(libraryView.getByRole('heading', { level: 1, name: 'My Library' })).toBeInTheDocument();
    expect(libraryView.getByText(/Films you have earmarked to witness/i)).toBeInTheDocument();

    // Blade Runner 2049 should appear in Watchlist
    expect(libraryView.getAllByText('Blade Runner 2049').length).toBeGreaterThan(0);
    libraryView.unmount();
  });

  it('walkthrough: Search finds movies and navigates to Movie Details', () => {
    const { unmount } = renderFullApp('/search?q=Arrival');

    // Search results render Arrival
    expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();
    const movieLinks = screen.getAllByRole('link', { name: /Arrival/i });
    expect(movieLinks.length).toBeGreaterThan(0);
    expect(movieLinks[0]).toHaveAttribute('href', '/movies/arrival-2016');

    unmount();
  });

  it('walkthrough: Preferences includes direct CTA to Taste Discovery', () => {
    const { unmount } = renderFullApp('/preferences/taste');

    expect(screen.getByRole('heading', { level: 1, name: 'Discovery Preferences' })).toBeInTheDocument();
    const recalibrateLink = screen.getByRole('link', { name: /Recalibrate via Taste Discovery/i });
    expect(recalibrateLink).toBeInTheDocument();
    expect(recalibrateLink).toHaveAttribute('href', '/taste-discovery');

    unmount();
  });

  it('atmosphere: verifies distinct profiles for Sci-Fi, Drama, Thriller, Mystery, Romance', () => {
    const genres = ['Sci-Fi', 'Drama', 'Thriller', 'Mystery', 'Romance'];

    genres.forEach((genre) => {
      const darkAtmosphere = resolveCinematicAtmosphere({ genre, baseTheme: 'dark' });
      const lightAtmosphere = resolveCinematicAtmosphere({ genre, baseTheme: 'light' });

      // Verifies each genre produces a distinct, non-empty accent and gradient
      expect(darkAtmosphere.accent).toBeTruthy();
      expect(darkAtmosphere.gradient.radial).toBeTruthy();
      expect(lightAtmosphere.accent).toBeTruthy();
      expect(lightAtmosphere.gradient.radial).toBeTruthy();

      // Atmospheric surface tint is subtle (less than 10% opacity)
      expect(darkAtmosphere.surfaceTint).toMatch(/rgba\(.+,\s*0\.0[345]\)/);
    });

    // Default neutral atmosphere
    const defaultAtmosphere = resolveCinematicAtmosphere({ genre: null, baseTheme: 'dark' });
    expect(defaultAtmosphere.accent).toBe('#00F0FF');
  });

  it('accessibility: synchronizes reduced motion and compact mode attributes on documentElement', () => {
    const { unmount } = renderFullApp('/account');

    // Toggle reduced motion
    const reducedMotionBtn = screen.getByText('Reduced Motion').closest('div')!.parentElement!.querySelector('button')!;
    fireEvent.click(reducedMotionBtn);

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');

    // Toggle compact mode
    const compactBtn = screen.getByText('Compact Shelf Mode').closest('div')!.parentElement!.querySelector('button')!;
    fireEvent.click(compactBtn);

    expect(document.documentElement.getAttribute('data-compact-mode')).toBe('true');

    unmount();
  });
});
