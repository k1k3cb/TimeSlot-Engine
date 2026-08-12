import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DateTime } from 'luxon';
import { availabilityApi, bookingsApi, resourcesApi } from '../api/endpoints';
import type { Resource, Slot } from '../types/domain';
import { useBookingNotifications } from '../hooks/useBookingNotifications';

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initialResource = (location.state as { resource?: Resource } | null)?.resource;
  const today = DateTime.now().toISODate()!;
  const tomorrow = DateTime.now().plus({ days: 1 }).toISODate()!;
  const [date, setDate] = useState(tomorrow);
  const [duration, setDuration] = useState(60);

  const resourceQuery = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourcesApi.get(id!),
    initialData: initialResource,
    enabled: !!id,
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability', id, date, duration],
    queryFn: () => availabilityApi.compute({ resourceId: id!, date, slotMinutes: duration }),
    enabled: !!id,
  });

  const createBooking = useMutation({
    mutationFn: (slot: Slot) =>
      bookingsApi.create({
        resourceId: id!,
        startAt: slot.start,
        durationMinutes: duration,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  useBookingNotifications(() => {
    queryClient.invalidateQueries({ queryKey: ['availability', id] });
  });

  const slots = availabilityQuery.data?.slots ?? [];
  const tz = availabilityQuery.data?.timezone ?? resourceQuery.data?.timezone ?? 'UTC';

  const groupedByPeriod = useMemo(() => {
    const groups = { morning: [] as Slot[], afternoon: [] as Slot[], evening: [] as Slot[] };
    for (const s of slots) {
      const local = DateTime.fromISO(s.start).setZone(tz);
      const hour = local.hour;
      if (hour < 12) groups.morning.push(s);
      else if (hour < 18) groups.afternoon.push(s);
      else groups.evening.push(s);
    }
    return groups;
  }, [slots, tz]);

  if (!resourceQuery.data) return <p>Cargando...</p>;
  const resource = resourceQuery.data;

  return (
    <div className="page">
      <header className="topbar">
        <button onClick={() => navigate('/')}>← Volver</button>
        <h1>{resource.name}</h1>
        <div className="muted">{tz}</div>
      </header>

      <section className="filters">
        <label>
          Fecha
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Duración
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </label>
        <Link to="/bookings" className="link-btn">
          Mis reservas
        </Link>
      </section>

      <main>
        {availabilityQuery.isLoading && <p>Calculando slots...</p>}
        {availabilityQuery.error && <p className="error">No se pudo calcular disponibilidad</p>}

        {(['morning', 'afternoon', 'evening'] as const).map((period) => (
          <section key={period} className="slot-group">
            <h3>
              {period === 'morning' ? 'Mañana' : period === 'afternoon' ? 'Tarde' : 'Noche'}
            </h3>
            {groupedByPeriod[period].length === 0 ? (
              <p className="muted">Sin slots disponibles</p>
            ) : (
              <div className="slot-grid">
                {groupedByPeriod[period].map((s) => {
                  const start = DateTime.fromISO(s.start).setZone(tz).toFormat('HH:mm');
                  const end = DateTime.fromISO(s.end).setZone(tz).toFormat('HH:mm');
                  return (
                    <button
                      key={s.start}
                      className="slot"
                      disabled={createBooking.isPending}
                      onClick={() => createBooking.mutate(s)}
                    >
                      {start} – {end}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {createBooking.isError && (
          <p className="error">
            {(createBooking.error as { response?: { data?: { message?: string } } }).response?.data
              ?.message ?? 'No se pudo crear la reserva'}
          </p>
        )}
        {createBooking.isSuccess && (
          <p className="success">Reserva creada: {createBooking.data.id}</p>
        )}
      </main>
    </div>
  );
}