import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { policiesApi, resourcesApi } from '../api/endpoints';
import type { TieredRule } from '../types/domain';

interface RuleRow {
  hoursBeforeStart: string;
  refundPct: string;
}

function toRuleRows(rules: TieredRule[]): RuleRow[] {
  return rules
    .sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
    .map((r) => ({
      hoursBeforeStart: String(r.hoursBeforeStart),
      refundPct: String(r.refundPct),
    }));
}

function parseRules(rows: RuleRow[]): TieredRule[] {
  const rules = rows
    .map((r) => ({
      hoursBeforeStart: Number(r.hoursBeforeStart),
      refundPct: Number(r.refundPct),
    }))
    .filter((r) => !isNaN(r.hoursBeforeStart) && !isNaN(r.refundPct));

  if (rules.length === 0) throw new Error('Agrega al menos una regla');
  if (!rules.some((r) => r.hoursBeforeStart === 0)) {
    throw new Error('Debe existir una regla con 0 horas (reembolso por defecto)');
  }
  return rules;
}

function getRefundBadgeClass(pct: number): string {
  if (pct >= 100) return 'refund-high';
  if (pct > 0) return 'refund-mid';
  return 'refund-none';
}

export function AdminPoliciesPage() {
  const queryClient = useQueryClient();

  const { data: defaults } = useQuery({
    queryKey: ['policies-defaults'],
    queryFn: () => policiesApi.defaults(),
  });

  const { data: resources } = useQuery({
    queryKey: ['admin-resources-for-policies'],
    queryFn: () => resourcesApi.listAll(),
  });

  const [globalRows, setGlobalRows] = useState<RuleRow[]>([]);
  const [globalEditing, setGlobalEditing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [resId, setResId] = useState('');
  const [resRows, setResRows] = useState<RuleRow[]>([]);
  const [resEditing, setResEditing] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  const globalMut = useMutation({
    mutationFn: () => policiesApi.setGlobal(parseRules(globalRows)),
    onSuccess: () => {
      setGlobalEditing(false);
      setGlobalError(null);
      queryClient.invalidateQueries({ queryKey: ['policies-defaults'] });
    },
    onError: (e) => setGlobalError((e as Error).message),
  });

  const resMut = useMutation({
    mutationFn: () => {
      if (!resId) throw new Error('Selecciona una cancha');
      return policiesApi.setForResource(resId, parseRules(resRows));
    },
    onSuccess: () => {
      setResEditing(false);
      setResError(null);
    },
    onError: (e) => setResError((e as Error).message),
  });

  function startGlobalEdit() {
    setGlobalRows(defaults ? toRuleRows(defaults.rules) : []);
    setGlobalError(null);
    setGlobalEditing(true);
  }

  function startResEdit() {
    setResRows(defaults ? toRuleRows(defaults.rules) : []);
    setResError(null);
    setResEditing(true);
  }

  function updateRow(rows: RuleRow[], setRows: (r: RuleRow[]) => void, idx: number, field: keyof RuleRow, val: string) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  function addRow(rows: RuleRow[], setRows: (r: RuleRow[]) => void) {
    setRows([...rows, { hoursBeforeStart: '', refundPct: '' }]);
  }

  function removeRow(rows: RuleRow[], setRows: (r: RuleRow[]) => void, idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  const sortedRules = defaults?.rules
    ? [...defaults.rules].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
    : [];

  return (
    <div>
      <div className="admin-page-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <h1>Políticas de Cancelación</h1>
        <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.95rem' }}>
          Configura las reglas de reembolso y tiempos de aviso para las cancelaciones de los usuarios.
        </p>
      </div>

      {/* Bento grid */}
      <div className="policies-bento">
        {/* Global Policy */}
        <div className="policies-card policies-card-wide">
          <div className="policies-card-header">
            <div className="policies-card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <h3>Política Global</h3>
            </div>
            {!globalEditing && (
              <button className="policies-edit-btn" onClick={startGlobalEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
            )}
          </div>
          <div className="policies-card-body">
            <p className="muted" style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
              Estas son las reglas aplicadas por defecto a todas las canchas, a menos que se especifique una política individual.
            </p>

            {globalEditing ? (
              <RuleEditor
                rows={globalRows}
                setRows={setGlobalRows}
                onSave={() => globalMut.mutate()}
                onCancel={() => setGlobalEditing(false)}
                error={globalError}
                saving={globalMut.isPending}
              />
            ) : (
              <div className="policies-rules-table">
                <div className="policies-rules-header">
                  <span>Horas antes del inicio</span>
                  <span>Porcentaje de Reembolso</span>
                </div>
                {sortedRules.map((r, i) => (
                  <div key={i} className="policies-rules-row">
                    <div className="policies-rules-hours">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: r.hoursBeforeStart <= 12 ? 'var(--danger)' : 'var(--primary)', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span style={{ color: r.hoursBeforeStart <= 12 ? 'var(--danger)' : undefined }}>
                        {r.hoursBeforeStart > 0 ? `≥ ${r.hoursBeforeStart}h` : `< ${sortedRules[i - 1]?.hoursBeforeStart ?? 12}h`}
                      </span>
                    </div>
                    <span className={`policies-refund-badge ${getRefundBadgeClass(r.refundPct)}`}>
                      {r.refundPct}%{r.refundPct === 0 ? ' (Sin reembolso)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Per-Court Policy */}
        <div className="policies-card">
          <div className="policies-card-header">
            <div className="policies-card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <h3>Política por Cancha</h3>
            </div>
          </div>
          <div className="policies-card-body">
            <p className="muted" style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
              Configura excepciones a la regla global seleccionando una cancha específica.
            </p>

            <div className="policies-select-group">
              <label className="policies-select-label">Seleccionar Cancha</label>
              <div className="policies-select-wrap">
                <select
                  className="policies-select"
                  value={resId}
                  onChange={(e) => { setResId(e.target.value); setResEditing(false); }}
                >
                  <option value="">Elige una cancha...</option>
                  {resources?.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="policies-select-icon">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {!resId ? (
              <div className="policies-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                </svg>
                <p>Selecciona una cancha para ver o establecer sus reglas personalizadas.</p>
              </div>
            ) : resEditing ? (
              <RuleEditor
                rows={resRows}
                setRows={setResRows}
                onSave={() => resMut.mutate()}
                onCancel={() => setResEditing(false)}
                error={resError}
                saving={resMut.isPending}
              />
            ) : (
              <button className="policies-create-btn" onClick={startResEdit}>
                Crear Regla Personalizada
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Impact info */}
      <div className="policies-impact">
        <div className="policies-impact-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
        </div>
        <div className="policies-impact-text">
          <h4>Impacto Inmediato</h4>
          <p>
            Cualquier cambio en la <strong>Política Global</strong> afectará únicamente a las reservas creadas <em>después</em> de guardar los cambios. Las reservas existentes mantendrán la política vigente en el momento de su confirmación para garantizar transparencia con los usuarios.
          </p>
        </div>
        <button className="policies-impact-btn">Ver Historial de Cambios</button>
      </div>
    </div>
  );
}

function RuleEditor({
  rows,
  setRows,
  onSave,
  onCancel,
  error,
  saving,
}: {
  rows: RuleRow[];
  setRows: (r: RuleRow[]) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  saving: boolean;
}) {
  function updateRow(idx: number, field: keyof RuleRow, val: string) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }
  function addRow() {
    setRows([...rows, { hoursBeforeStart: '', refundPct: '' }]);
  }
  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="policies-editor">
      <p className="hint" style={{ margin: '0 0 0.75rem' }}>Ordena de mayor a menor horas. La última regla debe ser 0 horas.</p>
      {rows.map((r, i) => (
        <div key={i} className="policies-editor-row">
          <label className="policies-editor-field">
            <span>Horas antes</span>
            <input
              type="number"
              value={r.hoursBeforeStart}
              onChange={(e) => updateRow(i, 'hoursBeforeStart', e.target.value)}
              min={0}
            />
          </label>
          <label className="policies-editor-field">
            <span>Reembolso %</span>
            <input
              type="number"
              value={r.refundPct}
              onChange={(e) => updateRow(i, 'refundPct', e.target.value)}
              min={0}
              max={100}
            />
          </label>
          <button
            className="policies-editor-remove"
            onClick={() => removeRow(i)}
            type="button"
          >
            Quitar
          </button>
        </div>
      ))}
      <button className="policies-editor-add" onClick={addRow} type="button">
        + Agregar regla
      </button>
      {error && <div className="error" style={{ marginTop: '0.5rem' }}>{error}</div>}
      <div className="policies-editor-actions">
        <button className="admin-btn-secondary" onClick={onCancel}>Cancelar</button>
        <button onClick={onSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
