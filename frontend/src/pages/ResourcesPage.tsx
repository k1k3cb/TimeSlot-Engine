import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../api/endpoints';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import { ClientNav } from '../components/ClientNav';
import type { BookingEvent, Resource } from '../types/domain';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000';

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

function formatPrice(value: number): string {
  return `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getSportGradient(type: string): string {
  switch (type) {
    case 'padel': return 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)';
    case 'tenis': return 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)';
    case 'futbol': return 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)';
    default: return 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3730a3 100%)';
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
        <div className="home-container">
          {/* Hero */}
          <section className="home-hero">
            <div className="home-hero-bg" />
            <div className="home-hero-overlay" />
            <div className="home-hero-content">
              <span className="home-hero-badge">Reserva en tiempo real</span>
              <h1>Encuentra tu cancha<br />y juega hoy mismo.</h1>
              <p>Pádel, tenis y fútbol 5 en las mejores instalaciones. Elige tu horario y confirma en segundos.</p>
            </div>
          </section>

          {/* Section header */}
          <section className="home-section">
            <div className="home-section-header">
              <h2>Canchas disponibles</h2>
              <p>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="home-filters">
              {SPORT_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`home-filter-btn ${activeFilter === f ? 'active' : ''}`}
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

            <div className="home-courts-grid">
              {filtered.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </div>
          </section>
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
  const gradient = getSportGradient(sportType);
  const coverPhoto = court.photos?.find((p) => p.isCover);

  const tags = court.description
    ? court.description.split(' ').filter((w) => w.length > 3).slice(0, 2)
    : court.mode === 'EXCLUSIVE' ? ['Exclusivo'] : [];

  return (
    <Link to={`/resources/${court.id}`} className="home-court-card" state={{ resource: court }}>
      <div className="home-court-image" style={{ background: coverPhoto ? undefined : gradient }}>
        {coverPhoto ? (
          <img
            src={`${API_BASE}${coverPhoto.url}`}
            alt={court.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="home-court-image-placeholder">
            <svg width="60" height="60" viewBox="0 0 64 64" fill="none" opacity="0.15">
              <rect x="8" y="8" width="48" height="48" rx="4" stroke="#fff" strokeWidth="2" />
              <line x1="32" y1="8" x2="32" y2="56" stroke="#fff" strokeWidth="1.5" />
              <line x1="8" y1="32" x2="56" y2="32" stroke="#fff" strokeWidth="1.5" />
            </svg>
          </div>
        )}
        <span className="home-court-sport-badge">{getSportLabel(sportType)}</span>
        <span className="home-court-rating">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {rating}
        </span>
      </div>

      <div className="home-court-body">
        <div className="home-court-top">
          <h3>{court.name}</h3>
          <span className="home-court-price">
            {court.pricePerHour > 0 ? formatPrice(court.pricePerHour) : '—'}<span>/h</span>
          </span>
        </div>
        <p className="home-court-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {city}
        </p>
        {tags.length > 0 && (
          <div className="home-court-tags">
            {tags.map((t) => (
              <span key={t} className="home-court-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
