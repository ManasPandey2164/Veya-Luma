import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const MovieRatingSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  movie_id: z.string(),
  rating: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MovieRating = z.infer<typeof MovieRatingSchema>;

export const MovieEventResponseSchema = z.object({
  id: z.string(),
  movie_id: z.string(),
  event_type: z.string(),
  event_value: z.number().nullable().optional(),
  created_at: z.string(),
  status: z.string(),
});

export type MovieEventResponse = z.infer<typeof MovieEventResponseSchema>;

/**
 * Records or updates a movie rating for the authenticated user.
 */
export async function rateMovieApi(
  movieId: string,
  rating: number,
  token: string
): Promise<MovieRating> {
  const res = await fetch(`${API_BASE_URL}/feedback/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ movie_id: movieId, rating }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Rating submission failed (${res.status})`);
  }

  const data = await res.json();
  return MovieRatingSchema.parse(data);
}

/**
 * Fetches the user's current rating for a canonical movie.
 */
export async function fetchMovieRatingApi(
  movieId: string,
  token: string
): Promise<MovieRating | null> {
  const res = await fetch(`${API_BASE_URL}/feedback/ratings/${encodeURIComponent(movieId)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (!data) return null;
  return MovieRatingSchema.parse(data);
}

/**
 * Records a behavioral telemetry event (impression, detail_view, click).
 * Works for both authenticated users (Bearer token) and guests (X-Session-ID).
 */
export async function recordTelemetryEventApi(
  payload: {
    movie_id: string;
    event_type: 'impression' | 'detail_view' | 'click';
    event_value?: number;
    source?: string;
    event_metadata?: Record<string, string | number | boolean>;
  },
  token?: string | null,
  guestSessionId?: string | null
): Promise<MovieEventResponse | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (guestSessionId) {
    headers['X-Session-ID'] = guestSessionId;
  } else {
    // Neither authenticated nor guest session available
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/feedback/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return MovieEventResponseSchema.parse(data);
  } catch {
    // Fail silently for background telemetry to not block UI
    return null;
  }
}
