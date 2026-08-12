import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../api/endpoints';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import { ClientNav } from '../components/ClientNav';
import type { BookingEvent, Resource } from '../types/domain';

const SPORT_FILTERS = ['Todas', 'Pádel', 'Tenis', 'Fútbol 5'] as const;

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

function getSportFilterName(type: string): string {
  switch (type) {
    case 'padel': return 'Pádel';
    case 'tenis': return 'Tenis';
    case 'futbol': return 'Fútbol 5';
    default: return 'Todas';
  }
}

export function ResourcesPage() {
  const [toasts, setToasts] = useState<BookingEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState('Todas');

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

  const courts = data ?? [];
  const filtered = activeFilter === 'Todas'
    ? courts
    : courts.filter((c) => getSportFilterName(getSportType(c.name)) === activeFilter);

  return (
    <div className="client-page">
      <ClientNav />

      <main className="client-main">
        <div className="client-content">
          <div className="hero">
            <div className="hero-content">
              <span className="hero-badge">Reserva en tiempo real</span>
              <h2>Encuentra tu cancha y juega hoy mismo.</h2>
              <p>Pádel, tenis y fútbol 5 en las mejores instalaciones. Elige tu horario y confirma en segundos.</p>
            </div>
          </div>

          <div className="courts-section-header">
            <h2>Canchas disponibles</h2>
            <p className="count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="courts-filters">
            {SPORT_FILTERS.map((f) => (
              <button
                key={f}
                className={`courts-filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {isLoading && <p className="muted">Cargando...</p>}
          {error && <p className="error">Error al cargar las canchas</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="muted">No hay canchas disponibles en este momento</p>
          )}

          <div className="courts-grid">
            {filtered.map((court) => (
              <CourtCard key={court.id} court={court} />
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

function CourtCard({ court }: { court: Resource }) {
  const city = court.timezone.split('/').pop()?.replace(/_/g, ' ') ?? court.timezone;
  const sportType = getSportType(court.name);
  const rating = (4.5 + Math.random() * 0.5).toFixed(1);

  return (
    <Link to={`/resources/${court.id}`} className="court-card" state={{ resource: court }}>
      <div className="court-card-image">
        <div className="court-card-image-placeholder">
          <CourtPlaceholder type={sportType} />
        </div>
        <span className="court-card-badge">{getSportLabel(sportType)}</span>
        <span className="court-card-rating">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {rating}
        </span>
      </div>

      <div className="court-card-body">
        <h3 className="court-card-name">{court.name}</h3>
        {court.description && <p className="court-card-desc">{court.description}</p>}
        <div className="court-card-meta">
          <span className="court-card-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {city}
          </span>
          <span className="court-card-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {court.mode === 'EXCLUSIVE' ? 'Exclusivo' : `Hasta ${court.capacity}`}
          </span>
        </div>
        <div className="court-card-footer">
          <span className="court-card-book">
            Reservar
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function CourtPlaceholder({ type }: { type: string }) {
  const color = type === 'padel' ? '#0ea5e9' : type === 'tenis' ? '#f97316' : type === 'futbol' ? '#22c55e' : '#8b5cf6';
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.3">
      <rect x="8" y="8" width="48" height="48" rx="4" stroke={color} strokeWidth="2" />
      <line x1="32" y1="8" x2="32" y2="56" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="32" x2="56" y2="32" stroke={color} strokeWidth="1.5" />
      {type === 'tenis' && (
        <>
          <circle cx="32" cy="32" r="8" stroke={color} strokeWidth="1.5" />
        </>
      )}
      {type === 'padel' && (
        <>
          <rect x="16" y="16" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5" />
          <rect x="34" y="34" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
