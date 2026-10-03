import { z } from 'zod';

// ==============================================================================
// 1. AUTHENTICATION & USER SCHEMAS
// ==============================================================================

export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  locale: z.string().default('en-US'),
  country_code: z.string().default('US'),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().nullable().optional(),
  token_type: z.string().default('bearer'),
  expires_in: z.number(),
  user: PublicUserSchema,
  session_id: z.string(),
  guest_reconciled: z.boolean().default(false),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const GuestSessionResponseSchema = z.object({
  guest_session_id: z.string(),
  session_type: z.string().default('guest'),
  expires_at: z.string(),
  created_at: z.string(),
});

export type GuestSessionResponse = z.infer<typeof GuestSessionResponseSchema>;

export const AuthMessageSchema = z.object({
  message: z.string(),
  status: z.string().default('ok'),
});

export type AuthMessage = z.infer<typeof AuthMessageSchema>;

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Helper to extract error message
async function parseError(response: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join(', ');
    }
    if (data.message) {
      return String(data.message);
    }
  } catch {
    // Non-JSON response
  }
  return `${defaultMsg} (${response.status})`;
}

// ==============================================================================
// 2. AUTHENTICATION API METHODS
// ==============================================================================

export interface RegisterPayload {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
  guest_session_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  guest_session_id?: string;
}

/**
 * Registers a new user account, returning authentication tokens and public user details.
 */
export async function registerApi(payload: RegisterPayload): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMsg = await parseError(response, 'Registration failed');
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

/**
 * Authenticates user credentials with email and password.
 */
export async function loginApi(payload: LoginPayload): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMsg = await parseError(response, 'Invalid email or password');
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

/**
 * Rotates the refresh token (sent in HTTP-only cookie or optional body) and issues a new access token.
 */
export async function refreshApi(refreshToken?: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
  });

  if (!response.ok) {
    const errorMsg = await parseError(response, 'Session refresh failed');
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

/**
 * Revokes the active session on PostgreSQL and clears HTTP-only authentication cookies.
 */
export async function logoutApi(accessToken?: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore network failure on logout so client-side state is always wiped
  }
}

/**
 * Creates an anonymous discovery guest session.
 */
export async function createGuestSessionApi(): Promise<GuestSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorMsg = await parseError(response, 'Guest session creation failed');
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return GuestSessionResponseSchema.parse(data);
}

/**
 * Retrieves the currently authenticated user profile using the Bearer access token.
 */
export async function getMeApi(accessToken: string): Promise<PublicUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorMsg = await parseError(response, 'Failed to fetch user profile');
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return PublicUserSchema.parse(data);
}
