import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryProvider, PreferencesProvider, type TastePreferencesState, type RecommendationPreferencesState, type AccountPreferencesState } from '../context';
import { ProfilePage } from '../pages/ProfilePage';
import { PreferencesPage } from '../pages/PreferencesPage';
import { AccountPage } from '../pages/AccountPage';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { SearchPage } from '../pages/SearchPage';
import { LibraryPage } from '../pages/LibraryPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = '/',
    initialTasteState,
    initialRecommendationPreferences,
    initialAccountPreferences,
  }: {
    initialRoute?: string;
    initialTasteState?: Partial<TastePreferencesState>;
    initialRecommendationPreferences?: Partial<RecommendationPreferencesState>;
    initialAccountPreferences?: Partial<AccountPreferencesState>;
  } = {}
) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider
        initialTasteState={initialTasteState}
        initialRecommendationPreferences={initialRecommendationPreferences}
        initialAccountPreferences={initialAccountPreferences}
      >
        <LibraryProvider>
          <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
        </LibraryProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

describe('Veya Luma — Step 10: Profile, Preferences & Account Specifications', () => {
  // =========================================================================
  // 1. Profile Page (/profile)
  // =========================================================================
  describe('Profile Page (/profile)', () => {
    it('renders the personal curatorial identity and clearance level', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>,
        { initialRoute: '/profile' }
      );

      // Section Header
      expect(screen.getByRole('heading', { level: 1, name: 'User Profile' })).toBeInTheDocument();
      expect(screen.getByText('TASTE IDENTITY & CINEMATIC DNA')).toBeInTheDocument();

      // Curator Identity
      expect(screen.getByText('Curator 0x2A9F')).toBeInTheDocument();
      expect(screen.getByText('Curatorial Level I')).toBeInTheDocument();
      expect(screen.getByText(/Atmospheric Speculative Explorer/i)).toBeInTheDocument();

      // Personal navigation tabs
      expect(screen.getByRole('navigation', { name: 'Personal Area Navigation' })).toBeInTheDocument();
    });

    it('displays active taste signals (favorite genres, moods, themes)', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>,
        { initialRoute: '/profile' }
      );

      // Genre tags
      expect(screen.getAllByText('Sci-Fi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Neo-Noir')[0]).toBeInTheDocument();

      // Mood tags
      expect(screen.getByText('Atmospheric')).toBeInTheDocument();
      expect(screen.getByText('Contemplative')).toBeInTheDocument();

      // Theme tags
      expect(screen.getByText('Artificial Intelligence & Identity')).toBeInTheDocument();
    });

    it('summarizes library metrics (watchlist, favourites, history)', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>,
        { initialRoute: '/profile' }
      );

      expect(screen.getByText('Saved to Watchlist')).toBeInTheDocument();
      expect(screen.getByText('Adored Favourites')).toBeInTheDocument();
      expect(screen.getByText('Screening History')).toBeInTheDocument();
    });

    it('gracefully communicates incomplete taste state when taste is uncalibrated', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/taste-discovery" element={<div>Taste Discovery Destination</div>} />
        </Routes>,
        {
          initialRoute: '/profile',
          initialTasteState: { isTasteDiscovered: false },
        }
      );

      // Shows unformed empty state
      expect(screen.getByText('Cinematic DNA Unformed')).toBeInTheDocument();
      expect(
        screen.getByText(/Your taste profile is waiting to be discovered/i)
      ).toBeInTheDocument();

      // CTA to start Taste Discovery
      const startBtn = screen.getByRole('button', { name: /Start Taste Discovery/i });
      expect(startBtn).toBeInTheDocument();

      fireEvent.click(startBtn);
      expect(screen.getByText('Taste Discovery Destination')).toBeInTheDocument();
    });

    it('supports page simulation state switcher (loading, empty, error)', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>,
        { initialRoute: '/profile' }
      );

      // Switch to Loading
      fireEvent.click(screen.getByRole('button', { name: 'Loading' }));
      expect(screen.getByText('Analyzing cinematic DNA vectors...')).toBeInTheDocument();

      // Switch to Error
      fireEvent.click(screen.getByRole('button', { name: 'Error' }));
      expect(screen.getByText('Profile Readout Interrupted')).toBeInTheDocument();

      // Switch to Empty
      fireEvent.click(screen.getByRole('button', { name: 'Empty' }));
      expect(screen.getByText('Cinematic DNA Unformed')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Taste Preferences (/preferences/taste)
  // =========================================================================
  describe('Taste Preferences (/preferences/taste)', () => {
    it('renders the taste preferences surface with canonical taxonomies and active selections', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
        </Routes>,
        { initialRoute: '/preferences/taste' }
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Discovery Preferences' })).toBeInTheDocument();
      expect(screen.getByText('Active Genre Affinities')).toBeInTheDocument();
      expect(screen.getByText('Atmospheric Mood Horizons')).toBeInTheDocument();
      expect(screen.getByText('Thematic Motifs & Inquiries')).toBeInTheDocument();
      expect(screen.getByText('Preferred Languages & Audio Perspective')).toBeInTheDocument();
      expect(screen.getByText(/Cinematic Anchors/i)).toBeInTheDocument();
    });

    it('allows toggling genre affinities dynamically', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
        </Routes>,
        { initialRoute: '/preferences/taste' }
      );

      // Click on "Drama" tag to select/unselect
      const dramaTag = screen.getByRole('button', { name: 'Drama' });
      expect(dramaTag).toBeInTheDocument();
      fireEvent.click(dramaTag);

      // Status notification appears
      expect(screen.getByRole('status')).toHaveTextContent(/Updated genre affinity: Drama/i);
    });

    it('allows toggling moods and themes', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
        </Routes>,
        { initialRoute: '/preferences/taste' }
      );

      // Toggle mood
      const moodTag = screen.getByRole('button', { name: 'Melancholic' });
      fireEvent.click(moodTag);
      expect(screen.getByRole('status')).toHaveTextContent(/Updated mood signal: Melancholic/i);

      // Toggle theme
      const themeTag = screen.getByRole('button', { name: 'Grief & Transcendence' });
      fireEvent.click(themeTag);
      expect(screen.getByRole('status')).toHaveTextContent(/Updated thematic focus: Grief & Transcendence/i);
    });

    it('allows resetting taste preferences to baseline', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
        </Routes>,
        { initialRoute: '/preferences/taste' }
      );

      const resetBtn = screen.getByRole('button', { name: /Reset to Baseline/i });
      fireEvent.click(resetBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/Taste signals restored to baseline/i);
    });
  });

  // =========================================================================
  // 3. Recommendation Preferences (/preferences/recommendations)
  // =========================================================================
  describe('Recommendation Preferences (/preferences/recommendations)', () => {
    it('renders recommendation tuning with human-friendly controls', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
        </Routes>,
        { initialRoute: '/preferences/recommendations' }
      );

      expect(screen.getByText('Algorithmic Novelty & Exploration')).toBeInTheDocument();
      expect(screen.getByText('How adventurous should your recommendations be?')).toBeInTheDocument();
      expect(screen.getByText('Comforting Familiarity')).toBeInTheDocument();
      expect(screen.getByText('Balanced Horizon')).toBeInTheDocument();
      expect(screen.getByText('Daring Exploration')).toBeInTheDocument();

      // Sliders with readable labels
      expect(screen.getByText(/Novelty Appetite/i)).toBeInTheDocument();
      expect(screen.getByText(/MMR Diversity Dispersion/i)).toBeInTheDocument();
      expect(screen.getByText(/Independent & Art-House Weighting/i)).toBeInTheDocument();
    });

    it('allows selecting exploration appetite preset', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
        </Routes>,
        { initialRoute: '/preferences/recommendations' }
      );

      const adventurousPreset = screen.getByRole('button', { name: /Daring Exploration/i });
      fireEvent.click(adventurousPreset);

      expect(screen.getByRole('status')).toHaveTextContent(/Exploration level set to Daring Exploration/i);
    });

    it('allows adjusting novelty appetite slider', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
        </Routes>,
        { initialRoute: '/preferences/recommendations' }
      );

      const slider = screen.getByLabelText('Novelty Appetite');
      fireEvent.change(slider, { target: { value: 85 } });

      expect(screen.getByText(/85% \(High Discovery\)/i)).toBeInTheDocument();
    });

    it('allows resetting recommendation preferences to defaults', () => {
      renderWithProviders(
        <Routes>
          <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
        </Routes>,
        { initialRoute: '/preferences/recommendations' }
      );

      const resetBtn = screen.getByRole('button', { name: /Reset Recommendations/i });
      fireEvent.click(resetBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/Recommendation horizons restored to baseline/i);
    });
  });

  // =========================================================================
  // 4. Account Settings (/account)
  // =========================================================================
  describe('Account Settings (/account)', () => {
    it('renders the account settings and appearance theme controls', () => {
      renderWithProviders(
        <Routes>
          <Route path="/account" element={<AccountPage />} />
        </Routes>,
        { initialRoute: '/account' }
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Account & Privacy' })).toBeInTheDocument();
      expect(screen.getByText('Appearance & Theme')).toBeInTheDocument();
      expect(screen.getByText('Dark Theme')).toBeInTheDocument();
      expect(screen.getByText('Light Theme')).toBeInTheDocument();
      expect(screen.getByText('Interface & Accessibility')).toBeInTheDocument();
      expect(screen.getByText('Data Sanctity & Privacy')).toBeInTheDocument();
      expect(screen.getByText('Taste Vector Management')).toBeInTheDocument();
    });

    it('switches between Dark and Light theme seamlessly', () => {
      renderWithProviders(
        <Routes>
          <Route path="/account" element={<AccountPage />} />
        </Routes>,
        { initialRoute: '/account' }
      );

      const lightThemeBtn = screen.getByRole('button', { name: /Light Theme/i });
      fireEvent.click(lightThemeBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/Base theme set to Light/i);

      const darkThemeBtn = screen.getByRole('button', { name: /Dark Theme/i });
      fireEvent.click(darkThemeBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/Base theme set to Dark/i);
    });

    it('toggles interface accessibility options (reduced motion, compact mode)', () => {
      renderWithProviders(
        <Routes>
          <Route path="/account" element={<AccountPage />} />
        </Routes>,
        { initialRoute: '/account' }
      );

      // Reduced motion toggle
      const reducedMotionBtn = screen.getByText('Reduced Motion').closest('div')!.parentElement!.querySelector('button')!;
      fireEvent.click(reducedMotionBtn);
      expect(screen.getByRole('status')).toHaveTextContent(/Motion preference set to reduced/i);

      // Compact mode toggle
      const compactBtn = screen.getByText('Compact Shelf Mode').closest('div')!.parentElement!.querySelector('button')!;
      fireEvent.click(compactBtn);
      expect(screen.getByRole('status')).toHaveTextContent(/Compact mode enabled/i);
    });

    it('provides vector export and vector reset actions', () => {
      // Mock window URL and createElement for JSON export
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      renderWithProviders(
        <Routes>
          <Route path="/account" element={<AccountPage />} />
        </Routes>,
        { initialRoute: '/account' }
      );

      // Export button
      const exportBtn = screen.getByRole('button', { name: /Export Cinematic DNA/i });
      fireEvent.click(exportBtn);
      expect(screen.getByRole('status')).toHaveTextContent(/Cinematic DNA exported successfully/i);

      // Reset button
      const resetBtn = screen.getByRole('button', { name: /Reset Taste Vectors/i });
      fireEvent.click(resetBtn);
      expect(screen.getByRole('status')).toHaveTextContent(/Taste vectors successfully reset/i);
      clickSpy.mockRestore();
    });
  });

  // =========================================================================
  // 5. Cross-Navigation
  // =========================================================================
  describe('Cross-Navigation & Interconnectivity', () => {
    it('navigates cleanly across all personal control surfaces', () => {
      renderWithProviders(
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/preferences/taste" element={<PreferencesPage tab="taste" />} />
          <Route path="/preferences/recommendations" element={<PreferencesPage tab="recommendations" />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>,
        { initialRoute: '/profile' }
      );

      // From Profile to Taste Preferences
      const tasteNavLinks = screen.getAllByRole('link', { name: /Taste Preferences/i });
      fireEvent.click(tasteNavLinks[0]);
      expect(screen.getByText('Active Genre Affinities')).toBeInTheDocument();

      // From Taste Preferences to Recommendation Calibration
      const recsNavLinks = screen.getAllByRole('link', { name: /Recommendation Calibration/i });
      fireEvent.click(recsNavLinks[0]);
      expect(screen.getByText('Algorithmic Novelty & Exploration')).toBeInTheDocument();

      // From Recommendation Calibration to Account & Sanctuary
      const accountNavLinks = screen.getAllByRole('link', { name: /Account & Sanctuary/i });
      fireEvent.click(accountNavLinks[0]);
      expect(screen.getByRole('heading', { level: 1, name: 'Account & Privacy' })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Regression Protection
  // =========================================================================
  describe('Regression Protection for Primary Discovery Pages', () => {
    it('ensures Discover page renders with personal taste context', () => {
      renderWithProviders(
        <Routes>
          <Route path="/discover" element={<DiscoverPage />} />
        </Routes>,
        { initialRoute: '/discover' }
      );

      expect(screen.getByText('Where Cinema Meets Personal Resonance')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Blade Runner 2049' })).toBeInTheDocument();
    });

    it('ensures Search page renders correctly', () => {
      renderWithProviders(
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>,
        { initialRoute: '/search' }
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Find your next film.' })).toBeInTheDocument();
    });

    it('ensures Library page renders correctly', () => {
      renderWithProviders(
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
        </Routes>,
        { initialRoute: '/library' }
      );

      expect(screen.getByRole('heading', { level: 1, name: 'My Library' })).toBeInTheDocument();
    });

    it('ensures Movie Detail page renders correctly', () => {
      renderWithProviders(
        <Routes>
          <Route path="/movies/:movieId" element={<MovieDetailPage />} />
        </Routes>,
        { initialRoute: '/movies/blade-runner-2049' }
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Blade Runner 2049' })).toBeInTheDocument();
    });

    it('ensures Taste Discovery onboarding page renders correctly', () => {
      renderWithProviders(
        <Routes>
          <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
        </Routes>,
        { initialRoute: '/taste-discovery' }
      );

      expect(
        screen.getByRole('heading', { level: 1, name: 'Tell Veya Luma what feels like you.' })
      ).toBeInTheDocument();
    });
  });
});
