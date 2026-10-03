import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const TaxonomyNodeSummarySchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  axis: z.string(),
});

export const UserPreferenceSchema = z.object({
  id: z.string(),
  taxonomy_node_id: z.number(),
  preference_value: z.number(),
  source: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  taxonomy_node: TaxonomyNodeSummarySchema,
});

export type UserPreference = z.infer<typeof UserPreferenceSchema>;

export const UserPreferenceListSchema = z.object({
  items: z.array(UserPreferenceSchema),
  total: z.number(),
});

export type UserPreferenceList = z.infer<typeof UserPreferenceListSchema>;

/**
 * Fetches all explicit taxonomy preferences for the authenticated user.
 */
export async function fetchPreferencesApi(token: string): Promise<UserPreferenceList> {
  const res = await fetch(`${API_BASE_URL}/preferences`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch preferences (${res.status})`);
  }

  const data = await res.json();
  return UserPreferenceListSchema.parse(data);
}

/**
 * Upserts a preference for a taxonomy node.
 */
export async function upsertPreferenceApi(
  taxonomyNodeId: number,
  preferenceValue: number,
  token: string,
  source: string = 'explicit'
): Promise<UserPreference> {
  const res = await fetch(`${API_BASE_URL}/preferences/${taxonomyNodeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ preference_value: preferenceValue, source }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update preference (${res.status})`);
  }

  const data = await res.json();
  return UserPreferenceSchema.parse(data);
}

/**
 * Deletes an explicit taxonomy preference.
 */
export async function deletePreferenceApi(
  taxonomyNodeId: number,
  token: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/preferences/${taxonomyNodeId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return false;
  }
  return true;
}
