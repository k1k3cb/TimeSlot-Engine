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
      navigate('/');
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
      <div className="login-bg">
        <div className="login-court-lines" aria-hidden="true">
          <div className="court-line court-line-h court-line-1" />
          <div className="court-line court-line-h court-line-2" />
          <div className="court-line court-line-v court-line-3" />
          <div className="court-line court-line-v court-line-4" />
          <div className="court-line court-line-net" />
        </div>
        <div className="login-bg-gradient" />
      </div>

      <div className="login-content">
        <div className="login-brand">
          <span className="login-mark">TS</span>
          <span className="login-logo">TimeSlot</span>
        </div>

        <form onSubmit={handleSubmit} className="login-card">
          <div className="login-card-header">
            <h1>Bienvenido</h1>
            <p>Inicia sesión para gestionar tus reservas</p>
          </div>

          {registered && (
            <div className="login-success">Cuenta creada. Ahora inicia sesión.</div>
          )}

          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="login-footer">
            <p>
              ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
            </p>
          </div>
        </form>

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
  );
}