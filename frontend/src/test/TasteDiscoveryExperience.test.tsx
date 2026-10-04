import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';

vi.mock('../services/preferenceApi', () => ({
  fetchPreferencesApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  upsertPreferenceApi: vi.fn().mockResolvedValue({ id: 'mock-pref', preference_value: 1.0 }),
  resolveTaxonomyNodeId: vi.fn().mockReturnValue(1),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderTasteDiscoveryPage(initialUrl = '/taste-discovery') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
          <Route path="/discover" element={<div data-testid="discover-page-stub">Discover Destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Step 8 — Taste Discovery Experience Specifications', () => {
  describe('Initial State & Welcome Screen', () => {
    it('opens Taste Discovery correctly without crashing and displays the welcome interface', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      // Hero editorial headline
      expect(
        screen.getByRole('heading', { level: 1, name: 'Tell Veya Luma what feels like you.' })
      ).toBeInTheDocument();

      // Explanatory guidance text
      expect(
        screen.getByText(/A few instinctive choices will help shape future recommendations/i)
      ).toBeInTheDocument();

      // Action triggers
      expect(screen.getByRole('button', { name: 'Start discovering' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip setup & explore' })).toBeInTheDocument();
    });

    it('navigates to Discover when skip setup is clicked', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      const skipBtn = screen.getByRole('button', { name: 'Skip setup & explore' });
      fireEvent.click(skipBtn);

      expect(screen.getByTestId('discover-page-stub')).toBeInTheDocument();
    });
  });

  describe('Starting Flow & Movie Selection Step', () => {
    it('clicking Start discovering moves into the first selection step (Films)', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      const startBtn = screen.getByRole('button', { name: 'Start discovering' });
      fireEvent.click(startBtn);

      // Verify Step 1 header
      expect(
        screen.getByRole('heading', { level: 2, name: 'Which of these would you watch?' })
      ).toBeInTheDocument();

      // Progress bar readout
      expect(screen.getByText(/Step 1 of 5 • Films/i)).toBeInTheDocument();

      // Movie seeds rendered
      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
      expect(screen.getByText('Parasite')).toBeInTheDocument();
      expect(screen.getByText('Arrival')).toBeInTheDocument();
    });

    it('allows selecting and deselecting movies with visual feedback', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      // Start flow
      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));

      // Find Blade Runner 2049 card
      const bladeRunnerCard = screen.getByRole('button', { name: /Blade Runner 2049/i });
      expect(bladeRunnerCard).toHaveAttribute('aria-pressed', 'false');

      // Click to select
      fireEvent.click(bladeRunnerCard);
      expect(bladeRunnerCard).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('Selected').length).toBeGreaterThan(0);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Click again to deselect
      fireEvent.click(bladeRunnerCard);
      expect(bladeRunnerCard).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  describe('Genre Selection Step', () => {
    it('allows navigating to Genres and selecting/deselecting genres', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      // Move to Step 1 (Movies)
      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));

      // Advance to Step 2 (Genres)
      const continueToGenres = screen.getByRole('button', { name: 'Continue to Genres' });
      fireEvent.click(continueToGenres);

      // Verify Step 2 header
      expect(
        screen.getByRole('heading', { level: 2, name: 'Which genres resonate most with you?' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Step 2 of 5 • Genres/i)).toBeInTheDocument();

      // Select Sci-Fi genre option
      const sciFiOption = screen.getByRole('button', { name: /Sci-Fi/i });
      expect(sciFiOption).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(sciFiOption);
      expect(sciFiOption).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Select Thriller
      const thrillerOption = screen.getByRole('button', { name: /Thriller/i });
      fireEvent.click(thrillerOption);
      expect(thrillerOption).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // Deselect Sci-Fi
      fireEvent.click(sciFiOption);
      expect(sciFiOption).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  describe('Mood Selection Step', () => {
    it('allows advancing to Moods and toggling atmospheric mood options', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Moods' }));

      // Verify Step 3 header
      expect(
        screen.getByRole('heading', { level: 2, name: 'What emotional atmosphere do you seek?' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Step 3 of 5 • Moods/i)).toBeInTheDocument();

      // Toggle Atmospheric and Contemplative
      const atmosphericOption = screen.getByRole('button', { name: /Atmospheric/i });
      fireEvent.click(atmosphericOption);
      expect(atmosphericOption).toHaveAttribute('aria-pressed', 'true');

      const contemplativeOption = screen.getByRole('button', { name: /Contemplative/i });
      fireEvent.click(contemplativeOption);
      expect(contemplativeOption).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });

  describe('Navigation: Back and Continue', () => {
    it('navigates backward and forward across steps while preserving selections', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      // Start -> Movies
      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));

      // Select a movie
      const arrivalCard = screen.getByRole('button', { name: /Arrival/i });
      fireEvent.click(arrivalCard);
      expect(arrivalCard).toHaveAttribute('aria-pressed', 'true');

      // Continue to Genres
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));
      expect(
        screen.getByRole('heading', { level: 2, name: 'Which genres resonate most with you?' })
      ).toBeInTheDocument();

      // Click Back -> Returns to Movies
      const backBtn = screen.getByRole('button', { name: 'Go to previous step' });
      fireEvent.click(backBtn);

      expect(
        screen.getByRole('heading', { level: 2, name: 'Which of these would you watch?' })
      ).toBeInTheDocument();

      // Arrival should remain selected!
      expect(screen.getByRole('button', { name: /Arrival/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Progress Indicator', () => {
    it('updates progress indicator correctly as steps advance', () => {
      renderTasteDiscoveryPage('/taste-discovery');

      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');

      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');

      fireEvent.click(screen.getByRole('button', { name: 'Continue to Moods' }));
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
    });
  });

  describe('Full Flow Completion & Discovery Navigation', () => {
    it('progresses through themes, viewing horizons, and lands on completion screen with summary', async () => {
      renderTasteDiscoveryPage('/taste-discovery');

      // Start
      fireEvent.click(screen.getByRole('button', { name: 'Start discovering' }));

      // Step 1: Select Parasite
      fireEvent.click(screen.getByRole('button', { name: /Parasite/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Genres' }));

      // Step 2: Select Black Comedy
      fireEvent.click(screen.getByRole('button', { name: /Black Comedy/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Moods' }));

      // Step 3: Select Satirical
      fireEvent.click(screen.getByRole('button', { name: /Satirical/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Themes' }));

      // Step 4: Themes
      expect(
        screen.getByRole('heading', { level: 2, name: 'Which themes and motifs captivate you?' })
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Class Conflict & Power/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to Preferences' }));

      // Step 5: Viewing Horizons
      expect(
        screen.getByRole('heading', { level: 2, name: 'Fine-tune your viewing horizons.' })
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Finish Discovery/i }));

      // Completion screen
      expect(
        screen.getByRole('heading', { level: 1, name: 'Your taste is taking shape.' })
      ).toBeInTheDocument();
      expect(screen.getByText('Captured Discovery Signals')).toBeInTheDocument();
      expect(screen.getByText('1 film selected')).toBeInTheDocument();
      expect(screen.getByText('Black Comedy')).toBeInTheDocument();
      expect(screen.getByText('Satirical')).toBeInTheDocument();
      expect(screen.getByText('Class Conflict & Power')).toBeInTheDocument();

      // CTA navigates to /discover
      const exploreBtn = screen.getByRole('button', { name: 'Explore Veya Luma' });
      fireEvent.click(exploreBtn);
      await waitFor(() => {
        expect(screen.getByTestId('discover-page-stub')).toBeInTheDocument();
      });
    });
  });
});
