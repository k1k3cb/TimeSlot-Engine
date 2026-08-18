import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../api/endpoints', () => ({
  authApi: { register: vi.fn() },
}));

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar/i)).toBeInTheDocument();
  });

  it('shows error on password mismatch', async () => {
    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar/i), 'different');
    await user.click(screen.getByRole('button', { name: /registrarse/i }));

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('shows error on short password', async () => {
    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), '12345');
    await user.type(screen.getByLabelText(/confirmar/i), '12345');
    await user.click(screen.getByRole('button', { name: /registrarse/i }));

    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
  });

  it('navigates to /login on success', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValue({ id: '1' });

    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { registered: true } });
    });
  });

  it('shows server error message on failure', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.register as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: 'Email ya registrado' } },
    });

    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText('Email ya registrado')).toBeInTheDocument();
    });
  });

  it('shows fallback error on failure without message', async () => {
    const { authApi } = await import('../api/endpoints');
    (authApi.register as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText('Error al registrarse')).toBeInTheDocument();
    });
  });

  it('has minLength on password input', () => {
    renderRegister();
    expect(screen.getByLabelText(/^contraseña$/i)).toHaveAttribute('minlength', '6');
  });
});
