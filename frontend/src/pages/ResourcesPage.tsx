import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../api/endpoints';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import { ClientNav } from '../components/ClientNav';
import type { BookingEvent } from '../types/domain';

export function ResourcesPage() {
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
    <div className="client-page">
      <ClientNav />

      <main className="client-main">
        <div className="client-content">
          <div className="client-hero">
            <h1>Reserva tu cancha</h1>
            <p>Selecciona una cancha para ver disponibilidad y reservar</p>
          </div>

          {isLoading && <p className="center">Cargando...</p>}
          {error && <p className="error center">Error al cargar canchas</p>}
          {data && data.length === 0 && <p className="center muted">No hay canchas disponibles.</p>}

          <div className="grid">
            {data?.map((r) => (
              <Link
                key={r.id}
                to={`/resources/${r.id}`}
                className="card"
                state={{ resource: r }}
              >
                <div className="card-header">
                  <h2>{r.name}</h2>
                  <span className={`badge ${r.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                    {r.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="muted">{r.description}</p>
                <div className="meta">
                  <span className="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {r.timezone.split('/').pop()?.replace(/_/g, ' ') ?? r.timezone}
                  </span>
                  <span className="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {r.mode === 'EXCLUSIVE' ? 'Exclusivo' : `Compartido (${r.capacity})`}
                  </span>
                </div>
                <p className="hint">Ver disponibilidad →</p>
              </Link>
            ))}
          </div>
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