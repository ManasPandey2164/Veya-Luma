import { z } from 'zod';
import { MovieListItemSchema, type MovieListItem } from './api';

export type { MovieListItem };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const LibraryItemSchema = z.object({
  id: z.string(),
  movie_id: z.string(),
  created_at: z.string(),
  movie: MovieListItemSchema.nullable().optional(),
});

export type LibraryItem = z.infer<typeof LibraryItemSchema>;

export const PaginatedLibraryResponseSchema = z.object({
  items: z.array(LibraryItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export type PaginatedLibraryResponse = z.infer<typeof PaginatedLibraryResponseSchema>;

export const LibraryActionResponseSchema = z.object({
  status: z.string(),
  action: z.string(),
  movie_id: z.string(),
  message: z.string(),
});

export type LibraryActionResponse = z.infer<typeof LibraryActionResponseSchema>;

export const ReconcileLibraryResponseSchema = z.object({
  status: z.string(),
  events_reconciled: z.number(),
  watchlist_reconciled: z.number(),
  favourites_reconciled: z.number(),
  preferences_reconciled: z.number(),
});

export type ReconcileLibraryResponse = z.infer<typeof ReconcileLibraryResponseSchema>;

/**
 * Adds a movie to the authenticated user's watchlist.
 */
export async function addToWatchlistApi(movieId: string, token: string): Promise<LibraryActionResponse> {
  const res = await fetch(`${API_BASE_URL}/library/watchlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ movie_id: movieId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to add to watchlist (${res.status})`);
  }

  const data = await res.json();
  return LibraryActionResponseSchema.parse(data);
}

/**
 * Removes a movie from the authenticated user's watchlist.
 */
export async function removeFromWatchlistApi(movieId: string, token: string): Promise<LibraryActionResponse> {
  const res = await fetch(`${API_BASE_URL}/library/watchlist/${encodeURIComponent(movieId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to remove from watchlist (${res.status})`);
  }

  const data = await res.json();
  return LibraryActionResponseSchema.parse(data);
}

/**
 * Fetches the paginated watchlist for the authenticated user.
 */
export async function fetchWatchlistApi(
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedLibraryResponse> {
  const res = await fetch(`${API_BASE_URL}/library/watchlist?page=${page}&limit=${limit}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch watchlist (${res.status})`);
  }

  const data = await res.json();
  return PaginatedLibraryResponseSchema.parse(data);
}

/**
 * Adds a movie to the authenticated user's favourites.
 */
export async function addToFavouritesApi(movieId: string, token: string): Promise<LibraryActionResponse> {
  const res = await fetch(`${API_BASE_URL}/library/favourites/${encodeURIComponent(movieId)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to add to favourites (${res.status})`);
  }

  const data = await res.json();
  return LibraryActionResponseSchema.parse(data);
}

/**
 * Removes a movie from the authenticated user's favourites.
 */
export async function removeFromFavouritesApi(movieId: string, token: string): Promise<LibraryActionResponse> {
  const res = await fetch(`${API_BASE_URL}/library/favourites/${encodeURIComponent(movieId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to remove from favourites (${res.status})`);
  }

  const data = await res.json();
  return LibraryActionResponseSchema.parse(data);
}

/**
 * Fetches the paginated favourites for the authenticated user.
 */
export async function fetchFavouritesApi(
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedLibraryResponse> {
  const res = await fetch(`${API_BASE_URL}/library/favourites?page=${page}&limit=${limit}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch favourites (${res.status})`);
  }

  const data = await res.json();
  return PaginatedLibraryResponseSchema.parse(data);
}

/**
 * Reconciles guest bookmarks and session data into the authenticated user account.
 */
export async function reconcileLibraryApi(
  token: string,
  payload: {
    guest_session_id?: string | null;
    watchlist_movie_ids?: string[];
    favourite_movie_ids?: string[];
  }
): Promise<ReconcileLibraryResponse> {
  const res = await fetch(`${API_BASE_URL}/library/reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to reconcile library (${res.status})`);
  }

  const data = await res.json();
  return ReconcileLibraryResponseSchema.parse(data);
}
