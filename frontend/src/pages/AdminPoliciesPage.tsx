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
    return (
      <div className="admin-policy-editor">
        <p className="hint">Ordena de mayor a menor horas. La última regla debe ser 0 horas.</p>
        {rows.map((r, i) => (
          <div key={i} className="admin-policy-row">
            <label>
              <span>Horas antes</span>
              <input
                type="number"
                value={r.hoursBeforeStart}
                onChange={(e) => updateRow(rows, setRows, i, 'hoursBeforeStart', e.target.value)}
                min={0}
              />
            </label>
            <label>
              <span>Reembolso %</span>
              <input
                type="number"
                value={r.refundPct}
                onChange={(e) => updateRow(rows, setRows, i, 'refundPct', e.target.value)}
                min={0}
                max={100}
              />
            </label>
            <button
              className="admin-btn-sm admin-btn-danger"
              onClick={() => removeRow(rows, setRows, i)}
              type="button"
            >
              Quitar
            </button>
          </div>
        ))}
        <button className="admin-btn-sm" onClick={() => addRow(rows, setRows)} type="button">
          Agregar regla
        </button>
        {error && <div className="error">{error}</div>}
        <div className="admin-form-actions">
          <button className="admin-btn-secondary" onClick={onCancel}>Cancelar</button>
          <button onClick={onSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Políticas de cancelación</h1>
      </div>

      <section className="admin-section">
        <h2>Reglas por defecto (built-in)</h2>
        <p className="hint">Estas son las reglas cuando no hay política personalizada.</p>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-sm">
            <thead>
              <tr>
                <th>Horas antes del inicio</th>
                <th>Reembolso</th>
              </tr>
            </thead>
            <tbody>
              {defaults?.rules
                .sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
                .map((r, i) => (
                  <tr key={i}>
                    <td>{r.hoursBeforeStart > 0 ? `≥ ${r.hoursBeforeStart}h` : 'Menos de la última regla'}</td>
                    <td>{r.refundPct}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Política global</h2>
          {!globalEditing && (
            <button className="admin-btn-sm" onClick={startGlobalEdit}>
              Editar política global
            </button>
          )}
        </div>
        <p className="hint">Se aplica a todas las canchas que no tengan política propia.</p>
        {globalEditing && (
          <RuleEditor
            rows={globalRows}
            setRows={setGlobalRows}
            onSave={() => globalMut.mutate()}
            onCancel={() => setGlobalEditing(false)}
            error={globalError}
            saving={globalMut.isPending}
          />
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Política por cancha</h2>
        </div>
        <p className="hint">Sobreescribe la política global para una cancha específica.</p>

        <label>
          <span>Cancha</span>
          <select value={resId} onChange={(e) => { setResId(e.target.value); setResEditing(false); }}>
            <option value="">Seleccionar cancha</option>
            {resources?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        {resId && !resEditing && (
          <button className="admin-btn-sm" onClick={startResEdit}>
            Configurar política
          </button>
        )}

        {resEditing && (
          <RuleEditor
            rows={resRows}
            setRows={setResRows}
            onSave={() => resMut.mutate()}
            onCancel={() => setResEditing(false)}
            error={resError}
            saving={resMut.isPending}
          />
        )}
      </section>
    </div>
  );
}
