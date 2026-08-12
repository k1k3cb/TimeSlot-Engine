import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  {
    to: '/',
    label: 'Canchas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/bookings',
    label: 'Mis reservas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

export function ClientNav() {
  const { user, logout } = useAuth();

  return (
    <header className="client-nav">
      <div className="client-nav-inner">
        <Link to="/" className="client-nav-brand">
          <span className="client-nav-mark">TS</span>
          <span className="client-nav-logo">TimeSlot</span>
        </Link>

        <nav className="client-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="client-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="client-nav-link client-nav-admin">
              <span className="client-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span>Admin</span>
            </Link>
          )}
        </nav>

        <div className="client-nav-user">
          <div className="client-nav-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="client-nav-user-info">
            <span className="client-nav-user-name">{user?.name}</span>
            <span className="client-nav-user-role">{user?.role === 'ADMIN' ? 'Administrador' : 'Cliente'}</span>
          </div>
          <button className="client-nav-logout" onClick={logout} title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
