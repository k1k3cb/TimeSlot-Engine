import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../api/endpoints';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import { ClientNav } from '../components/ClientNav';
import type { BookingEvent, Resource } from '../types/domain';

function courtAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('pádel') || n.includes('padel')) return 'padel';
  if (n.includes('tenis') || n.includes('tennis')) return 'tenis';
  return 'default';
}

function courtLabel(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('pádel') || n.includes('padel')) return 'Pádel';
  if (n.includes('tenis') || n.includes('tennis')) return 'Tenis';
  return 'Cancha';
}

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

  const today = useMemo(() => DateTime.now().setLocale('es').toFormat("d 'de' MMMM"), []);

  return (
    <div className="client-page">
      <ClientNav />

      <main className="client-main">
        <div className="client-content">
          <div className="client-hero">
            <div className="client-hero-text">
              <h1>Elige tu cancha</h1>
              <p>{today} — selecciona una cancha para ver horarios disponibles</p>
            </div>
          </div>

          {isLoading && <p className="center">Cargando...</p>}
          {error && <p className="error center">Error al cargar canchas</p>}
          {data && data.length === 0 && <p className="center muted">No hay canchas disponibles.</p>}

          <div className="court-grid">
            {data?.map((r) => (
              <CourtCard key={r.id} resource={r} />
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

function CourtCard({ resource: r }: { resource: Resource }) {
  const accent = courtAccent(r.name);
  const label = courtLabel(r.name);
  const city = r.timezone.split('/').pop()?.replace(/_/g, ' ') ?? r.timezone;

  return (
    <Link
      to={`/resources/${r.id}`}
      className={`court-card court-accent-${accent}`}
      state={{ resource: r }}
    >
      <div className="court-card-top">
        <span className="court-type-badge">{label}</span>
        {!r.isActive && <span className="court-closed">Cerrada</span>}
      </div>

      <div className="court-card-body">
        <h2 className="court-name">{r.name}</h2>
        {r.description && <p className="court-desc">{r.description}</p>}
      </div>

      <div className="court-card-footer">
        <div className="court-info">
          <span className="court-info-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {city}
          </span>
          <span className="court-info-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {r.mode === 'EXCLUSIVE' ? '1 persona' : `${r.capacity} personas`}
          </span>
        </div>
        <span className="court-cta">
          Reservar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </Link>
  );
}