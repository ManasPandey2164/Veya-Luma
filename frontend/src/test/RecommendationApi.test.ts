import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRecommendationsApi,
  RecommendationResponseSchema,
  RecommendationItemSchema,
  RecommendationExplanationSchema,
} from '../services/recommendationApi';

describe('Recommendation API Client (Step 18)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates schema parsing for recommendation explanations and items', () => {
    const explanation = {
      reason_code: 'GENRE_ALIGNMENT',
      label: 'Aligns with your interest in Sci-Fi',
      evidence: ['Genre: Science Fiction'],
    };
    expect(RecommendationExplanationSchema.parse(explanation)).toEqual(explanation);

    const item = {
      id: '4bd4bc46-67ad-4cff-bf69-fe90314b83bf',
      title: 'Solaris',
      original_language: 'ru',
      release_year: 1972,
      runtime_minutes: 167,
      poster_path: '/solaris.jpg',
      backdrop_path: '/solaris_bg.jpg',
      popularity: 28.5,
      vote_average: 7.9,
      vote_count: 1400,
      channel: 'DISCOVERY',
      contributing_channels: ['DISCOVERY', 'CONTENT_MATCH'],
      score: 0.8421,
      is_in_watchlist: false,
      explanations: [explanation],
      matched_features: { genres: ['Science Fiction'] },
      features: { content_score: 0.75, discovery_score: 0.9 },
    };
    expect(RecommendationItemSchema.parse(item)).toBeDefined();

    const response = {
      items: [item],
      total_candidates: 45,
      returned_count: 1,
      is_cold_start: false,
      channels_represented: ['DISCOVERY'],
      execution_time_ms: 124.5,
    };
    expect(RecommendationResponseSchema.parse(response)).toBeDefined();
  });

  it('sends Bearer token when authenticated', async () => {
    const mockResponse = {
      items: [],
      total_candidates: 0,
      returned_count: 0,
      is_cold_start: true,
      channels_represented: [],
      execution_time_ms: 50.2,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const res = await fetchRecommendationsApi({
      token: 'mock-jwt-token',
      limit: 10,
      channel: 'CONTENT_MATCH',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:8000/api/v1/recommendations?limit=10&channel=CONTENT_MATCH'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token',
        }),
      })
    );
    expect(res.is_cold_start).toBe(true);
  });

  it('sends X-Session-ID header when guest session is provided', async () => {
    const mockResponse = {
      items: [],
      total_candidates: 0,
      returned_count: 0,
      is_cold_start: true,
      channels_represented: [],
      execution_time_ms: 45.0,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const res = await fetchRecommendationsApi({
      sessionId: 'session-guest-uuid',
      limit: 5,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:8000/api/v1/recommendations?limit=5'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Session-ID': 'session-guest-uuid',
        }),
      })
    );
    expect(res.returned_count).toBe(0);
  });

  it('throws descriptive error on HTTP failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Authentication credentials required.' }),
    } as Response);

    await expect(fetchRecommendationsApi()).rejects.toThrow('Authentication credentials required.');
  });
});
