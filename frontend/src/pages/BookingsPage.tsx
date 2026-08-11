import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { bookingsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export function BookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list(),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="link-btn">← Canchas</Link>
        <h1>Mis reservas</h1>
        <span className="muted">{user?.role}</span>
      </header>

      <main>
        {isLoading && <p>Cargando...</p>}
        {error && <p className="error">Error al cargar reservas</p>}
        {data && data.length === 0 && <p>Sin reservas todavía.</p>}

        <ul className="booking-list">
          {data?.map((b) => {
            const tz = b.resource.timezone || 'UTC';
            const start = DateTime.fromISO(b.startAt).setZone(tz).toFormat('dd LLL yyyy HH:mm');
            const end = DateTime.fromISO(b.endAt).setZone(tz).toFormat('HH:mm');
            return (
              <li key={b.id} className={`booking booking-${b.status.toLowerCase()}`}>
                <div>
                  <strong>{b.resource.name}</strong>
                  <p className="muted">
                    {start} – {end} ({tz})
                  </p>
                  <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                  {b.refundPct != null && (
                    <span className="badge">Reembolso {b.refundPct}%</span>
                  )}
                </div>
                {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                  <button onClick={() => cancel.mutate(b.id)} disabled={cancel.isPending}>
                    Cancelar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}