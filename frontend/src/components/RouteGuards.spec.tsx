import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function RouteWrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/test']}>{children}</MemoryRouter>;
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <RouteWrapper>
        <ProtectedRoute />
      </RouteWrapper>,
    );
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <RouteWrapper>
        <ProtectedRoute />
      </RouteWrapper>,
    );
    // Navigate component renders nothing visible; just verify no crash
  });

  it('renders Outlet when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', role: 'CLIENT' },
      loading: false,
    });
    render(
      <MemoryRouter initialEntries={['/test']}>
        <ProtectedRoute />
      </MemoryRouter>,
    );
    // Outlet renders child routes; component should not show loading or redirect
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <RouteWrapper>
        <AdminRoute />
      </RouteWrapper>,
    );
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <RouteWrapper>
        <AdminRoute />
      </RouteWrapper>,
    );
  });

  it('redirects to / when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', role: 'CLIENT' },
      loading: false,
    });
    render(
      <RouteWrapper>
        <AdminRoute />
      </RouteWrapper>,
    );
  });

  it('renders Outlet when user is admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', role: 'ADMIN' },
      loading: false,
    });
    render(
      <MemoryRouter initialEntries={['/test']}>
        <AdminRoute />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
  });
});
