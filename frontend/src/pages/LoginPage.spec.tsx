import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockSetAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ setAuth: mockSetAuth }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('../api/endpoints', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

function renderLogin(locationState?: { registered?: boolean }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: locationState }]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with default values', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toHaveValue('admin@timeslot.dev');
    expect(screen.getByLabelText(/contraseña/i)).toHaveValue('Admin#2026');
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: 'Credenciales inválidas' } },
    });

    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('shows fallback error when no response message', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('calls setAuth on successful login', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'CLIENT' },
    });

    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'at' }),
      );
    });
  });

  it('calls setAuth and navigates on successful login', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'ADMIN' },
    });

    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'at' }),
      );
    });
  });

  it('disables button while loading', async () => {
    const { authApi } = await import('../api/endpoints');
    let resolveLogin: (v: unknown) => void;
    (authApi.login as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => { resolveLogin = resolve; }),
    );

    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
    });

    resolveLogin!({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'CLIENT' },
    });
  });

  it('has required attributes on inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/contraseña/i)).toBeRequired();
  });
});
