import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '../api/endpoints';
import type { Resource, ResourceSchedule, BookingMode } from '../types/domain';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TIMEZONES = [
  'Europe/Madrid',
  'Europe/Barcelona',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/London',
  'Europe/Lisbon',
  'UTC',
];

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

function toSchedules(rows: ScheduleRow[]): { dayOfWeek: number; openTime: string; closeTime: string }[] {
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
  timezone: 'America/Mexico_City',
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

  const createMut = useMutation({
    mutationFn: () => {
      const schedules = toSchedules(form.schedules);
      if (schedules.length === 0) throw new Error('Selecciona al menos un día');
      return resourcesApi.create({
        name: form.name,
        description: form.description || undefined,
        mode: form.mode,
        capacity: form.capacity,
        timezone: form.timezone,
        isActive: form.isActive,
        schedules,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      closeForm();
    },
    onError: (e) => setError((e as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No editing');
      const schedules = toSchedules(form.schedules);
      if (schedules.length === 0) throw new Error('Selecciona al menos un día');
      return resourcesApi.update(editing, {
        name: form.name,
        description: form.description || undefined,
        mode: form.mode,
        capacity: form.capacity,
        timezone: form.timezone,
        isActive: form.isActive,
        schedules,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      closeForm();
    },
    onError: (e) => setError((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => resourcesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-resources'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

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

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function updateScheduleDay(day: number, field: keyof ScheduleRow, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) =>
        i === day ? { ...s, [field]: value } : s,
      ),
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
        <button onClick={openCreate}>Nueva cancha</button>
      </div>

      {isLoading && <p>Cargando...</p>}

      {showForm && (
        <div className="admin-form-card">
          <h2>{editing ? 'Editar cancha' : 'Nueva cancha'}</h2>

          <div className="admin-form-grid">
            <label>
              <span>Nombre</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                minLength={2}
                maxLength={120}
              />
            </label>

            <label>
              <span>Descripción</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={500}
              />
            </label>

            <label>
              <span>Modo</span>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as BookingMode }))}
              >
                <option value="EXCLUSIVE">Exclusivo (1 persona)</option>
                <option value="SHARED">Compartido (varias personas)</option>
              </select>
            </label>

            <label>
              <span>Capacidad</span>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                min={1}
                max={1000}
              />
            </label>

            <label>
              <span>Zona horaria</span>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>

            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span>Activa</span>
            </label>
          </div>

          <div className="admin-schedule-section">
            <h3>Horarios semanales</h3>
            <div className="admin-schedule-grid">
              {form.schedules.map((s, i) => (
                <div key={i} className="admin-schedule-row">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => updateScheduleDay(i, 'enabled', e.target.checked)}
                    />
                    <span>{DAYS[i]}</span>
                  </label>
                  {s.enabled && (
                    <>
                      <input
                        type="time"
                        value={s.openTime}
                        onChange={(e) => updateScheduleDay(i, 'openTime', e.target.value)}
                      />
                      <span className="muted">a</span>
                      <input
                        type="time"
                        value={s.closeTime}
                        onChange={(e) => updateScheduleDay(i, 'closeTime', e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="admin-form-actions">
            <button onClick={closeForm} className="admin-btn-secondary">Cancelar</button>
            <button
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={saving}
            >
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
              <th>Zona horaria</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  {r.description && <p className="muted admin-cell-sub">{r.description}</p>}
                </td>
                <td>{r.mode === 'EXCLUSIVE' ? 'Exclusivo' : 'Compartido'}</td>
                <td>{r.capacity}</td>
                <td>{r.timezone}</td>
                <td>
                  <span className={`badge ${r.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                    {r.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button className="admin-btn-sm" onClick={() => openEdit(r)}>Editar</button>
                    <button
                      className="admin-btn-sm admin-btn-danger"
                      onClick={() => handleDelete(r.id, r.name)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data && data.length === 0 && (
              <tr><td colSpan={6} className="muted">No hay canchas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
