import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createLicense, getLicense, updateLicense, listPlans } from '@/data/licenses.repository';
import type { LicenseCreate, Plan } from '@/data/licenses.types';

export default function LicensesForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [planId, setPlanId] = React.useState<number | ''>('');
  const [code, setCode] = React.useState('');
  const [seatsTotal, setSeatsTotal] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [renewalDate, setRenewalDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    listPlans({ page: 1, size: 100 }).then(r => setPlans(r.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getLicense(Number(id))
      .then(l => {
        setPlanId(l.plan_id);
        setCode(l.code || '');
        setSeatsTotal(String(l.seats_total));
        setStartDate(l.start_date || '');
        setEndDate(l.end_date || '');
        setRenewalDate(l.renewal_date || '');
        setNotes(l.notes || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function validateDates(): boolean {
    if (startDate && endDate) {
      const s = new Date(startDate); const e = new Date(endDate);
      if (e < s) { setErrors({ end_date: 'La fecha de fin debe ser mayor a inicio' }); return false; }
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!planId) { setErrors({ plan_id: 'Plan requerido' }); return; }
    if (!seatsTotal || Number(seatsTotal) < 0) { setErrors({ seats_total: 'Debe ser >= 0' }); return; }
    if (!validateDates()) return;
    setLoading(true);
    try {
      const body: LicenseCreate = {
        plan_id: Number(planId),
        code: code.trim() || null,
        seats_total: Number(seatsTotal),
        start_date: startDate || null,
        end_date: endDate || null,
        renewal_date: renewalDate || null,
        notes: notes.trim() || null,
      };
      if (isEdit) await updateLicense(Number(id), { ...body });
      else await createLicense(body);
      nav('/licenses');
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 409) {
        const msg = String(err?.response?.data || 'Conflicto');
        alert(msg);
      }
      if (err?.response?.status === 422 && err?.response?.data) setErrors(err.response.data);
    } finally {
      setLoading(false);
    }
  }

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{isEdit ? 'Editar' : 'Nueva'} Licencia</h1>
      </div>
      <Card className="p-4 max-w-2xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Plan</label>
            <select className="w-full border rounded h-9 px-2" value={planId} onChange={e => setPlanId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Seleccione</option>
              {plans.map(pl => <option key={pl.plan_id} value={pl.plan_id}>{pl.plan_name}</option>)}
            </select>
            {errors.plan_id && <div className="text-sm text-red-600 mt-1">{errors.plan_id}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Código</label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-sm mb-1">Asientos totales</label>
            <Input type="number" value={seatsTotal} onChange={e => setSeatsTotal(e.target.value)} placeholder="0" />
            {errors.seats_total && <div className="text-sm text-red-600 mt-1">{errors.seats_total}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Inicio</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Fin</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            {errors.end_date && <div className="text-sm text-red-600 mt-1">{errors.end_date}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Renovación</label>
            <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Notas</label>
            <textarea className="w-full border rounded p-2 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Button type="submit" disabled={loading}>{isEdit ? 'Guardar' : 'Crear'}</Button>
            <Button type="button" variant="outline" onClick={() => nav('/licenses')}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


