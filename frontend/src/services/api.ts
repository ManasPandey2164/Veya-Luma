import { z } from 'zod';
import type { MovieFixture } from '../fixtures/movieFixtures';

// ==============================================================================
// 1. HEALTH & SYSTEM SCHEMAS
// ==============================================================================

export const HealthResponseSchema = z.object({
  status: z.string(),
  environment: z.string(),
  version: z.string(),
  database: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ==============================================================================
// 2. CATALOG RESPONSE SCHEMAS
// ==============================================================================

export const MovieListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  release_year: z.number().nullable().optional(),
  runtime_minutes: z.number().nullable().optional(),
  original_language: z.string().default('en'),
  synopsis: z.string().nullable().optional(),
  genres: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  moods: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  poster_url: z.string().nullable().optional(),
  backdrop_url: z.string().nullable().optional(),
});

export type MovieListItem = z.infer<typeof MovieListItemSchema>;

export const MovieArtworkPublicSchema = z.object({
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  poster_url: z.string().nullable().optional(),
  backdrop_url: z.string().nullable().optional(),
});

export const MovieCollectionPublicSchema = z.object({
  collection_id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
});

export const CastMemberPublicSchema = z.object({
  name: z.string(),
  character: z.string().nullable().optional(),
  billing_order: z.number().nullable().optional(),
});

export const CrewMemberPublicSchema = z.object({
  name: z.string(),
  department: z.string(),
  job: z.string(),
});

export const MovieCreditsPublicSchema = z.object({
  director: z.string().nullable().optional(),
  directors: z.array(CrewMemberPublicSchema).default([]),
  cast: z.array(CastMemberPublicSchema).default([]),
  crew: z.array(CrewMemberPublicSchema).default([]),
});

export const MovieProvenancePublicSchema = z.object({
  source: z.string(),
  endpoint_or_product: z.string(),
  retrieved_at: z.string(),
  license_profile: z.string(),
});

export const MovieDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  release_year: z.number().nullable().optional(),
  runtime_minutes: z.number().nullable().optional(),
  synopsis: z.string().nullable().optional(),
  original_language: z.string().default('en'),
  spoken_languages: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  moods: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
  artwork: MovieArtworkPublicSchema.default({}),
  collection: MovieCollectionPublicSchema.nullable().optional(),
  credits: MovieCreditsPublicSchema.default({}),
  provenance: MovieProvenancePublicSchema.nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export type MovieDetail = z.infer<typeof MovieDetailSchema>;

export const PaginatedMoviesResponseSchema = z.object({
  items: z.array(MovieListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export type PaginatedMoviesResponse = z.infer<typeof PaginatedMoviesResponseSchema>;

// Base API URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ==============================================================================
// 3. API CLIENT CALLS
// ==============================================================================

/**
 * Fetches the system health status from the backend.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }

  const data = await response.json();
  return HealthResponseSchema.parse(data);
}

export interface MovieListParams {
  page?: number;
  limit?: number;
  genre?: string;
  theme?: string;
  mood?: string;
  style?: string;
  release_year?: number;
  year_min?: number;
  year_max?: number;
  original_language?: string;
  sort_by?: string;
}

/**
 * Fetches a paginated list of lightweight canonical movies.
 */
export async function fetchMovies(params: MovieListParams = {}): Promise<PaginatedMoviesResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.genre) searchParams.set('genre', params.genre);
  if (params.theme) searchParams.set('theme', params.theme);
  if (params.mood) searchParams.set('mood', params.mood);
  if (params.style) searchParams.set('style', params.style);
  if (params.release_year !== undefined) searchParams.set('release_year', String(params.release_year));
  if (params.year_min !== undefined) searchParams.set('year_min', String(params.year_min));
  if (params.year_max !== undefined) searchParams.set('year_max', String(params.year_max));
  if (params.original_language) searchParams.set('original_language', params.original_language);
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);

  const queryStr = searchParams.toString();
  const url = `${API_BASE_URL}/movies${queryStr ? `?${queryStr}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`fetchMovies failed with status: ${response.status}`);
  }

  const data = await response.json();
  return PaginatedMoviesResponseSchema.parse(data);
}

/**
 * Fetches complete details for a movie by its canonical UUID.
 */
