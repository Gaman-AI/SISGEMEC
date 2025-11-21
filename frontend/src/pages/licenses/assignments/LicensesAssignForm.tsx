import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createAssignment, listLicenses } from '@/data/licenses.repository';
import type { AssignmentCreate, License } from '@/data/licenses.types';
import UserSelect from '@/components/licenses/UserSelect';
import { parseApiError } from '../utils';

export default function LicensesAssignForm() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [licenses, setLicenses] = React.useState<License[]>([]);
  const [licenseId, setLicenseId] = React.useState<number | ''>('');
  const [userId, setUserId] = React.useState('');
  const [idempotencyKey, setIdempotencyKey] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [noSeatsMsg, setNoSeatsMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    // cargar algunas licencias (primer página) para el selector
    listLicenses({ page: 1, size: 100 }).then(r => setLicenses(r.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!licenseId) { setNoSeatsMsg(null); return; }
    const l = licenses.find(x => x.license_id === Number(licenseId));
    if (!l) { setNoSeatsMsg(null); return; }
    const available = Math.max(l.seats_total - l.seats_in_use, 0);
    setNoSeatsMsg(available === 0 ? 'No hay asientos disponibles' : null);
  }, [licenseId, licenses]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setErrors({});
    setFormError(null);
    if (!licenseId) { setErrors({ license_id: 'Licencia requerida' }); return; }
    if (!userId.trim()) { setErrors({ user_id: 'Usuario requerido' }); return; }
    if (noSeatsMsg) return;
    
    setSubmitting(true);
    
    // Idempotencia por submit (único para este envío)
    const idemKey = crypto?.randomUUID?.() ?? String(Date.now());
    console.log('[ASSIGN] sending with Idempotency-Key', idemKey);
    
    try {
      const body: AssignmentCreate = { license_id: Number(licenseId), user_id: userId.trim(), notes: notes.trim() || null };
      await createAssignment(body, idemKey);
      
      // Feedback de éxito: navega a la lista
      nav('/licenses/assignments');
    } catch (err: any) {
      console.error('[LicensesAssignForm] Error guardando:', err);
      const { status, detail, data } = parseApiError(err);

      if (status === 409) {
        setFormError(detail || 'Ya existe una asignación activa para este usuario y licencia.');
      } else if (status === 422) {
        if (data && typeof data === 'object' && !data.detail) {
          setErrors(data);
        } else {
          setFormError(detail || 'Error de validación.');
        }
      } else {
        setFormError(detail || 'Error inesperado. Intente nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Asignar Licencia
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Asigna una licencia disponible a un usuario del sistema.
        </p>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#26272A] mb-1">Licencia</label>
            <select className="w-full border rounded h-9 px-2" value={licenseId} onChange={e => setLicenseId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Seleccione</option>
              {licenses.map(l => {
                const available = Math.max(l.seats_total - l.seats_in_use, 0);
                return (
                  <option key={l.license_id} value={l.license_id}>
                    {l.code || `Licencia #${l.license_id}`} · {l.plan_name || '-'} · libres {available}
                  </option>
                );
              })}
            </select>
            {errors.license_id && <div className="text-sm text-red-600 mt-1">{errors.license_id}</div>}
            {noSeatsMsg && <div className="text-sm text-red-700 mt-1">{noSeatsMsg}</div>}
          </div>
          <div className="md:col-span-2">
            <UserSelect
              value={userId}
              onSelect={(id: string | null) => setUserId(id || '')}
              label="Usuario"
              placeholder="Buscar por nombre o correo..."
            />
            {errors.user_id && <div className="text-sm text-red-600 mt-1">{errors.user_id}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#26272A] mb-1">Notas</label>
            <textarea className="w-full border rounded p-2 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#26272A] mb-1">Identificador de operación (opcional)</label>
            <Input value={idempotencyKey} onChange={e => setIdempotencyKey(e.target.value)} placeholder="Para evitar duplicados" />
          </div>
          
          {/* Error del formulario si existe */}
          {formError && (
            <div className="md:col-span-2">
              <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 rounded border">{formError}</div>
            </div>
          )}
          
          <div className="md:col-span-2 flex items-center gap-2">
            <Button
              type="submit"
              disabled={submitting || Boolean(noSeatsMsg)}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-[#208692] hover:bg-[#164F5B] text-white
                transition-colors duration-200 shadow-sm
                px-4 py-2.5 text-sm font-semibold
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
              "
            >
              {submitting ? 'Asignando…' : 'Asignar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => nav('/licenses/assignments')}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


