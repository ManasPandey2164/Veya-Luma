import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const TaxonomyNodeSummarySchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  axis: z.string(),
});

export type TaxonomyNodeSummary = z.infer<typeof TaxonomyNodeSummarySchema>;

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

export interface PreferenceAuth {
  token?: string | null;
  sessionId?: string | null;
}

export type AuthHeaderParam = string | PreferenceAuth;

function resolveAuthHeaders(auth: AuthHeaderParam): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof auth === 'string') {
    if (auth) headers['Authorization'] = `Bearer ${auth}`;
  } else if (auth) {
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.sessionId) {
      headers['X-Session-ID'] = auth.sessionId;
    }
  }
  return headers;
}

/**
 * Fetches all canonical taxonomy nodes from the backend.
 */
export async function fetchTaxonomyNodesApi(): Promise<TaxonomyNodeSummary[]> {
  const res = await fetch(`${API_BASE_URL}/preferences/nodes`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch taxonomy nodes (${res.status})`);
  }

  const data = await res.json();
  return z.array(TaxonomyNodeSummarySchema).parse(data);
}

/**
 * Fetches all explicit taxonomy preferences for authenticated user or guest session.
 */
export async function fetchPreferencesApi(auth: AuthHeaderParam): Promise<UserPreferenceList> {
  const headers = resolveAuthHeaders(auth);
  const res = await fetch(`${API_BASE_URL}/preferences`, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch preferences (${res.status})`);
  }

  const data = await res.json();
  return UserPreferenceListSchema.parse(data);
}

/**
 * Upserts a preference for a taxonomy node for authenticated user or guest session.
 */
export async function upsertPreferenceApi(
  taxonomyNodeId: number,
  preferenceValue: number,
  auth: AuthHeaderParam,
  source: string = 'explicit'
): Promise<UserPreference> {
  const headers = resolveAuthHeaders(auth);
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}/preferences/${taxonomyNodeId}`, {
    method: 'PUT',
    headers,
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
  auth: AuthHeaderParam
): Promise<boolean> {
  const headers = resolveAuthHeaders(auth);
  const res = await fetch(`${API_BASE_URL}/preferences/${taxonomyNodeId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    return false;
  }
  return true;
}

/**
 * Authoritative canonical taxonomy node IDs seeded in PostgreSQL.
 * Used for zero-latency synchronous mapping of onboarding selections to database IDs.
 */
export const CANONICAL_TAXONOMY_MAP: Record<string, number> = {
  // Genres
  'action': 1,
  'adventure': 2,
  'animation': 3,
  'art-house': 4,
  'comedy': 5,
  'black comedy': 5,
  'crime': 6,
  'documentary': 7,
  'drama': 8,
  'family': 9,
  'fantasy': 10,
  'history': 11,
  'horror': 12,
  'music': 13,
  'mystery': 14,
  'neo-noir': 15,
  'philosophy': 16,
  'romance': 17,
  'sci-fi': 18,
  'thriller': 19,
  'war': 20,
  'western': 21,

  // Themes
  'artificial intelligence & identity': 23,
  'artificial intelligence': 22,
  'class conflict & power': 25,
  'class conflict': 24,
  'communication & connection': 27,
  'communication': 26,
  'cosmic mystery': 28,
  'dystopia': 29,
  'existentialism & isolation': 31,
  'existentialism': 30,
  'grief & transcendence': 33,
  'grief': 32,
  'human nature & desires': 36,
  'human nature': 35,
  'identity': 37,
  'isolation': 38,
  'loss': 39,
  'memory & determinism': 41,
  'memory': 40,
  'morality & retribution': 43,
  'morality': 42,
  'power and corruption': 44,
  'redemption': 45,
  'revenge': 46,
  'self-discovery': 47,
  'surveillance': 48,
  'survival': 49,
  'time travel': 50,

  // Moods
  'atmospheric': 51,
  'contemplative': 52,
  'cozy': 53,
  'dark': 54,
  'dreamlike': 55,
  'gritty': 56,
  'haunting': 57,
  'hypnotic': 58,
  'joyful': 59,
  'meditative': 60,
  'melancholic': 61,
  'mind-bending': 62,
  'nocturnal': 63,
  'philosophical': 64,
  'satirical': 65,
  'surreal': 66,
  'suspenseful': 67,
  'tender': 68,
  'tense': 69,
  'thought-provoking': 70,
  'visceral': 71,
  'warm': 72,

  // Styles
  'slow burn': 84,
  'fast paced': 77,
  'measured': 79,
  'non-linear': 82,
  'linear': 78,
  'dialogue heavy': 75,
  'minimalist': 80,
  'stylized': 85,
  'ensemble cast': 76,
  'visual storytelling': 86,
  'cgi-forward': 74,
  'practical effects': 83,
  'monochrome': 81,
};

/**
 * Resolves a taxonomy label or key to its canonical PostgreSQL taxonomy_node_id.
 */
export function resolveTaxonomyNodeId(
  labelOrKey: string,
  dynamicNodes?: TaxonomyNodeSummary[]
): number | undefined {
  if (dynamicNodes && dynamicNodes.length > 0) {
    const clean = labelOrKey.trim().toLowerCase();
    const found = dynamicNodes.find(
      (n) =>
        n.label.toLowerCase() === clean ||
        n.key.toLowerCase() === clean ||
        n.key.toLowerCase() === `genre.${clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` ||
        n.key.toLowerCase() === `theme.${clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` ||
        n.key.toLowerCase() === `mood.${clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` ||
        n.key.toLowerCase() === `style.${clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
    );
    if (found) return found.id;
  }
  const normalized = labelOrKey.trim().toLowerCase();
  return CANONICAL_TAXONOMY_MAP[normalized];
}
