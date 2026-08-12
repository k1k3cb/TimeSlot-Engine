import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import type { BookingEvent } from '../types/domain';

export function ResourcesPage() {
  const { user, logout } = useAuth();
  const [toasts, setToasts] = useState<BookingEvent[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourcesApi.list(),
  });

  useBookingNotifications((evt) => {
    setToasts((prev) => [evt, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.at !== evt.at));
    }, 6000);
  });

  const today = useMemo(() => DateTime.now().toISODate(), []);

  return (
    <div className="page">
      <header className="topbar">
        <h1>Canchas</h1>
        <div className="user-info">
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="link-btn">Admin</Link>
          )}
          <Link to="/bookings" className="link-btn">Mis reservas</Link>
          <span>
            {user?.name} <small>({user?.role})</small>
          </span>
          <button onClick={logout}>Salir</button>
        </div>
      </header>

      <main>
        {isLoading && <p>Cargando...</p>}
        {error && <p className="error">Error al cargar canchas</p>}
        {data && data.length === 0 && <p>No hay canchas disponibles.</p>}

        <div className="grid">
          {data?.map((r) => (
            <Link
              key={r.id}
              to={`/resources/${r.id}`}
              className="card"
              state={{ resource: r }}
            >
              <h2>{r.name}</h2>
              <p className="muted">{r.description}</p>
              <div className="meta">
                <span>Zona horaria: {r.timezone}</span>
                <span>Modo: {r.mode}</span>
                <span>Capacidad: {r.capacity}</span>
              </div>
              <p className="hint">Ver disponibilidad →</p>
              <p className="hint">Fecha actual: {today}</p>
            </Link>
          ))}
        </div>
      </main>

      <aside className="toasts">
        {toasts.map((t) => (
          <div key={t.at} className={`toast toast-${t.type}`}>
            <strong>{t.type.toUpperCase()}</strong>
            <p>{t.message}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}