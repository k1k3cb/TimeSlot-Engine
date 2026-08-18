import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  setMemoryAuth: vi.fn(),
  clearAuth: vi.fn(),
  loadStoredAuth: vi.fn().mockReturnValue(null),
  api: { get: vi.fn() },
}));

function TestConsumer() {
  const { user, loading, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when useAuth is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used inside AuthProvider');
    consoleSpy.mockRestore();
  });

  it('starts with loading=true then flips to false when no stored auth', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('loads user from /auth/me when stored auth exists', async () => {
    const { loadStoredAuth, api } = await import('../api/client');
    (loadStoredAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com' },
    });
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: '1', email: 'test@test.com', name: 'Test', role: 'CLIENT' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@test.com');
    });
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('clears auth when /auth/me fails', async () => {
    const { loadStoredAuth, api, clearAuth } = await import('../api/client');
    (loadStoredAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: '1' },
    });
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unauthorized'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(clearAuth).toHaveBeenCalled();
  });

  it('logout clears user', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const { clearAuth } = await import('../api/client');
    screen.getByText('Logout').click();
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(clearAuth).toHaveBeenCalled();
  });
});
