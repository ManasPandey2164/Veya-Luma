/**
 * DEPRECATED ALIAS — Forwarding to centralized fixture layer in src/fixtures/movieFixtures.ts
 */
import {
  MOVIE_FIXTURES,
  type MovieFixture,
} from '../fixtures/movieFixtures';

export type MockMovie = MovieFixture;
export const MOCK_MOVIES: MovieFixture[] = MOVIE_FIXTURES;
export default MOCK_MOVIES;
