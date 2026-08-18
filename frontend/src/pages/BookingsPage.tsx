import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { bookingsApi } from '../api/endpoints';
import { ClientNav } from '../components/ClientNav';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No show',
};

function getSportType(name: string): 'padel' | 'tenis' | 'futbol' | 'default' {
  const n = name.toLowerCase();
  if (n.includes('pádel') || n.includes('padel')) return 'padel';
  if (n.includes('tenis') || n.includes('tennis')) return 'tenis';
  if (n.includes('fútbol') || n.includes('futbol')) return 'futbol';
  return 'default';
}

function getSportLabel(type: string): string {
  switch (type) {
    case 'padel': return 'PÁDEL';
    case 'tenis': return 'TENIS';
    case 'futbol': return 'FÚTBOL 5';
    default: return 'CANCHAS';
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'status-confirmed';
    case 'PENDING': return 'status-pending';
    case 'COMPLETED': return 'status-completed';
    case 'CANCELLED': return 'status-cancelled';
    default: return 'status-completed';
  }
}

function CourtImage({ type }: { type: string }) {
  const gradients: Record<string, string> = {
    padel: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
    tenis: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
    futbol: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
    default: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3730a3 100%)',
  };
  return (
    <div style={{ width: '100%', height: '100%', background: gradients[type] || gradients.default, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="32" height="32" viewBox="0 0 64 64" fill="none" opacity="0.3">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#fff" strokeWidth="2" />
        <line x1="32" y1="8" x2="32" y2="56" stroke="#fff" strokeWidth="1.5" />
        <line x1="8" y1="32" x2="56" y2="32" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

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

  const upcoming = data?.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED') ?? [];
  const history = data?.filter((b) => b.status !== 'PENDING' && b.status !== 'CONFIRMED') ?? [];

  return (
    <div className="client-page">
      <ClientNav />

      <main className="client-main">
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <h1>Mis reservas</h1>
            <Link to="/" className="admin-primary-btn" style={{ textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva Reserva
            </Link>
          </div>
          <p className="muted" style={{ margin: '0 0 2rem', fontSize: '0.95rem' }}>
            Gestiona tus turnos activos e historial de partidos.
          </p>

          {isLoading && <p className="muted">Cargando...</p>}
          {error && <p className="error">Error al cargar reservas</p>}
          {data && data.length === 0 && <p className="muted">Sin reservas todavía.</p>}

          {upcoming.length > 0 && (
            <div className="booking-section">
              <h3 className="booking-section-title">Próximas</h3>
              <div className="booking-list">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={() => cancel.mutate(b.id)} isCancelling={cancel.isPending} />
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="booking-section">
              <h3 className="booking-section-title">Historial</h3>
              <div className="booking-list">
                {history.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={() => cancel.mutate(b.id)} isCancelling={cancel.isPending} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({ booking, onCancel, isCancelling }: {
  booking: any;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const tz = booking.resource.timezone || 'UTC';
  const start = DateTime.fromISO(booking.startAt).setZone(tz);
  const end = DateTime.fromISO(booking.endAt).setZone(tz);
  const dateStr = start.setLocale('es').toFormat("cccc d 'de' MMMM");
  const timeStr = `${start.toFormat('HH:mm')} – ${end.toFormat('HH:mm')}`;
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  const sportType = getSportType(booking.resource.name);
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <div className="booking-card">
      <div className="booking-card-image">
        <CourtImage type={sportType} />
      </div>

      <div className="booking-card-info">
        <div className="booking-card-header">
          <h4 className="booking-card-name">{booking.resource.name}</h4>
          <span className="booking-card-sport">{getSportLabel(sportType)}</span>
        </div>

        <div className="booking-card-details">
          <span className="booking-card-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dateStr}
          </span>
          <span className="booking-card-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {timeStr}
          </span>
          <span className="booking-card-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {city}
          </span>
        </div>

        <div className="booking-card-badges">
          <span className={`booking-card-status ${getStatusClass(booking.status)}`}>
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
          {booking.refundPct != null && (
            <span className="booking-card-refund">
              Reembolso {booking.refundPct}%
            </span>
          )}
        </div>
      </div>

      {canCancel && (
        <div className="booking-card-actions">
          <button className="cancel-btn" onClick={onCancel} disabled={isCancelling}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
