import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { bookingsApi, resourcesApi } from '../api/endpoints';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'NO_SHOW', label: 'No show' },
];

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [resourceId, setResourceId] = useState('');

  const { data: resources } = useQuery({
    queryKey: ['admin-resources-for-filter'],
    queryFn: () => resourcesApi.listAll(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', status, resourceId],
    queryFn: () =>
      bookingsApi.list({
        ...(status ? { status } : {}),
        ...(resourceId ? { resourceId } : {}),
      }),
  });

  const confirm = useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const complete = useMutation({
    mutationFn: (id: string) => bookingsApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const noShow = useMutation({
    mutationFn: (id: string) => bookingsApi.markNoShow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  return (
    <div>
      <div className="admin-page-header">
        <h1>Reservas</h1>
      </div>

      <div className="filters">
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label>
          Cancha
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">Todas</option>
            {resources?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error">Error al cargar reservas</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cancha</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((b) => {
              const tz = b.resource.timezone || 'UTC';
              const start = DateTime.fromISO(b.startAt).setZone(tz).setLocale('es');
              const end = DateTime.fromISO(b.endAt).setZone(tz);
              return (
                <tr key={b.id}>
                  <td><strong>{b.resource.name}</strong></td>
                  <td>
                    {b.user ? (
                      <>
                        <span>{b.user.name}</span>
                        <p className="muted admin-cell-sub">{b.user.email}</p>
                      </>
                    ) : (
                      <span className="muted">{b.userId}</span>
                    )}
                  </td>
                  <td>{start.toFormat("d 'de' MMMM yyyy")}</td>
                  <td>{start.toFormat('HH:mm')} – {end.toFormat('HH:mm')}</td>
                  <td>
                    <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                    {b.refundPct != null && (
                      <span className="badge">Reembolso {b.refundPct}%</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      {b.status === 'PENDING' && (
                        <button
                          className="admin-btn-sm"
                          disabled={confirm.isPending}
                          onClick={() => confirm.mutate(b.id)}
                        >
                          Confirmar
                        </button>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button
                            className="admin-btn-sm"
                            disabled={complete.isPending}
                            onClick={() => complete.mutate(b.id)}
                          >
                            Completar
                          </button>
                          <button
                            className="admin-btn-sm admin-btn-danger"
                            disabled={noShow.isPending}
                            onClick={() => noShow.mutate(b.id)}
                          >
                            No show
                          </button>
                        </>
                      )}
                      {(b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'NO_SHOW') && (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {data && data.length === 0 && (
              <tr><td colSpan={6} className="muted">No hay reservas con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
