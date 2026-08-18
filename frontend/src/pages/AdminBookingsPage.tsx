import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { bookingsApi, resourcesApi, usersApi, availabilityApi } from '../api/endpoints';
import type { Booking, Resource, User, Slot } from '../types/domain';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'NO_SHOW', label: 'No show' },
];

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

function getStatusDotClass(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'dot-green';
    case 'PENDING': return 'dot-orange';
    case 'COMPLETED': return 'dot-gray';
    case 'CANCELLED': return 'dot-gray';
    case 'NO_SHOW': return 'dot-red';
    default: return 'dot-gray';
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'admin-status-confirmed';
    case 'PENDING': return 'admin-status-pending';
    case 'COMPLETED': return 'admin-status-completed';
    case 'CANCELLED': return 'admin-status-cancelled';
    case 'NO_SHOW': return 'admin-status-noshow';
    default: return 'admin-status-completed';
  }
}

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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

  const attend = useMutation({
    mutationFn: (id: string) => bookingsApi.attend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const noShow = useMutation({
    mutationFn: (id: string) => bookingsApi.markNoShow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((b) => {
      const name = b.user?.name?.toLowerCase() ?? '';
      const email = b.user?.email?.toLowerCase() ?? '';
      const court = b.resource?.name?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || court.includes(q);
    });
  }, [data, search]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, confirmed: 0, pending: 0, issues: 0 };
    return {
      total: data.length,
      confirmed: data.filter((b) => b.status === 'CONFIRMED').length,
      pending: data.filter((b) => b.status === 'PENDING').length,
      issues: data.filter((b) => b.status === 'NO_SHOW' || b.status === 'CANCELLED').length,
    };
  }, [data]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-label">Panel de administración</p>
          <h1>Reservas</h1>
          <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>
            Gestiona y controla todas las reservas de tus canchas.
          </p>
        </div>
        <button className="admin-primary-btn" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva Reserva
        </button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-gray">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats.total}</span>
            <span className="admin-stat-label">Total reservas</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats.confirmed}</span>
            <span className="admin-stat-label">Confirmadas</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats.pending}</span>
            <span className="admin-stat-label">Pendientes</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{stats.issues}</span>
            <span className="admin-stat-label">Incidencias</span>
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Buscar por usuario o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="admin-toolbar-select" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
          <option value="">Todas las canchas</option>
          {resources?.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="admin-filters-row">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} className={`admin-filter-btn ${status === f.value ? 'active' : ''}`} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="muted">Cargando...</p>}
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
            {filteredData.map((b) => {
              const tz = b.resource.timezone || 'UTC';
              const start = DateTime.fromISO(b.startAt).setZone(tz);
              const end = DateTime.fromISO(b.endAt).setZone(tz);
              const dateStr = start.setLocale('es').toFormat("d MMMM yyyy");
              const sportType = getSportType(b.resource.name);
              return (
                <tr key={b.id}>
                  <td>
                    <div className="admin-court-cell">
                      <strong>{b.resource.name}</strong>
                      <span className={`admin-sport-badge admin-sport-${sportType}`}>{getSportLabel(sportType)}</span>
                    </div>
                  </td>
                  <td>
                    {b.user ? (
                      <div className="admin-user-cell">
                        <span className="admin-user-cell-name">{b.user.name}</span>
                        <span className="admin-user-cell-email">{b.user.email}</span>
                      </div>
                    ) : (
                      <span className="muted">{b.userId}</span>
                    )}
                  </td>
                  <td>{dateStr}</td>
                  <td>{start.toFormat('HH:mm')} – {end.toFormat('HH:mm')}</td>
                  <td>
                    <div className="admin-status-cell">
                      <span className={`admin-status-badge ${getStatusBadgeClass(b.status)}`}>
                        <span className={`admin-status-dot ${getStatusDotClass(b.status)}`} />
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      {b.refundPct != null && (
                        <span className="admin-refund-badge">Reembolso<br />{b.refundPct}%</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button className="admin-btn-complete" disabled={attend.isPending} onClick={() => attend.mutate(b.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Completar
                          </button>
                          <button className="admin-btn-noshow" disabled={noShow.isPending} onClick={() => noShow.mutate(b.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="18" y1="8" x2="23" y2="13" />
                              <line x1="23" y1="8" x2="18" y2="13" />
                            </svg>
                            No show
                          </button>
                        </>
                      )}
                      {b.status === 'PENDING' && (
                        <button className="admin-btn-complete" disabled={confirm.isPending} onClick={() => confirm.mutate(b.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          Completar
                        </button>
                      )}
                      {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                        <button className="admin-btn-outline-danger" disabled={cancelBooking.isPending} onClick={() => cancelBooking.mutate(b.id)}>
                          Cancelar
                        </button>
                      )}
                      {(b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'NO_SHOW') && (
                        <span className="muted" style={{ display: 'none' }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No hay reservas con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <BookingModal
          resources={resources ?? []}
          onClose={() => setShowCreate(false)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function BookingModal({ resources, onClose, onSaved }: {
  resources: Resource[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(() => DateTime.now().plus({ days: 1 }).toISODate()!);
  const [duration, setDuration] = useState(60);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.list(),
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch.trim()) return users.filter((u) => u.role === 'CLIENT');
    const q = userSearch.toLowerCase();
    return users.filter((u) => u.role === 'CLIENT' && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [users, userSearch]);

  const { data: availability } = useQuery({
    queryKey: ['admin-availability', resourceId, date, duration],
    queryFn: () => availabilityApi.compute({ resourceId, date, slotMinutes: duration }),
    enabled: !!resourceId && !!date,
  });

  const selectedUser = users?.find((u) => u.id === userId);
  const selectedResource = resources.find((r) => r.id === resourceId);
  const slots = availability?.slots ?? [];

  const createMut = useMutation({
    mutationFn: () => {
      if (!selectedSlot) throw new Error('Selecciona un horario');
      return bookingsApi.create({
        resourceId,
        startAt: selectedSlot.start,
        durationMinutes: duration,
      });
    },
    onSuccess: onSaved,
    onError: (e) => setError((e as Error).message || 'Error al crear reserva'),
  });

  const tz = availability?.timezone ?? selectedResource?.timezone ?? 'UTC';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Reserva</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Usuario */}
          <div className="form-field">
            <label>Buscar usuario <span className="required">*</span></label>
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); if (!e.target.value) setUserId(''); }}
            />
            {userSearch && filteredUsers.length > 0 && (
              <div className="modal-user-list">
                {filteredUsers.slice(0, 5).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`modal-user-item ${userId === u.id ? 'selected' : ''}`}
                    onClick={() => { setUserId(u.id); setUserSearch(u.name); }}
                  >
                    <span className="modal-user-avatar">{u.name.charAt(0).toUpperCase()}</span>
                    <div>
                      <span className="modal-user-name">{u.name}</span>
                      <span className="modal-user-email">{u.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="modal-selected-user">
                <span className="modal-user-avatar">{selectedUser.name.charAt(0).toUpperCase()}</span>
                <div>
                  <span className="modal-user-name">{selectedUser.name}</span>
                  <span className="modal-user-email">{selectedUser.email}</span>
                </div>
                <button type="button" onClick={() => { setUserId(''); setUserSearch(''); }}>×</button>
              </div>
            )}
          </div>

          {/* Cancha */}
          <div className="form-field">
            <label>Cancha <span className="required">*</span></label>
            <div className="form-select-wrap">
              <select value={resourceId} onChange={(e) => { setResourceId(e.target.value); setSelectedSlot(null); }}>
                <option value="">Seleccionar cancha...</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="form-select-icon"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Fecha */}
          <div className="form-field">
            <label>Fecha <span className="required">*</span></label>
            <input type="date" value={date} min={DateTime.now().toISODate()!} onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }} />
          </div>

          {/* Duración */}
          <div className="form-field">
            <label>Duración</label>
            <div className="form-select-wrap">
              <select value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setSelectedSlot(null); }}>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="form-select-icon"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Slots */}
          {resourceId && date && (
            <div className="form-field">
              <label>Horarios disponibles</label>
              <div className="modal-slots">
                {slots.length === 0 ? (
                  <p className="muted">No hay horarios disponibles para esta fecha</p>
                ) : (
                  slots.map((s) => {
                    const local = DateTime.fromISO(s.start).setZone(tz);
                    const isSelected = selectedSlot?.start === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        className={`modal-slot ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(s)}
                      >
                        {local.toFormat('HH:mm')}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="admin-primary-btn"
            disabled={!userId || !resourceId || !selectedSlot || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Creando...' : 'Crear Reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
