import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AuthProvider,
  useAuth,
  PreferencesProvider,
  AtmosphereProvider,
  LibraryProvider,
} from '../context';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/auth/AuthModal';
import { AccountPage } from '../pages/AccountPage';
import {
  registerApi,
  loginApi,
  refreshApi,
  createGuestSessionApi,
  getMeApi,
} from '../services/authApi';

const mockUser = {
  id: 'b3f68a25-e51c-4b52-959c-93df49c40210',
  email: 'curator@veyaluma.internal',
  username: 'auteur_explorer',
  display_name: 'Auteur Explorer',
  is_active: true,
  is_verified: false,
  locale: 'en-US',
  country_code: 'US',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
};

const mockTokenResponse = {
  access_token: 'mock.access.token',
  refresh_token: 'mock.refresh.token',
  token_type: 'bearer',
  expires_in: 900,
  user: mockUser,
  session_id: '4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f',
  guest_reconciled: false,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <AtmosphereProvider>
            <LibraryProvider>
              <MemoryRouter>{ui}</MemoryRouter>
            </LibraryProvider>
          </AtmosphereProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Test consumer component for testing useAuth directly
const AuthTestConsumer: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isGuest,
    guestSessionId,
    login,
    register,
    logout,
    error,
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="guest-status">{isGuest ? 'true' : 'false'}</div>
      <div data-testid="user-email">{user ? user.email : 'no-user'}</div>
      <div data-testid="guest-id">{guestSessionId || 'no-guest-id'}</div>
      {error && <div data-testid="auth-error">{error}</div>}
      <button
        onClick={() =>
          login({ email: 'curator@veyaluma.internal', password: 'ValidPassword123!' })
        }
      >
        Trigger Login
      </button>
      <button
        onClick={() =>
          register({
            email: 'newcurator@veyaluma.internal',
            password: 'ValidPassword123!',
            username: 'newcurator',
          })
        }
      >
        Trigger Register
      </button>
      <button onClick={() => logout()}>Trigger Logout</button>
    </div>
  );
};

describe('Phase 3 Step 16 — Frontend Authentication & Session Persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage && typeof window.sessionStorage.clear === 'function') {
        window.sessionStorage.clear();
      }
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.clear === 'function') {
        window.localStorage.clear();
      }
    } catch {
      // Storage unavailable in test runner
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. API Service Unit Contracts', () => {
    it('registerApi parses valid registration response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const res = await registerApi({
        email: 'curator@veyaluma.internal',
        password: 'ValidPassword123!',
      });
      expect(res.access_token).toBe('mock.access.token');
      expect(res.user.email).toBe('curator@veyaluma.internal');
      expect(res.session_id).toBe('4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f');
    });

    it('loginApi parses valid login response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const res = await loginApi({
        email: 'curator@veyaluma.internal',
        password: 'ValidPassword123!',
      });
      expect(res.access_token).toBe('mock.access.token');
      expect(res.user.username).toBe('auteur_explorer');
    });

    it('loginApi throws friendly error on 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid email or password.' }),
      });

      await expect(
        loginApi({ email: 'wrong@example.com', password: 'Wrong' })
      ).rejects.toThrow('Invalid email or password.');
    });

    it('refreshApi parses refreshed tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockTokenResponse,
          access_token: 'new.access.token',
        }),
      });

      const res = await refreshApi();
      expect(res.access_token).toBe('new.access.token');
      expect(res.user.email).toBe('curator@veyaluma.internal');
    });

    it('createGuestSessionApi initiates anonymous guest session', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          guest_session_id: '99999999-9999-4999-8999-999999999999',
          session_type: 'guest',
          expires_at: '2026-11-01T12:00:00Z',
          created_at: '2026-10-01T12:00:00Z',
        }),
      });

      const res = await createGuestSessionApi();
      expect(res.guest_session_id).toBe('99999999-9999-4999-8999-999999999999');
      expect(res.session_type).toBe('guest');
    });

    it('getMeApi fetches user profile', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const user = await getMeApi('valid.access.token');
      expect(user.id).toBe(mockUser.id);
      expect(user.email).toBe(mockUser.email);
    });
  });

  describe('2. AuthProvider & useAuth Hook Lifecycle', () => {
    it('initializes in anonymous guest state by default', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          guest_session_id: 'guest-init-1234',
          session_type: 'guest',
          expires_at: '2026-11-01T12:00:00Z',
          created_at: '2026-10-01T12:00:00Z',
        }),
      });

      renderWithProviders(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
        expect(screen.getByTestId('guest-status')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
      });
    });

    it('restores authenticated state on silent refresh', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      renderWithProviders(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('guest-status')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('curator@veyaluma.internal');
      });
    });

    it('handles login and transitions from guest to authenticated', async () => {
      // First call (silent refresh) fails
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('No cookie'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            guest_session_id: 'guest-pre-login',
            session_type: 'guest',
            expires_at: '2026-11-01T12:00:00Z',
            created_at: '2026-10-01T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTokenResponse,
            guest_reconciled: true,
          }),
        });

      renderWithProviders(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
      });

      // Trigger login
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger Login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-email')).toHaveTextContent('curator@veyaluma.internal');
      });
    });

    it('handles logout and reverts back to guest exploration', async () => {
      // Silent refresh succeeds
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        // Logout call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Logged out successfully.' }),
        })
        // Post-logout guest session creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            guest_session_id: 'guest-after-logout',
            session_type: 'guest',
            expires_at: '2026-11-01T12:00:00Z',
            created_at: '2026-10-01T12:00:00Z',
          }),
        });

      renderWithProviders(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Trigger logout
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger Logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
      });
    });
  });

  describe('3. UI Component Integration', () => {
    it('renders Sign In button in Navbar when in guest mode', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      renderWithProviders(<Navbar />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sign In or Register/i })).toBeInTheDocument();
      });
    });

    it('opens AuthModal upon clicking Sign In in Navbar', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      renderWithProviders(<Navbar />);

      const signInBtn = await screen.findByRole('button', { name: /Sign In or Register/i });
      fireEvent.click(signInBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sign In to Your Sanctuary')).toBeInTheDocument();
    });

    it('allows toggling between Sign In and Register in AuthModal', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <AuthModal isOpen={true} onClose={vi.fn()} defaultMode="login" />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Sign In to Your Sanctuary')).toBeInTheDocument();

      // Click Register tab
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));

      expect(screen.getByText('Join the Curatorial Circle')).toBeInTheDocument();
      expect(screen.getByLabelText(/Curator Username/i)).toBeInTheDocument();
    });

    it('renders guest exploration status on AccountPage when not logged in', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      renderWithProviders(<AccountPage />);

      await waitFor(() => {
        expect(screen.getByText('Identity & Authentication')).toBeInTheDocument();
        expect(screen.getByText('Guest Exploration')).toBeInTheDocument();
        expect(
          screen.getByText(/Anonymous Discovery Session Active/i)
        ).toBeInTheDocument();
      });
    });
  });
});
