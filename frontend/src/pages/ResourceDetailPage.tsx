import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DateTime } from 'luxon';
import { availabilityApi, bookingsApi, resourcesApi } from '../api/endpoints';
import { ClientNav } from '../components/ClientNav';
import type { Resource, Slot } from '../types/domain';
import { useBookingNotifications } from '../hooks/useBookingNotifications';

const AMENITIES = [
  {
    label: 'Estacionamiento',
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>,
  },
  {
    label: 'Vestuarios',
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  },
  {
    label: 'Iluminación LED',
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>,
  },
  {
    label: 'Pro Shop',
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
  },
  {
    label: 'Cafetería',
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>,
  },
];

function getSportType(name: string): 'padel' | 'tenis' | 'futbol' | 'default' {
  const n = name.toLowerCase();
  if (n.includes('pádel') || n.includes('padel')) return 'padel';
  if (n.includes('tenis') || n.includes('tennis')) return 'tenis';
  if (n.includes('fútbol') || n.includes('futbol')) return 'futbol';
  return 'default';
}

function CourtHeroImage({ type }: { type: string }) {
  const gradients: Record<string, string> = {
    padel: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
    tenis: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
    futbol: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
    default: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3730a3 100%)',
  };
  return (
    <div style={{ width: '100%', height: '100%', background: gradients[type] || gradients.default, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="80" height="80" viewBox="0 0 64 64" fill="none" opacity="0.2">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#fff" strokeWidth="2" />
        <line x1="32" y1="8" x2="32" y2="56" stroke="#fff" strokeWidth="1.5" />
        <line x1="8" y1="32" x2="56" y2="32" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function CourtThumb({ type, idx }: { type: string; idx: number }) {
  const colors = ['#0c4a6e', '#166534', '#7c2d12', '#4c1d95'];
  return (
    <div style={{ width: '100%', height: '100%', background: colors[idx % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 64 64" fill="none" opacity="0.25">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#fff" strokeWidth="2" />
        <line x1="32" y1="8" x2="32" y2="56" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function getDayLabel(date: DateTime, idx: number): string {
  if (idx === 0) return 'Hoy';
  if (idx === 1) return 'Mañ';
  return date.setLocale('es').toFormat('EEE');
}

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initialResource = (location.state as { resource?: Resource } | null)?.resource;
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [duration, setDuration] = useState(90);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dates = useMemo(() => {
    const arr: DateTime[] = [];
    for (let i = 0; i < 5; i++) {
      arr.push(DateTime.now().plus({ days: i }));
    }
    return arr;
  }, []);

  const selectedDate = customDate ? DateTime.fromISO(customDate) : dates[selectedDateIdx];
  const dateStr = selectedDate.toISODate()!;

  const today: DateTime = DateTime.now();

  const toggleCalendar = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    if (calendarOpen) {
      input.blur();
      setCalendarOpen(false);
    } else {
      input.showPicker();
      setCalendarOpen(true);
    }
  }, [calendarOpen]);

  useEffect(() => {
    const input = dateInputRef.current;
    if (!input) return;
    const onFocus = () => setCalendarOpen(true);
    const onBlur = () => setCalendarOpen(false);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    };
  }, []);

  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const idx = dates.findIndex((d) => d.toISODate() === val);
    if (idx >= 0) {
      setSelectedDateIdx(idx);
      setCustomDate(null);
    } else {
      setCustomDate(val);
      setSelectedDateIdx(-1);
    }
    setSelectedSlot(null);
    setCalendarOpen(false);
  }

  const resourceQuery = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourcesApi.get(id!),
    initialData: initialResource,
    enabled: !!id,
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability', id, dateStr, duration],
    queryFn: () => availabilityApi.compute({ resourceId: id!, date: dateStr, slotMinutes: duration }),
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
      setSelectedSlot(null);
    },
  });

  useBookingNotifications(() => {
    queryClient.invalidateQueries({ queryKey: ['availability', id] });
  });

  const slots = availabilityQuery.data?.slots ?? [];
  const tz = availabilityQuery.data?.timezone ?? resourceQuery.data?.timezone ?? 'UTC';

  const groupedByPeriod = useMemo(() => {
    const groups = { morning: [] as Slot[], afternoon: [] as Slot[] };
    for (const s of slots) {
      const local = DateTime.fromISO(s.start).setZone(tz);
      const hour = local.hour;
      if (hour < 18) groups.morning.push(s);
      else groups.afternoon.push(s);
    }
    return groups;
  }, [slots, tz]);

  if (!resourceQuery.data) return <p className="muted" style={{ padding: '2rem' }}>Cargando...</p>;
  const resource = resourceQuery.data;
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  const sportType = getSportType(resource.name);
  const rating = (4.5 + Math.random() * 0.5).toFixed(1);

  return (
    <div className="client-page">
      <ClientNav />
      <main className="client-main">
        <div className="detail-container">
          <Link to="/" className="detail-back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver a Canchas
          </Link>

          <div className="detail-grid">
            {/* Left column */}
            <div className="detail-left">
              {/* Hero image */}
              <div className="detail-hero-image">
                <CourtHeroImage type={sportType} />
                <div className="detail-hero-badges">
                  <span className="detail-hero-badge detail-hero-badge-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Premium
                  </span>
                  <span className="detail-hero-badge">Indoor</span>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="detail-thumbs">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="detail-thumb">
                    <CourtThumb type={sportType} idx={i} />
                  </div>
                ))}
                <div className="detail-thumb detail-thumb-more">
                  <span>+5 Fotos</span>
                </div>
              </div>

              {/* Info */}
              <div className="detail-info">
                <h1 className="detail-title">{resource.name}</h1>
                <div className="detail-meta">
                  <span className="detail-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {city}
                  </span>
                  <span className="detail-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: 'var(--accent)' }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {rating} (120 reseñas)
                  </span>
                </div>
                {resource.description && (
                  <p className="detail-description">{resource.description}</p>
                )}

                {/* Amenities */}
                <h3 className="detail-section-title">Servicios</h3>
                <div className="detail-amenities">
                  {AMENITIES.map((a) => (
                    <div key={a.label} className="detail-amenity">
                      <span className="detail-amenity-icon">{a.svg}</span>
                      {a.label}
                    </div>
                  ))}
                </div>

                {/* Map placeholder */}
                <h3 className="detail-section-title">Ubicación</h3>
                <div className="detail-map">
                  <div style={{ width: '100%', height: '100%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', opacity: 0.5 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {city}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — Booking widget */}
            <div className="detail-right">
              <div className="detail-booking-widget">
                {/* Price */}
                <div className="detail-price-section">
                  <div>
                    <span className="detail-price-label">Precio por turno</span>
                    <div className="detail-price-value">
                      $12.000 <span className="detail-price-unit">/ {duration} min</span>
                    </div>
                  </div>
                  <span className="detail-price-badge">Cancha Rápida</span>
                </div>

                {/* Date selector */}
                <div className="detail-dates">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dateStr}
                    min={today.toISODate() ?? undefined}
                    onChange={handleDateInputChange}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                  />
                  <div className="detail-dates-header">
                    <span className="detail-dates-title">Fecha</span>
                    <button
                      className={`detail-calendar-btn ${calendarOpen ? 'open' : ''}`}
                      onClick={toggleCalendar}
                      type="button"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </div>
                  {customDate && (
                    <div className="detail-custom-date">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {selectedDate.setLocale('es').toFormat("EEEE d 'de' MMMM", { locale: 'es' })}
                    </div>
                  )}
                  <div className="detail-dates-scroll">
                    {dates.map((d, i) => (
                      <button
                        key={i}
                        className={`detail-date-btn ${selectedDateIdx === i && !customDate ? 'active' : ''}`}
                        onClick={() => { setSelectedDateIdx(i); setCustomDate(null); setSelectedSlot(null); }}
                      >
                        <span className="detail-date-label">{getDayLabel(d, i)}</span>
                        <span className="detail-date-num">{d.day}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div className="detail-slots">
                  <h4 className="detail-slots-title">Horarios Disponibles</h4>

                  {groupedByPeriod.morning.length > 0 && (
                    <div className="detail-slot-group">
                      <span className="detail-slot-period">Mañana</span>
                      <div className="detail-slot-grid">
                        {groupedByPeriod.morning.map((s) => {
                          const local = DateTime.fromISO(s.start).setZone(tz);
                          const isSelected = selectedSlot?.start === s.start;
                          return (
                            <button
                              key={s.start}
                              className={`detail-slot-btn ${isSelected ? 'selected' : ''}`}
                              disabled={createBooking.isPending}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {local.toFormat('HH:mm')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {groupedByPeriod.afternoon.length > 0 && (
                    <div className="detail-slot-group">
                      <span className="detail-slot-period">Tarde / Noche</span>
                      <div className="detail-slot-grid">
                        {groupedByPeriod.afternoon.map((s) => {
                          const local = DateTime.fromISO(s.start).setZone(tz);
                          const isSelected = selectedSlot?.start === s.start;
                          return (
                            <button
                              key={s.start}
                              className={`detail-slot-btn ${isSelected ? 'selected' : ''}`}
                              disabled={createBooking.isPending}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {local.toFormat('HH:mm')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {slots.length === 0 && !availabilityQuery.isLoading && (
                    <p className="muted" style={{ fontSize: '0.85rem' }}>Sin slots disponibles</p>
                  )}
                </div>

                {/* Selected slot summary */}
                {selectedSlot && (
                  <div className="detail-selected-summary">
                    <div className="detail-selected-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="detail-selected-time">
                        {selectedDate.setLocale('es').toFormat("cccc", { locale: 'es' })}, {DateTime.fromISO(selectedSlot.start).setZone(tz).toFormat('HH:mm')} - {DateTime.fromISO(selectedSlot.end).setZone(tz).toFormat('HH:mm')}
                      </p>
                      <p className="detail-selected-court">{resource.name}</p>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button
                  className="detail-cta"
                  disabled={!selectedSlot || createBooking.isPending}
                  onClick={() => selectedSlot && createBooking.mutate(selectedSlot)}
                >
                  {createBooking.isPending ? 'Reservando...' : 'Reservar ahora'}
                  {!createBooking.isPending && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
                <p className="detail-cta-note">Pago en el club. Cancelación gratuita hasta 12hs antes.</p>

                {createBooking.isError && (
                  <p className="error" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    {(createBooking.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'No se pudo crear la reserva'}
                  </p>
                )}
                {createBooking.isSuccess && (
                  <p className="success" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Reserva creada correctamente</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
