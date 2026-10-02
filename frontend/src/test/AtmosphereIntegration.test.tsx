import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PreferencesProvider,
  AtmosphereProvider,
  LibraryProvider,
  useAtmosphere,
  useSetAtmosphere,
} from '../context';
import { AppShell } from '../components/ui/AppShell';
import { PageContainer } from '../components/ui/PageContainer';
import { DiscoverPage } from '../pages/DiscoverPage';
import { MovieDetailPage } from '../pages/MovieDetailPage';
import { TasteDiscoveryPage } from '../pages/TasteDiscoveryPage';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithAtmosphere(
  ui: React.ReactNode,
  options?: {
    baseTheme?: 'dark' | 'light';
    initialGenre?: string | null;
  }
) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider initialAccountPreferences={{ baseTheme: options?.baseTheme || 'dark', motionPreference: 'standard', compactMode: false, analyticsConsent: false }}>
        <AtmosphereProvider initialGenre={options?.initialGenre || null}>
          <LibraryProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </LibraryProvider>
        </AtmosphereProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

describe('Cinematic Atmosphere Application & Visual Rendering Pipeline', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
  });

  describe('AtmosphereProvider & Dynamic CSS Custom Properties', () => {
    const TestConsumer: React.FC<{ targetGenre?: string }> = ({ targetGenre }) => {
      const { tokens, activeGenre } = useAtmosphere();
      useSetAtmosphere(targetGenre || null);
      return (
        <div>
          <span data-testid="active-genre">{activeGenre || 'none'}</span>
          <span data-testid="active-accent">{tokens.accent}</span>
          <span data-testid="badge-variant">{tokens.badgeVariant}</span>
        </div>
      );
    };

    it('injects default Cinematic Luminary CSS variables into documentElement on mount', () => {
      renderWithAtmosphere(<TestConsumer />);

      expect(screen.getByTestId('active-genre')).toHaveTextContent('none');
      expect(screen.getByTestId('active-accent')).toHaveTextContent('#00F0FF');
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#00F0FF');
      expect(document.documentElement.style.getPropertyValue('--vl-atmosphere-glow')).toBe(
        'rgba(0, 240, 255, 0.25)'
      );
    });

    it('updates documentElement CSS custom properties when contextual genre changes to Thriller', () => {
      renderWithAtmosphere(<TestConsumer targetGenre="Thriller" />);

      expect(screen.getByTestId('active-genre')).toHaveTextContent('Thriller');
      expect(screen.getByTestId('active-accent')).toHaveTextContent('#FF4D6D');
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#FF4D6D');
      expect(document.documentElement.style.getPropertyValue('--vl-atmosphere-glow')).toBe(
        'rgba(255, 77, 109, 0.28)'
      );
    });

    it('updates documentElement CSS custom properties for Light theme with high-contrast palette', () => {
      renderWithAtmosphere(<TestConsumer targetGenre="Sci-Fi" />, { baseTheme: 'light' });

      expect(screen.getByTestId('active-genre')).toHaveTextContent('Sci-Fi');
      expect(screen.getByTestId('active-accent')).toHaveTextContent('#00838F');
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#00838F');
      expect(document.documentElement.style.getPropertyValue('--vl-atmosphere-surface')).toBe(
        'rgba(0, 131, 143, 0.03)'
      );
    });
  });

  describe('AppShell Atmosphere Bleed & Base Theme Foundation', () => {
    it('renders AppShell with active atmospheric ambient aura gradient in Dark mode', () => {
      renderWithAtmosphere(
        <AppShell ambientAura>
          <div>Shell Content</div>
        </AppShell>,
        { initialGenre: 'Drama' }
      );

      const aura = screen.getByTestId('app-shell-ambient-aura');
      expect(aura).toBeInTheDocument();
      // Drama dark radial gradient
      expect(aura.style.background).toContain('rgba(255, 180, 67');
    });

    it('renders AppShell with Editorial Daylight Cinema paper background in Light mode', () => {
      const { container } = renderWithAtmosphere(
        <AppShell ambientAura>
          <div>Light Shell Content</div>
        </AppShell>,
        { baseTheme: 'light' }
      );

      const shellWrapper = container.firstElementChild as HTMLElement;
      expect(shellWrapper).toHaveAttribute('data-theme', 'light');
      expect(shellWrapper).toHaveClass('bg-[#F7F5F0]');
      expect(shellWrapper).toHaveClass('text-[#12151B]');
      expect(shellWrapper.style.backgroundColor).toBe('var(--vl-bg-base)');

      const aura = screen.getByTestId('app-shell-ambient-aura');
      expect(aura).toHaveClass('opacity-40');
    });
  });

  describe('PageContainer withAtmosphere Consumption', () => {
    it('consumes dynamic var(--vl-atmosphere-gradient) instead of hardcoded gradients', () => {
      renderWithAtmosphere(
        <PageContainer withAtmosphere>
          <div>Container Content</div>
        </PageContainer>
      );

      const atmosphereGlow = screen.getByTestId('page-container-atmosphere');
      expect(atmosphereGlow).toBeInTheDocument();
      expect(atmosphereGlow.style.background).toBe('var(--vl-atmosphere-gradient)');
    });
  });

  describe('Contextual Page Atmosphere Integration', () => {
    it('wires DiscoverPage hero movie genre into the atmospheric pipeline', () => {
      // DiscoverPage hero movie is Blade Runner 2049 (Sci-Fi)
      renderWithAtmosphere(
        <AppShell>
          <DiscoverPage />
        </AppShell>
      );

      // Verify Sci-Fi tokens are applied to documentElement
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#00F0FF');
      expect(document.documentElement.style.getPropertyValue('--vl-atmosphere-glow')).toBe(
        'rgba(0, 240, 255, 0.3)'
      );
    });

    it('wires MovieDetailPage movie genre into the atmospheric pipeline', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider initialAccountPreferences={{ baseTheme: 'dark', motionPreference: 'standard', compactMode: false, analyticsConsent: false }}>
            <AtmosphereProvider>
              <LibraryProvider>
                <MemoryRouter initialEntries={['/movies/parasite-2019']}>
                  <AppShell>
                    <Routes>
                      <Route path="/movies/:movieId" element={<MovieDetailPage />} />
                    </Routes>
                  </AppShell>
                </MemoryRouter>
              </LibraryProvider>
            </AtmosphereProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      );

      // Parasite (2019) genres: Thriller / Drama -> primary: Thriller
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#FF4D6D');
      expect(document.documentElement.style.getPropertyValue('--vl-atmosphere-glow')).toBe(
        'rgba(255, 77, 109, 0.28)'
      );
    });

    it('MovieDetailPage with light theme resolves high-contrast thriller atmosphere', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider initialAccountPreferences={{ baseTheme: 'light', motionPreference: 'standard', compactMode: false, analyticsConsent: false }}>
            <AtmosphereProvider>
              <LibraryProvider>
                <MemoryRouter initialEntries={['/movies/parasite-2019']}>
                  <AppShell>
                    <Routes>
                      <Route path="/movies/:movieId" element={<MovieDetailPage />} />
                    </Routes>
                  </AppShell>
                </MemoryRouter>
              </LibraryProvider>
            </AtmosphereProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      );

      // Parasite in Light Mode resolves Thriller light: #C2185B
      expect(document.documentElement.style.getPropertyValue('--vl-accent')).toBe('#C2185B');
    });

    it('TasteDiscoveryPage interacts contextually with genre selection', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <AtmosphereProvider>
              <LibraryProvider>
                <MemoryRouter initialEntries={['/taste-discovery']}>
                  <TasteDiscoveryPage />
                </MemoryRouter>
              </LibraryProvider>
            </AtmosphereProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Tell Veya Luma what feels like you.')).toBeInTheDocument();
    });
  });
});
