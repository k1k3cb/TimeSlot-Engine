import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { bookingsApi } from '../api/endpoints';
import { ClientNav } from '../components/ClientNav';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No show',
};

export function BookingsPage() {
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
    <div className="client-page">
      <ClientNav />

      <main className="client-main">
        <div className="client-content">
          <h1>Mis reservas</h1>

          {isLoading && <p>Cargando...</p>}
          {error && <p className="error">Error al cargar reservas</p>}
          {data && data.length === 0 && <p className="muted">Sin reservas todavía.</p>}

          <ul className="booking-list">
            {data?.map((b) => {
              const tz = b.resource.timezone || 'UTC';
              const start = DateTime.fromISO(b.startAt).setZone(tz).setLocale('es');
              const end = DateTime.fromISO(b.endAt).setZone(tz);
              const dateStr = start.toFormat("d 'de' MMMM yyyy");
              const timeStr = `${start.toFormat('HH:mm')} – ${end.toFormat('HH:mm')}`;
              const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
              return (
                <li key={b.id} className={`booking booking-${b.status.toLowerCase()}`}>
                  <div>
                    <strong>{b.resource.name}</strong>
                    <p className="muted">{dateStr} · {timeStr} ({city})</p>
                    <span className={`badge badge-${b.status.toLowerCase()}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
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
        </div>
      </main>
    </div>
  );
}