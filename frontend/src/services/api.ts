import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.string(),
  environment: z.string(),
  version: z.string(),
  database: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Get base URL from environment or fallback to relative/standard port
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Fetches the system health status from the backend.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }

  const data = await response.json();
  return HealthResponseSchema.parse(data);
}
