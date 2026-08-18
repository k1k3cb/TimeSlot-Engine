import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourcesApi, uploadsApi, type CreateResourcePayload, type PhotoInput } from '../api/endpoints';
import type { Resource, ResourceSchedule, BookingMode, ResourcePhoto } from '../types/domain';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000';

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

interface TimeSlot {
  openTime: string;
  closeTime: string;
}

interface ScheduleRow {
  dayOfWeek: number;
  enabled: boolean;
  slots: TimeSlot[];
}

function emptySchedule(): ScheduleRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
    dayOfWeek: dow,
    enabled: dow >= 1 && dow <= 5,
    slots: [{ openTime: '07:00', closeTime: '23:00' }],
  }));
}

function fromSchedules(schedules: ResourceSchedule[]): ScheduleRow[] {
  const rows = emptySchedule();
  for (const s of schedules) {
    const row = rows.find((r) => r.dayOfWeek === s.dayOfWeek);
    if (row) {
      row.enabled = true;
      row.slots = [{ openTime: s.openTime, closeTime: s.closeTime }];
    }
  }
  return rows;
}

function toSchedules(rows: ScheduleRow[]) {
  const result: { dayOfWeek: number; openTime: string; closeTime: string }[] = [];
  for (const r of rows) {
    if (!r.enabled) continue;
    for (const slot of r.slots) {
      result.push({ dayOfWeek: r.dayOfWeek, openTime: slot.openTime, closeTime: slot.closeTime });
    }
  }
  return result;
}

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

interface CourtForm {
  name: string;
  description: string;
  mode: BookingMode;
  capacity: number;
  pricePerHour: number;
  timezone: string;
  isActive: boolean;
  schedules: ScheduleRow[];
  photos: PhotoInput[];
}

const EMPTY_FORM: CourtForm = {
  name: '',
  description: '',
  mode: 'EXCLUSIVE',
  capacity: 1,
  pricePerHour: 0,
  timezone: 'Europe/Madrid',
  isActive: true,
  schedules: emptySchedule(),
  photos: [],
};