export async function fetchMovieDetail(id: string): Promise<MovieDetail> {
  const url = `${API_BASE_URL}/movies/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`fetchMovieDetail failed with status: ${response.status}`);
  }

  const data = await response.json();
  return MovieDetailSchema.parse(data);
}

export interface MovieSearchParams {
  page?: number;
  limit?: number;
  genre?: string;
  theme?: string;
  mood?: string;
  style?: string;
  release_year?: number;
  original_language?: string;
}

/**
 * Searches movies by title with optional taxonomy refinement.
 */
export async function searchMoviesApi(
  q: string,
  params: MovieSearchParams = {}
): Promise<PaginatedMoviesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', q);
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.genre) searchParams.set('genre', params.genre);
  if (params.theme) searchParams.set('theme', params.theme);
  if (params.mood) searchParams.set('mood', params.mood);
  if (params.style) searchParams.set('style', params.style);
  if (params.release_year !== undefined) searchParams.set('release_year', String(params.release_year));
  if (params.original_language) searchParams.set('original_language', params.original_language);

  const url = `${API_BASE_URL}/movies/search?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`searchMoviesApi failed with status: ${response.status}`);
  }

  const data = await response.json();
  return PaginatedMoviesResponseSchema.parse(data);
}

// ==============================================================================
// 4. PRESENTATION MAPPERS & FALLBACK ADAPTERS
// ==============================================================================

/**
 * Resolves poster and backdrop image URLs, falling back to TMDB CDN or placeholder.
 */
function resolveArtwork(
  posterPath?: string | null,
  backdropPath?: string | null,
  posterUrl?: string | null,
  backdropUrl?: string | null
): { poster: string; backdrop: string } {
  let poster = posterUrl || '';
  if (!poster && posterPath) {
    poster = posterPath.startsWith('http')
      ? posterPath
      : `https://image.tmdb.org/t/p/w500${posterPath}`;
  }

  let backdrop = backdropUrl || '';
  if (!backdrop && backdropPath) {
    backdrop = backdropPath.startsWith('http')
      ? backdropPath
      : `https://image.tmdb.org/t/p/w1280${backdropPath}`;
  }

  if (!poster) {
    poster = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80';
  }
  if (!backdrop) {
    backdrop = poster;
  }

  return { poster, backdrop };
}

/**
 * Maps a backend MovieListItem into a MovieFixture representation for UI consumption.
 */
export function mapMovieListItemToFixture(item: MovieListItem): MovieFixture {
  const { poster, backdrop } = resolveArtwork(
    item.poster_path,
    item.backdrop_path,
    item.poster_url,
    item.backdrop_url
  );

  return {
    id: item.id,
    title: item.title,
    year: item.release_year ?? 0,
    runtime: item.runtime_minutes ?? 0,
    poster,
    backdrop,
    synopsis: item.synopsis || '',
    genres: item.genres || [],
    themes: item.themes || [],
    moods: item.moods || [],
    language: item.original_language || 'en',
    director: 'Denis Villeneuve',
    cast: [],
    tags: item.styles || [],
    rating: 8.0,
    matchScore: 95,
  };
}

/**
 * Maps a backend MovieDetail into a MovieFixture representation for UI consumption.
 */
export function mapMovieDetailToFixture(detail: MovieDetail): MovieFixture {
  const { poster, backdrop } = resolveArtwork(
    detail.artwork?.poster_path,
    detail.artwork?.backdrop_path,
    detail.artwork?.poster_url,
    detail.artwork?.backdrop_url
  );

  const director =
    detail.credits?.director ||
    (detail.credits?.directors && detail.credits.directors.length > 0
      ? detail.credits.directors[0].name
      : 'Director');

  const castNames = (detail.credits?.cast || []).map((c) => c.name);

  return {
    id: detail.id,
    title: detail.title,
    year: detail.release_year ?? 0,
    runtime: detail.runtime_minutes ?? 0,
    poster,
    backdrop,
    synopsis: detail.synopsis || '',
    genres: detail.genres || [],
    themes: detail.themes || [],
    moods: detail.moods || [],
    language: detail.original_language || 'en',
    director,
    cast: castNames,
    tags: detail.tags && detail.tags.length > 0 ? detail.tags : detail.styles || [],
    rating: 8.0,
    matchScore: 96,
  };
}
