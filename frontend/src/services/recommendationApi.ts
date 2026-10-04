import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const RecommendationExplanationSchema = z.object({
  reason_code: z.string(),
  label: z.string(),
  evidence: z.array(z.string()),
});

export type RecommendationExplanation = z.infer<typeof RecommendationExplanationSchema>;

export const RecommendationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  original_language: z.string(),
  release_year: z.number().nullable().optional(),
  runtime_minutes: z.number().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  popularity: z.number().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  vote_count: z.number().nullable().optional(),
  director: z.string().nullable().optional(),
  channel: z.string(),
  contributing_channels: z.array(z.string()),
  score: z.number(),
  is_in_watchlist: z.boolean(),
  explanations: z.array(RecommendationExplanationSchema),
  matched_features: z.record(z.array(z.string())),
  features: z.record(z.any()).nullable().optional(),
});

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const RecommendationResponseSchema = z.object({
  items: z.array(RecommendationItemSchema),
  total_candidates: z.number(),
  returned_count: z.number(),
  is_cold_start: z.boolean(),
  channels_represented: z.array(z.string()),
  execution_time_ms: z.number(),
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

export interface FetchRecommendationsParams {
  limit?: number;
  channel?: string | null;
  token?: string | null;
  sessionId?: string | null;
}

/**
 * Fetches deterministic recommendations for authenticated user or active guest session.
 */
export async function fetchRecommendationsApi({
  limit = 20,
  channel = null,
  token = null,
  sessionId = null,
}: FetchRecommendationsParams = {}): Promise<RecommendationResponse> {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set('limit', limit.toString());
  if (channel) queryParams.set('channel', channel);

  const url = `${API_BASE_URL}/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch recommendations (${res.status})`);
  }

  const data = await res.json();
  return RecommendationResponseSchema.parse(data);
}

/**
 * Maps a RecommendationItem into a MovieFixture for UI rendering.
 */
export function mapRecommendationItemToFixture(item: RecommendationItem) {
  const tmdbPosterBase = 'https://image.tmdb.org/t/p/w500';
  const tmdbBackdropBase = 'https://image.tmdb.org/t/p/w1280';

  const poster = item.poster_path
    ? item.poster_path.startsWith('http')
      ? item.poster_path
      : `${tmdbPosterBase}${item.poster_path}`
    : '/fallback_poster.jpg';

  const backdrop = item.backdrop_path
    ? item.backdrop_path.startsWith('http')
      ? item.backdrop_path
      : `${tmdbBackdropBase}${item.backdrop_path}`
    : '/fallback_backdrop.jpg';

  const whyRecommended =
    item.explanations && item.explanations.length > 0
      ? item.explanations[0].evidence && item.explanations[0].evidence.length > 0
        ? item.explanations[0].evidence.join(' • ')
        : item.explanations[0].label
      : undefined;

  return {
    id: item.id,
    title: item.title,
    year: item.release_year ?? 0,
    runtime: item.runtime_minutes ?? 0,
    poster,
    backdrop,
    synopsis: '',
    genres: item.matched_features?.genre || [],
    themes: item.matched_features?.theme || [],
    moods: item.matched_features?.mood || [],
    language: item.original_language || 'en',
    director: item.director || '',
    cast: [],
    tags: item.matched_features?.style || [],
    rating: item.vote_average ?? 8.0,
    matchScore: Math.round(item.score * 100),
    isWatchlisted: item.is_in_watchlist,
    explanation: whyRecommended ? { whyRecommended } : undefined,
  };
}
