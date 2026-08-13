import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourcesApi, type CreateResourcePayload } from '../api/endpoints';
import type { Resource, ResourceSchedule, BookingMode } from '../types/domain';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const TIMEZONES_BY_REGION: Record<string, string[]> = {
  'Europa': [
    'Europe/Madrid', 'Europe/Barcelona', 'Europe/Berlin', 'Europe/Paris',
    'Europe/Rome', 'Europe/London', 'Europe/Lisbon', 'Europe/Amsterdam',
    'Europe/Brussels', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Stockholm',
    'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Warsaw',
    'Europe/Prague', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Istanbul',
  ],
  'América': [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
    'America/Buenos_Aires', 'America/Montevideo', 'America/Sao_Paulo',
  ],
  'Asia-Pacífico': [
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Dubai',
    'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  ],
  'UTC': ['UTC'],
};

function extractError(err: unknown): string {
  const axios = err as { response?: { data?: { message?: string | string[] } } };
  const msg = axios.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string') return msg;
  return (err as Error).message || 'Error desconocido';
}

interface ScheduleRow {
  dayOfWeek: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

function emptySchedule(): ScheduleRow[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    enabled: true,
    openTime: '07:00',
    closeTime: '23:00',
  }));
}

function fromSchedules(schedules: ResourceSchedule[]): ScheduleRow[] {
  const rows = emptySchedule();
  for (const s of schedules) {
    const row = rows[s.dayOfWeek];
    if (row) {
      row.openTime = s.openTime;
      row.closeTime = s.closeTime;
    }
  }
  return rows;
}

function toSchedules(rows: ScheduleRow[]) {
  return rows.filter((r) => r.enabled).map((r) => ({
    dayOfWeek: r.dayOfWeek,
    openTime: r.openTime,
    closeTime: r.closeTime,
  }));
}

interface CourtForm {
  name: string;
  description: string;
  mode: BookingMode;
  capacity: number;
  timezone: string;
  isActive: boolean;
  schedules: ScheduleRow[];
}

const EMPTY_FORM: CourtForm = {
  name: '',
  description: '',
  mode: 'EXCLUSIVE',
  capacity: 1,
  timezone: 'Europe/Madrid',
  isActive: true,
  schedules: emptySchedule(),
};

export function AdminCourtsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: () => resourcesApi.listAll(),
  });

  function buildPayload(): CreateResourcePayload {
    const schedules = toSchedules(form.schedules);
    if (schedules.length === 0) throw new Error('Selecciona al menos un día');
    const payload: CreateResourcePayload = {
      name: form.name.trim(),
      mode: form.mode,
      capacity: form.capacity,
      timezone: form.timezone,
      isActive: form.isActive,
      schedules,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    return payload;
  }

  const createMut = useMutation({
    mutationFn: () => resourcesApi.create(buildPayload()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-resources'] }); closeForm(); },
    onError: (e) => setError(extractError(e)),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No editing');
      return resourcesApi.update(editing, buildPayload());
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-resources'] }); closeForm(); },
    onError: (e) => setError(extractError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => resourcesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-resources'] }),
  });

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setError(null); setShowForm(true); }

  function openEdit(r: Resource) {
    setEditing(r.id);
    setForm({
      name: r.name,
      description: r.description ?? '',
      mode: r.mode,
      capacity: r.capacity,
      timezone: r.timezone,
      isActive: r.isActive,
      schedules: fromSchedules(r.schedules),
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setError(null); }

  function updateScheduleDay(day: number, field: keyof ScheduleRow, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => (i === day ? { ...s, [field]: value } : s)),
    }));
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      deleteMut.mutate(id);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Canchas</h1>
        <button onClick={openCreate} className="admin-primary-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva cancha
        </button>
      </div>

      {isLoading && <p className="muted">Cargando...</p>}

      {showForm && (
        <div className="admin-form-card">
          <h2>{editing ? 'Editar cancha' : 'Nueva cancha'}</h2>

          <div className="admin-form-grid">
            <label>
              <span>Nombre</span>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} maxLength={120} />
            </label>
            <label>
              <span>Descripción</span>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
            </label>
            <label>
              <span>Modo</span>
              <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as BookingMode }))}>
                <option value="EXCLUSIVE">Exclusivo (1 persona)</option>
                <option value="SHARED">Compartido (varias personas)</option>
              </select>
            </label>
            <label>
              <span>Capacidad</span>
              <input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} min={1} max={1000} />
            </label>
            <label>
              <span>Zona horaria</span>
              <select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                {Object.entries(TIMEZONES_BY_REGION).map(([region, tzs]) => (
                  <optgroup key={region} label={region}>
                    {tzs.map((tz) => {
                      const city = tz.includes('/') ? tz.split('/').pop()!.replace(/_/g, ' ') : tz;
                      return <option key={tz} value={tz}>{city}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="admin-checkbox-label">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              <span>Activa</span>
            </label>
          </div>

          <div className="admin-schedule-section">
            <h3>Horarios semanales</h3>
            <div className="admin-schedule-grid">
              {form.schedules.map((s, i) => (
                <div key={i} className="admin-schedule-row">
                  <label className="admin-checkbox-label">
                    <input type="checkbox" checked={s.enabled} onChange={(e) => updateScheduleDay(i, 'enabled', e.target.checked)} />
                    <span>{DAYS[i]}</span>
                  </label>
                  {s.enabled && (
                    <>
                      <input type="time" value={s.openTime} onChange={(e) => updateScheduleDay(i, 'openTime', e.target.value)} />
                      <span className="muted">a</span>
                      <input type="time" value={s.closeTime} onChange={(e) => updateScheduleDay(i, 'closeTime', e.target.value)} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="admin-form-actions">
            <button onClick={closeForm} className="admin-btn-secondary">Cancelar</button>
            <button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cancha'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Modo</th>
              <th>Cap.</th>
              <th>Zona Horaria</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => {
              const city = r.timezone.includes('/') ? r.timezone.split('/').pop()!.replace(/_/g, ' ') : r.timezone;
              return (
                <tr key={r.id}>
                  <td>
                    <div className="admin-court-name">{r.name}</div>
                    {r.description && <div className="admin-court-desc">{r.description}</div>}
                  </td>
                  <td>{r.mode === 'EXCLUSIVE' ? 'Exclusivo' : 'Compartido'}</td>
                  <td style={{ textAlign: 'center' }}>{r.capacity}</td>
                  <td>{city}</td>
                  <td>
                    <span className={`admin-status-pill ${r.isActive ? 'admin-status-active' : 'admin-status-inactive'}`}>
                      {r.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="admin-btn-outline" onClick={() => openEdit(r)}>Editar</button>
                      <button className="admin-btn-outline-danger" onClick={() => handleDelete(r.id, r.name)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data && data.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No hay canchas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
