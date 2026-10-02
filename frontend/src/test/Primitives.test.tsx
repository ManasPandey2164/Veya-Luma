import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Bookmark, Heart } from 'lucide-react';
import { MOVIE_FIXTURES } from '../fixtures/movieFixtures';



import {
  Button,
  IconButton,
  Input,
  SearchInput,
  Badge,
  Tag,
  GlassPanel,
  SectionHeader,
  MovieCard,
  MovieShelf,
  EmptyState,
  LoadingState,
  ErrorState,
  PageContainer,
  AppShell,
  CelestialPrism,
} from '../components/ui';

describe('Cinematic Luminary Design System — Core Primitives', () => {
  describe('Button', () => {
    it('renders with default primary variant and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Explore Cinema</Button>);

      const btn = screen.getByRole('button', { name: 'Explore Cinema' });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('bg-luminous-cyan');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders different variants (secondary, outline, danger, ghost)', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-obsidian-chamber/90');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-white/20');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-luminous-crimson');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });

    it('handles disabled and loading states with appropriate aria attributes', () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();

      rerender(
        <Button isLoading onClick={handleClick}>
          Processing
        </Button>
      );
      const loadingBtn = screen.getByRole('button');
      expect(loadingBtn).toBeDisabled();
      expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Icon Button
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('IconButton', () => {
    it('enforces accessible aria-label and triggers click', () => {
      const handleClick = vi.fn();
      render(
        <IconButton
          icon={<Bookmark className="w-4 h-4" />}
          label="Save to Watchlist"
          onClick={handleClick}
        />
      );

      const btn = screen.getByRole('button', { name: 'Save to Watchlist' });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('title', 'Save to Watchlist');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports active state styling', () => {
      render(
        <IconButton
          icon={<Heart className="w-4 h-4" />}
          label="Favorited"
          variant="active"
        />
      );
      const btn = screen.getByRole('button', { name: 'Favorited' });
      expect(btn).toHaveClass('text-luminous-cyan');
    });
  });

  describe('Input', () => {
    it('renders with associated label and handles text change', () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Director Name"
          placeholder="e.g. Denis Villeneuve"
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText('Director Name');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'e.g. Denis Villeneuve');

      fireEvent.change(input, { target: { value: 'Christopher Nolan' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders error state with aria-invalid and role="alert"', () => {
      render(
        <Input
          label="Email Address"
          error="Please enter a valid cinematic identity email."
        />
      );

      const input = screen.getByLabelText('Email Address');
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent('Please enter a valid cinematic identity email.');
    });

    it('renders helper text when no error exists', () => {
      render(
        <Input
          label="Username"
          helperText="Unique celestial callsign"
        />
      );
      expect(screen.getByText('Unique celestial callsign')).toBeInTheDocument();
    });
  });

  describe('SearchInput', () => {
    it('renders search aperture with role="searchbox" and handles input', () => {
      const handleChange = vi.fn();
      const handleSearch = vi.fn();

      render(
        <SearchInput
          value="neo-noir"
          onChange={handleChange}
          onSearch={handleSearch}
          placeholder="Search films..."
        />
      );

      const input = screen.getByRole('searchbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('neo-noir');

      const submitBtn = screen.getByRole('button', { name: 'Discover movies' });
      fireEvent.click(submitBtn);
      expect(handleSearch).toHaveBeenCalledWith('neo-noir');
    });

    it('renders clear button when value is present and clears search', () => {
      const handleClear = vi.fn();
      render(
        <SearchInput
          value="Blade Runner"
          onChange={() => {}}
          onClear={handleClear}
        />
      );

      const clearBtn = screen.getByRole('button', { name: 'Clear search input' });
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge', () => {
    it('renders variants and optional indicator dot', () => {
      const { rerender } = render(
        <Badge variant="cyan" dot>
          98% Match
        </Badge>
      );
      expect(screen.getByText('98% Match')).toBeInTheDocument();
      expect(screen.getByText('98% Match').parentElement).toHaveClass('text-luminous-cyan');

      rerender(<Badge variant="amber">4.8 / 5.0</Badge>);
      expect(screen.getByText('4.8 / 5.0').parentElement).toHaveClass('text-luminous-amber');

      rerender(<Badge variant="crimson">High Friction</Badge>);
      expect(screen.getByText('High Friction').parentElement).toHaveClass('text-luminous-crimson');
    });
  });

  describe('Tag', () => {
    it('supports interactive toggle with aria-pressed and keyboard Enter', () => {
      const handleToggle = vi.fn();
      render(
        <Tag
          label="Cyberpunk"
          selected={false}
          onToggle={handleToggle}
          count={12}
        />
      );

      const tagBtn = screen.getByRole('button', { name: /Cyberpunk/ });
      expect(tagBtn).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('(12)')).toBeInTheDocument();

      fireEvent.click(tagBtn);
      expect(handleToggle).toHaveBeenCalledWith(true);

      fireEvent.keyDown(tagBtn, { key: 'Enter' });
      expect(handleToggle).toHaveBeenCalledTimes(2);
    });

    it('renders non-interactive tag mode', () => {
      render(<Tag label="Sci-Fi" interactive={false} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    });

    it('supports removal via onRemove handler', () => {
      const handleRemove = vi.fn();
      render(<Tag label="Dystopian" onRemove={handleRemove} />);

      const removeBtn = screen.getByLabelText('Remove tag Dystopian');
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('GlassPanel', () => {
    it('renders elevation levels and custom semantic container', () => {
      render(
        <GlassPanel as="article" elevation="elevated" hoverEffect data-testid="glass-panel">
          <p>Atmospheric content</p>
        </GlassPanel>
      );

      const panel = screen.getByTestId('glass-panel');
      expect(panel.tagName.toLowerCase()).toBe('article');
      expect(panel).toHaveClass('bg-obsidian-card/90');
      expect(panel).toHaveClass('hover:border-luminous-cyan/40');
      expect(screen.getByText('Atmospheric content')).toBeInTheDocument();
    });
  });

  describe('SectionHeader', () => {
    it('renders editorial title with micro telemetry eyebrow and action', () => {
      render(
        <SectionHeader
          eyebrow="COGNITIVE RESONANCE"
          title="Curated Horizons"
          description="Films sharing non-linear temporal motifs."
          action={<button type="button">View All</button>}
        />
      );

      expect(screen.getByText('COGNITIVE RESONANCE')).toHaveClass('text-telemetry');
      expect(screen.getByText('Curated Horizons')).toHaveClass('font-editorial');
      expect(screen.getByText('Films sharing non-linear temporal motifs.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument();
    });
  });

  describe('MovieCard', () => {
    const fixtureMovie = MOVIE_FIXTURES[1]; // Solaris (1972)

    it('renders movie metadata, match badge, and triggers card click', () => {
      const handleClick = vi.fn();
      render(<MovieCard movie={fixtureMovie} onClick={handleClick} />);

      expect(screen.getByText('Solaris')).toBeInTheDocument();
      expect(screen.getByText('1972')).toBeInTheDocument();
      expect(screen.getByText('167m')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
      expect(screen.getByText('Dir. Andrei Tarkovsky')).toBeInTheDocument();
      expect(screen.getByText('96% Match')).toBeInTheDocument();

      const card = screen.getByRole('button', { name: 'Solaris (1972)' });
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledWith(fixtureMovie.id);
    });

    it('handles watchlist and favorite toggles independently without bubbling', () => {
      const handleWatchlist = vi.fn();
      const handleFavorite = vi.fn();
      const handleCardClick = vi.fn();

      render(
        <MovieCard
          movie={fixtureMovie}
          onClick={handleCardClick}
          onWatchlistToggle={handleWatchlist}
          onFavoriteToggle={handleFavorite}
          isWatchlisted={false}
          isFavorite={false}
        />
      );

      const watchlistBtn = screen.getByRole('button', { name: `Add ${fixtureMovie.title} to watchlist` });
      fireEvent.click(watchlistBtn);
      expect(handleWatchlist).toHaveBeenCalledWith(fixtureMovie.id);
      expect(handleCardClick).not.toHaveBeenCalled();

      const favBtn = screen.getByRole('button', { name: `Add ${fixtureMovie.title} to favourites` });
      fireEvent.click(favBtn);
      expect(handleFavorite).toHaveBeenCalledWith(fixtureMovie.id);
      expect(handleCardClick).not.toHaveBeenCalled();
    });

    it('supports keyboard navigation via Enter key', () => {
      const handleClick = vi.fn();
      render(<MovieCard movie={fixtureMovie} onClick={handleClick} />);

      const card = screen.getByRole('button', { name: 'Solaris (1972)' });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith(fixtureMovie.id);
    });
  });


  describe('MovieShelf', () => {
    it('renders horizontal shelf with scroll controls and children', () => {
      render(
        <MovieShelf
          title="Atmospheric Cinema"
          eyebrow="CURATORIAL SELECTION"
          layout="shelf"
        >
          <div data-testid="shelf-child-1">Movie 1</div>
          <div data-testid="shelf-child-2">Movie 2</div>
        </MovieShelf>
      );

      expect(screen.getByText('Atmospheric Cinema')).toBeInTheDocument();
      expect(screen.getByText('CURATORIAL SELECTION')).toBeInTheDocument();
      expect(screen.getByTestId('shelf-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('shelf-child-2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scroll left' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scroll right' })).toBeInTheDocument();
    });

    it('renders grid layout when specified', () => {
      render(
        <MovieShelf layout="grid">
          <div data-testid="grid-child">Grid Item</div>
        </MovieShelf>
      );
      expect(screen.getByTestId('grid-child')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeInTheDocument();
    });
  });

  describe('EmptyState, LoadingState, and ErrorState', () => {
    it('renders EmptyState with editorial title and action', () => {
      render(
        <EmptyState
          title="No Films Found"
          description="Adjust your atmospheric filters or try exploring different seed concepts."
          action={<Button size="sm">Reset Filters</Button>}
        />
      );

      expect(screen.getByRole('region', { name: 'No Films Found' })).toBeInTheDocument();
      expect(screen.getByText('No Films Found')).toHaveClass('font-editorial');
      expect(screen.getByRole('button', { name: 'Reset Filters' })).toBeInTheDocument();
    });

    it('renders LoadingState with role="status" and aria-live polite', () => {
      const { rerender } = render(
        <LoadingState type="cards" count={3} message="Aligning taste vectors..." />
      );
      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Aligning taste vectors...')).toBeInTheDocument();

      rerender(<LoadingState type="spinner" message="Synthesizing recommendations..." />);
      expect(screen.getByText('Synthesizing recommendations...')).toBeInTheDocument();
    });

    it('renders ErrorState with role="alert" and handles retry action', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Signal Degraded"
          message="Failed to retrieve cinematic vector metadata."
          onRetry={handleRetry}
          retryLabel="Reconnect Signal"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Signal Degraded')).toHaveClass('font-editorial');
      expect(screen.getByText('Failed to retrieve cinematic vector metadata.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: 'Reconnect Signal' });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('PageContainer & AppShell', () => {
    it('renders PageContainer with 1320px standard max-width and gutters', () => {
      render(
        <PageContainer maxWidth="standard" data-testid="page-container">
          <div>Page Content</div>
        </PageContainer>
      );
      const container = screen.getByText('Page Content').parentElement;
      expect(container).toHaveClass('max-w-[1320px]');
      expect(container).toHaveClass('px-6');
    });

    it('renders AppShell with accessible skip-to-content link and main landmark', () => {
      render(
        <AppShell headerSlot={<header>Header Slot</header>} footerSlot={<footer>Footer Slot</footer>}>
          <div data-testid="app-content">App Shell Content</div>
        </AppShell>
      );

      const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const mainLandmark = screen.getByRole('main');
      expect(mainLandmark).toHaveAttribute('id', 'main-content');
      expect(mainLandmark).toHaveAttribute('tabIndex', '-1');

      expect(screen.getByText('Header Slot')).toBeInTheDocument();
      expect(screen.getByText('Footer Slot')).toBeInTheDocument();
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    it('renders CelestialPrism brand mark without error', () => {
      render(<CelestialPrism data-testid="celestial-prism" size={24} />);
      const prism = screen.getByTestId('celestial-prism');
      expect(prism).toBeInTheDocument();
      expect(prism).toHaveAttribute('width', '24');
    });
  });
});