export function AdminCourtsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: () => resourcesApi.listAll(),
  });

  async function uploadFiles(files: FileList | File[]): Promise<PhotoInput[]> {
    const results: PhotoInput[] = [];
    for (const file of Array.from(files)) {
      const { url } = await uploadsApi.uploadPhoto(file);
      results.push({ url });
    }
    return results;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFiles(files);
      setForm((prev) => ({
        ...prev,
        photos: [
          { ...uploaded[0], isCover: true },
          ...prev.photos.filter((p) => !p.isCover),
        ],
      }));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = 8 - form.photos.filter((p) => !p.isCover).length;
    if (remaining <= 0) {
      setError('Máximo 8 fotos de galería');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      const uploaded = await uploadFiles(toUpload);
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploaded],
      }));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  }

  function removePhoto(idx: number) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  }

  function buildPayload(): CreateResourcePayload {
    const schedules = toSchedules(form.schedules);
    if (schedules.length === 0) throw new Error('Selecciona al menos un día');
    const payload: CreateResourcePayload = {
      name: form.name.trim(),
      mode: form.mode,
      capacity: form.capacity,
      timezone: form.timezone,
      pricePerHour: form.pricePerHour,
      isActive: form.isActive,
      schedules,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.photos.length > 0) payload.photos = form.photos;
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
      pricePerHour: r.pricePerHour,
      timezone: r.timezone,
      isActive: r.isActive,
      schedules: fromSchedules(r.schedules),
      photos: r.photos.map((p) => ({ url: p.url, isCover: p.isCover })),
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setError(null); }

  function updateScheduleDay(dayIdx: number, field: keyof ScheduleRow, value: boolean) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => (i === dayIdx ? { ...s, [field]: value } : s)),
    }));
  }

  function updateSlot(dayIdx: number, slotIdx: number, field: keyof TimeSlot, value: string) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) =>
        i === dayIdx
          ? { ...s, slots: s.slots.map((slot, j) => (j === slotIdx ? { ...slot, [field]: value } : slot)) }
          : s
      ),
    }));
  }

  function addSlot(dayIdx: number) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) =>
        i === dayIdx ? { ...s, slots: [...s.slots, { openTime: '14:00', closeTime: '18:00' }] } : s
      ),
    }));
  }

  function removeSlot(dayIdx: number, slotIdx: number) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) =>
        i === dayIdx ? { ...s, slots: s.slots.filter((_, j) => j !== slotIdx) } : s
      ),
    }));
  }

  function copyToAllDays() {
    const first = form.schedules[0];
    if (!first) return;
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) =>
        i === 0 ? s : { ...s, enabled: first.enabled, slots: first.slots.map((slot) => ({ ...slot })) }
      ),
    }));
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      deleteMut.mutate(id);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  const coverPhoto = form.photos.find((p) => p.isCover);
  const galleryPhotos = form.photos.filter((p) => !p.isCover);

  return (
    <div>
      {!showForm ? (
        <>
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

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Modo</th>
                  <th>Cap.</th>
                  <th>Precio/h</th>
                  <th>Zona Horaria</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((r) => {
                  const city = r.timezone.includes('/') ? r.timezone.split('/').pop()!.replace(/_/g, ' ') : r.timezone;
                  const cover = r.photos?.find((p) => p.isCover);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {cover && (
                            <img
                              src={`${API_BASE}${cover.url}`}
                              alt=""
                              style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }}
                            />
                          )}
                          <div>
                            <div className="admin-court-name">{r.name}</div>
                            {r.description && <div className="admin-court-desc">{r.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{r.mode === 'EXCLUSIVE' ? 'Exclusivo' : 'Compartido'}</td>
                      <td style={{ textAlign: 'center' }}>{r.capacity}</td>
                      <td>{r.pricePerHour > 0 ? `${r.pricePerHour.toFixed(2)}€` : '—'}</td>
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
                  <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No hay canchas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div>
          <div className="form-breadcrumb">
            <span onClick={closeForm} style={{ cursor: 'pointer', color: 'var(--muted-foreground)' }}>Canchas</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{editing ? 'Editar Cancha' : 'Nueva Cancha'}</span>
          </div>

          <div className="form-header">
            <h1>{editing ? 'Editar cancha' : 'Crear nueva cancha'}</h1>
            <p className="muted">Configura los detalles y horarios de disponibilidad.</p>
          </div>

          <div className="form-card">
            {/* Información General */}
            <div className="form-section">
              <h3 className="form-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Información General
              </h3>

              <div className="form-grid">
                <div className="form-field">
                  <label>Nombre de la cancha <span className="required">*</span></label>
                  <input type="text" placeholder="Ej. Cancha 1 - Pádel Cristal" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} maxLength={120} />
                </div>
                <div className="form-field">
                  <label>Capacidad (personas)</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} min={1} max={1000} />
                </div>
                <div className="form-field">
                  <label>Precio por hora (€)</label>
                  <input type="number" value={form.pricePerHour} onChange={(e) => setForm((f) => ({ ...f, pricePerHour: Number(e.target.value) }))} min={0} step={0.5} placeholder="0.00" />
                </div>
                <div className="form-field">
                  <label>Modo de reserva</label>
                  <div className="form-select-wrap">
                    <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as BookingMode }))}>
                      <option value="EXCLUSIVE">Exclusivo (1 persona/grupo reserva todo)</option>
                      <option value="SHARED">Compartido (varias personas)</option>
                    </select>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="form-select-icon"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
                <div className="form-field">
                  <label>Zona horaria</label>
                  <div className="form-select-wrap">
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="form-select-icon"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
                <div className="form-field form-field-full">
                  <label>Descripción (Opcional)</label>
                  <textarea placeholder="Detalles adicionales sobre la cancha, superficie, ubicación..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} rows={3} />
                </div>
              </div>

              <div className="form-toggle-row">
                <label className="form-toggle">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  <span className="form-toggle-slider" />
                </label>
                <div>
                  <span className="form-toggle-label">Cancha Activa</span>
                  <span className="form-toggle-desc">Los clientes podrán ver y reservar esta cancha inmediatamente.</span>
                </div>
              </div>
            </div>

            {/* Galería de Fotos */}
            <div className="form-section">
              <h3 className="form-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Galería de Fotos
              </h3>

              <div className="form-photo-grid">
                <div className="form-photo-main">
                  <label>Foto Principal (Portada)</label>
                  <div
                    className="form-upload-box form-upload-cover"
                    onClick={() => coverInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                  >
                    {coverPhoto ? (
                      <img
                        src={`${API_BASE}${coverPhoto.url}`}
                        alt="Portada"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      <>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>Subir portada</span>
                      </>
                    )}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleCoverUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {coverPhoto && (
                    <button
                      type="button"
                      className="form-slot-remove"
                      onClick={() => removePhoto(form.photos.findIndex((p) => p.isCover))}
                      style={{ marginTop: '0.5rem' }}
                    >
                      Quitar portada
                    </button>
                  )}
                </div>
                <div className="form-photo-gallery">
                  <label>Fotos de Galería (Hasta 8 fotos)</label>
                  <div
                    className="form-upload-zone"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p className="form-upload-title">{uploading ? 'Subiendo...' : 'Arrastra tus fotos aquí o haz clic para buscar'}</p>
                    <p className="form-upload-sub">Selecciona varias imágenes para subirlas en lote.</p>
                    <button type="button" className="form-upload-btn" disabled={uploading}>Seleccionar archivos</button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      onChange={handleGalleryUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div className="form-upload-previews">
                    {galleryPhotos.map((p, i) => (
                      <div key={i} className="form-upload-thumb" style={{ position: 'relative' }}>
                        <img
                          src={`${API_BASE}${p.url}`}
                          alt={`Foto ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(form.photos.indexOf(p))}
                          style={{
                            position: 'absolute', top: 2, right: 2,
                            background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                            borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - galleryPhotos.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="form-upload-thumb">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)', opacity: 0.3 }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Horarios */}
            <div className="form-section">
              <div className="form-section-header">
                <h3 className="form-section-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Horarios Semanales
                </h3>
                <button className="form-copy-btn" onClick={copyToAllDays} type="button">Copiar a todos los días</button>
              </div>

              <div className="form-schedule-list">
                {form.schedules.map((s, dayIdx) => (
                  <div key={s.dayOfWeek} className={`form-schedule-row ${!s.enabled ? 'disabled' : ''}`}>
                    <div className="form-schedule-day">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => updateScheduleDay(dayIdx, 'enabled', e.target.checked)}
                      />
                      <span>{DAY_NAMES[s.dayOfWeek]}</span>
                    </div>
                    <div className="form-schedule-slots">
                      {s.slots.map((slot, slotIdx) => (
                        <div key={slotIdx} className="form-slot-item">
                          <input
                            type="time"
                            value={slot.openTime}
                            onChange={(e) => updateSlot(dayIdx, slotIdx, 'openTime', e.target.value)}
                            disabled={!s.enabled}
                          />
                          <span className="muted">a</span>
                          <input
                            type="time"
                            value={slot.closeTime}
                            onChange={(e) => updateSlot(dayIdx, slotIdx, 'closeTime', e.target.value)}
                            disabled={!s.enabled}
                          />
                          {s.slots.length > 1 && (
                            <button type="button" className="form-slot-remove" onClick={() => removeSlot(dayIdx, slotIdx)} disabled={!s.enabled}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {s.enabled && (
                        <button type="button" className="form-slot-add" onClick={() => addSlot(dayIdx)} title="Añadir otro tramo">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                          <span>Añadir tramo</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="error" style={{ margin: '0 1.5rem 1rem' }}>{error}</div>}

            <div className="form-footer">
              <button onClick={closeForm} className="admin-btn-secondary">Cancelar</button>
              <button className="admin-primary-btn" onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={saving || uploading}>
                {saving ? 'Guardando...' : uploading ? 'Subiendo fotos...' : editing ? 'Guardar cambios' : 'Crear cancha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}