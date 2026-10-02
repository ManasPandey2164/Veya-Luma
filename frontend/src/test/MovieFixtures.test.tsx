import { describe, it, expect } from 'vitest';
import {
  MOVIE_FIXTURES,
  getMovieFixtureById,
  getAllMovieFixtures,
  getWatchlistFixtures,
  getFavouritesFixtures,
  getHistoryFixtures,
} from '../fixtures/movieFixtures';

describe('Veya Luma — Development Movie Fixture Layer', () => {
  it('contains a curated, cohesive dataset without catalog bloat', () => {
    expect(MOVIE_FIXTURES.length).toBeGreaterThanOrEqual(6);
    expect(MOVIE_FIXTURES.length).toBeLessThanOrEqual(20);
  });

  it('verifies every movie fixture has all required UI fields', () => {
    MOVIE_FIXTURES.forEach((movie) => {
      // Identity & Core metadata
      expect(movie.id).toBeTruthy();
      expect(typeof movie.id).toBe('string');
      expect(movie.title).toBeTruthy();
      expect(typeof movie.title).toBe('string');
      expect(typeof movie.year).toBe('number');
      expect(movie.year).toBeGreaterThan(1900);
      expect(typeof movie.runtime).toBe('number');
      expect(movie.runtime).toBeGreaterThan(0);

      // Artwork
      expect(movie.poster).toMatch(/^https?:\/\//);
      expect(movie.backdrop).toMatch(/^https?:\/\//);

      // Editorial & Narrative
      expect(movie.synopsis).toBeTruthy();
      expect(movie.director).toBeTruthy();
      expect(movie.language).toBeTruthy();

      // Controlled Taxonomy & Ensembles
      expect(Array.isArray(movie.genres)).toBe(true);
      expect(movie.genres.length).toBeGreaterThan(0);
      expect(Array.isArray(movie.themes)).toBe(true);
      expect(movie.themes.length).toBeGreaterThan(0);
      expect(Array.isArray(movie.moods)).toBe(true);
      expect(movie.moods.length).toBeGreaterThan(0);
      expect(Array.isArray(movie.cast)).toBe(true);
      expect(movie.cast.length).toBeGreaterThan(0);
      expect(Array.isArray(movie.tags)).toBe(true);
      expect(movie.tags.length).toBeGreaterThan(0);

      // Rating & Match Score where provided
      if (movie.rating !== undefined) {
        expect(movie.rating).toBeGreaterThanOrEqual(1.0);
        expect(movie.rating).toBeLessThanOrEqual(10.0);
      }
      if (movie.matchScore !== undefined) {
        expect(movie.matchScore).toBeGreaterThanOrEqual(50);
        expect(movie.matchScore).toBeLessThanOrEqual(100);
      }

      // Algorithmic Explanation where provided
      if (movie.explanation) {
        expect(
          movie.explanation.whyRecommended || movie.explanation.divergenceNote
        ).toBeTruthy();
      }
    });
  });

  describe('Accessor Utilities', () => {
    it('retrieves movie by ID with getMovieFixtureById', () => {
      const bladeRunner = getMovieFixtureById('blade-runner-2049');
      expect(bladeRunner).toBeDefined();
      expect(bladeRunner?.title).toBe('Blade Runner 2049');
      expect(bladeRunner?.director).toBe('Denis Villeneuve');

      const nonExistent = getMovieFixtureById('non-existent-movie-id');
      expect(nonExistent).toBeUndefined();
    });

    it('retrieves all fixtures with getAllMovieFixtures', () => {
      const all = getAllMovieFixtures();
      expect(all.length).toBe(MOVIE_FIXTURES.length);
    });

    it('filters watchlist, favourites, and history correctly', () => {
      const watchlist = getWatchlistFixtures();
      expect(watchlist.length).toBeGreaterThan(0);
      watchlist.forEach((m) => expect(m.isWatchlisted).toBe(true));

      const favourites = getFavouritesFixtures();
      expect(favourites.length).toBeGreaterThan(0);
      favourites.forEach((m) => expect(m.isFavorite).toBe(true));

      const history = getHistoryFixtures();
      expect(history.length).toBeGreaterThan(0);
      history.forEach((m) => expect(m.watchedDate).toBeTruthy());
    });
  });
});
