import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchPage } from '../pages/SearchPage';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderSearchPage(initialUrl = '/search') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies/:movieId" element={<div data-testid="movie-detail-stub">Movie Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Step 7 — Search Experience Specifications', () => {
  describe('Empty Query State & Initial Discovery', () => {
    it('renders the editorial header and prominent search input', () => {
      renderSearchPage('/search');

      // Editorial heading
      expect(screen.getByRole('heading', { level: 1, name: 'Find your next film.' })).toBeInTheDocument();
      expect(
        screen.getByText(/Explore cinema through title, director, actor, genre, theme, mood, language, or release year/i)
      ).toBeInTheDocument();

      // Search input
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search films, directors, genres, moods...');
      expect(searchInput).toHaveValue('');
    });

    it('does NOT display all movies on initial load, but renders an intentional discovery state', () => {
      renderSearchPage('/search');

      // Popular curatorial searches
      expect(screen.getByText('Popular Curatorial Searches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sci-Fi' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Christopher Nolan' })).toBeInTheDocument();

      // Curatorial search dimensions guidance dossier
      expect(screen.getByRole('heading', { level: 2, name: 'Curatorial Search Dimensions' })).toBeInTheDocument();
      expect(screen.getByText('Titles & Eras')).toBeInTheDocument();
      expect(screen.getByText('Auteurs & Cast')).toBeInTheDocument();
      expect(screen.getByText('Aesthetic & Mood')).toBeInTheDocument();
      expect(screen.getByText('Themes & Form')).toBeInTheDocument();

      // Small curated selection (iconic featured fixtures, not all 8 movies)
      expect(screen.getByRole('heading', { level: 2, name: 'Curated Selection' })).toBeInTheDocument();
      const movieLinks = screen.getAllByRole('link');
      // Curated selection renders top 4 items
      expect(movieLinks.length).toBe(4);
    });
  });

  describe('Matching Search & Relevance', () => {
    it('returns the matching movie when a known title is searched', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Arrival' } });

      // Movie card for Arrival should be visible
      expect(screen.getByText('Arrival')).toBeInTheDocument();

      // Result count
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();

      // Other unrelated films should not be displayed in active search results
      expect(screen.queryByText('Solaris')).not.toBeInTheDocument();
    });

    it('handles case-insensitive search queries seamlessly', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'bLaDe RuNnEr' } });

      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();
    });
  });

  describe('Metadata Search (Director, Genre, Theme, Mood, Cast, Year)', () => {
    it('finds films by director name', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Christopher Nolan' } });

      expect(screen.getByText('Memento')).toBeInTheDocument();
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();
    });

    it('finds multiple films matching a common genre', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Sci-Fi' } });

      // Sci-Fi matches Blade Runner 2049, Solaris, Arrival, Stalker
      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
      expect(screen.getByText('Solaris')).toBeInTheDocument();
      expect(screen.getByText('Arrival')).toBeInTheDocument();
      expect(screen.getByText('Stalker')).toBeInTheDocument();

      expect(screen.getByText(/4 films found for/i)).toBeInTheDocument();
    });

    it('finds films by theme or mood', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Existentialism' } });

      expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
    });

    it('finds films by actor / performer name', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Amy Adams' } });

      expect(screen.getByText('Arrival')).toBeInTheDocument();
    });

    it('finds films by release year', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: '1972' } });

      expect(screen.getByText('Solaris')).toBeInTheDocument();
    });
  });

  describe('No-Results State', () => {
    it('shows a polished empty state with guidance and valid fixture suggestions when no matches exist', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'NonexistentFilmTitle12345' } });

      // Empty state messaging
      expect(screen.getByText('No films found for "NonexistentFilmTitle12345"')).toBeInTheDocument();
      expect(
        screen.getByText(/Try a different title, genre, director, mood, or theme/i)
      ).toBeInTheDocument();

      // No fake movie cards rendered
      expect(screen.queryByRole('link')).not.toBeInTheDocument();

      // Suggestion alternatives are present
      expect(screen.getByText(/Or try one of these fixture searches:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sci-Fi' })).toBeInTheDocument();
    });
  });

  describe('Navigation & Card Linking', () => {
    it('links each search result card to /movies/:movieId using MovieCard', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Solaris' } });

      const movieCardLink = screen.getByRole('link', { name: /Solaris/i });
      expect(movieCardLink).toHaveAttribute('href', '/movies/solaris-1972');
    });
  });

  describe('Clear Search Action', () => {
    it('clears query and restores initial intentional discovery state when clear button is clicked', () => {
      renderSearchPage('/search');

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'Memento' } });

      expect(screen.getByText('Memento')).toBeInTheDocument();
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();

      // Click clear button in search input
      const clearBtn = screen.getByLabelText('Clear search input');
      fireEvent.click(clearBtn);

      // Search input should be empty
      expect(searchInput).toHaveValue('');

      // Restored intentional discovery state
      expect(screen.getByText('Popular Curatorial Searches')).toBeInTheDocument();
      expect(screen.getByText('Curatorial Search Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Curated Selection')).toBeInTheDocument();
    });
  });

  describe('URL Query Parameter Synchronization', () => {
    it('populates search input and shows results when opened with /search?q=parasite', () => {
      renderSearchPage('/search?q=parasite');

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveValue('parasite');

      expect(screen.getByText('Parasite')).toBeInTheDocument();
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();
    });
  });

  describe('Suggested Search Chips Interaction', () => {
    it('executes search when a suggested search tag is clicked', () => {
      renderSearchPage('/search');

      // Click "Christopher Nolan" suggestion chip
      const nolanTag = screen.getByRole('button', { name: 'Christopher Nolan' });
      fireEvent.click(nolanTag);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveValue('Christopher Nolan');
      expect(screen.getByText('Memento')).toBeInTheDocument();
      expect(screen.getByText(/1 film found for/i)).toBeInTheDocument();
    });
  });
});
