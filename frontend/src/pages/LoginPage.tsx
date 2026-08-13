import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = (location.state as { registered?: boolean })?.registered;
  const [email, setEmail] = useState('admin@timeslot.dev');
  const [password, setPassword] = useState('Admin#2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data);
      setTimeout(() => {
        navigate(data.user.role === 'ADMIN' ? '/admin' : '/');
      }, 0);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-brand">
          <span className="login-left-brand-mark">TS</span>
          <span className="login-left-brand-text">TimeSlot</span>
        </div>
        <div className="login-left-content">
          <h2>Tu próximo partido empieza aquí.</h2>
          <p>Gestiona todas tus reservas de pádel, tenis y fútbol desde un único lugar.</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-card">
          <div className="login-form-header">
            <h1>Bienvenido</h1>
            <p>Inicia sesión para gestionar tus reservas</p>
          </div>

          {registered && (
            <div className="login-success">Cuenta creada. Ahora inicia sesión.</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </form>

          <p className="login-footer">
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>

          <div className="login-demo">
            <p className="login-demo-title">Cuentas de prueba</p>
            <div className="login-demo-accounts">
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => { setEmail('admin@timeslot.dev'); setPassword('Admin#2026'); }}
              >
                <span className="login-demo-role">Admin</span>
                <span className="login-demo-email">admin@timeslot.dev</span>
              </button>
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => { setEmail('juan@timeslot.dev'); setPassword('Client#2026'); }}
              >
                <span className="login-demo-role">Cliente</span>
                <span className="login-demo-email">juan@timeslot.dev</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
