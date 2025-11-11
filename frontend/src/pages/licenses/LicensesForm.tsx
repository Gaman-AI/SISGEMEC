import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createLicense, getLicense, updateLicense, listPlans } from '@/data/licenses.repository';
import type { LicenseCreate, Plan } from '@/data/licenses.types';
import { parseApiError } from './utils';

// Hook de toast local (reutilizando patrón existente)
function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"success" | "error" | null>(null);
  const show = (m: string, t: "success" | "error" = "success") => {
    setMsg(m);
    setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => {
      setMsg(null);
      setType(null);
    }, 5000);
  };
  const Toast = () =>
    msg ? (
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md z-50 ${
          type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function LicensesForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { state } = useAuth();
  const { show, Toast } = useToast();
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
    const loadPlans = async () => {
      try {
        const res = await listPlans({ page: 1, size: 100 });

        if (res && Array.isArray(res.data)) {
          setPlans(res.data);
        } else {
          console.error('[LicensesForm] Invalid plans response:', res);
          show('Error al cargar planes: formato de respuesta inválido', 'error');
          setPlans([]);
        }
      } catch (err: any) {
        console.error('[LicensesForm] Error loading plans:', err);
        show('Error al cargar planes', 'error');
        setPlans([]);
      }
    };

    void loadPlans();
    // sin dependencias para que se ejecute SOLO al montar
  }, []);

  React.useEffect(() => {
    if (!id) return;
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
      .catch(err => {
        console.error('Error loading license:', err);
        show('Error al cargar la licencia', 'error');
      })
      .finally(() => setLoading(false));
  }, [id]);

  function validateDates(): boolean {
    const newErrors: Record<string, string> = {};
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e < s) {
        newErrors.end_date = 'La fecha de fin debe ser mayor o igual a la fecha de inicio';
      }
    }
    if (renewalDate && endDate) {
      const e = new Date(endDate);
      const r = new Date(renewalDate);
      if (r <= e) {
        newErrors.renewal_date = 'La fecha de renovación debe ser posterior a la fecha de fin';
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    
    // Validaciones del cliente
    if (!planId) {
      setErrors({ plan_id: 'Plan requerido' });
      return;
    }
    
    const seatsTotalNum = Number(seatsTotal);
    if (!seatsTotal || seatsTotalNum <= 0) {
      setErrors({ seats_total: 'Debe ser mayor que 0' });
      return;
    }
    
    if (!validateDates()) return;
    
    setLoading(true);
    try {
      const body: LicenseCreate = {
        plan_id: Number(planId),
        code: code.trim() || null,
        seats_total: seatsTotalNum,
        start_date: startDate || null,
        end_date: endDate || null,
        renewal_date: renewalDate || null,
        notes: notes.trim() || null,
      };
      
      if (isEdit) {
        await updateLicense(Number(id), { ...body });
        show('Licencia actualizada correctamente');
      } else {
        await createLicense(body);
        show('Licencia creada correctamente');
      }
      
      // Navegar después de un breve delay para que se vea el toast
      setTimeout(() => nav('/licenses'), 1000);
    } catch (err: any) {
      console.error('[LicensesForm] Error guardando:', err);
      const { status, detail, data } = parseApiError(err);

      if (status === 409) {
        show(detail || 'Ya existe una licencia con ese código', 'error');
      } else if (status === 400 || status === 422) {
        if (data && typeof data === 'object' && !data.detail) {
          setErrors(data);
        }
        show(detail || 'Error de validación', 'error');
      } else {
        show(detail || 'Error inesperado. Intente de nuevo o contacte al administrador.', 'error');
      }
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
            <label className="block text-sm mb-1">Plan *</label>
            <select 
              className="w-full border rounded h-9 px-2" 
              value={planId} 
              onChange={e => setPlanId(e.target.value ? Number(e.target.value) : '')}
              disabled={loading}
            >
              <option value="">Seleccione</option>
              {plans.map(pl => <option key={pl.plan_id} value={pl.plan_id}>{pl.plan_name}</option>)}
            </select>
            {errors.plan_id && <div className="text-sm text-red-600 mt-1">{errors.plan_id}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Código</label>
            <Input 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              placeholder="Opcional" 
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Asientos totales *</label>
            <Input 
              type="number" 
              min="1"
              value={seatsTotal} 
              onChange={e => setSeatsTotal(e.target.value)} 
              placeholder="1" 
              disabled={loading}
            />
            {errors.seats_total && <div className="text-sm text-red-600 mt-1">{errors.seats_total}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Inicio</label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fin</label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              disabled={loading}
            />
            {errors.end_date && <div className="text-sm text-red-600 mt-1">{errors.end_date}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Renovación</label>
            <Input 
              type="date" 
              value={renewalDate} 
              onChange={e => setRenewalDate(e.target.value)} 
              disabled={loading}
            />
            {errors.renewal_date && <div className="text-sm text-red-600 mt-1">{errors.renewal_date}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Notas</label>
            <textarea 
              className="w-full border rounded p-2 text-sm" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              disabled={loading}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEdit ? 'Guardar' : 'Crear')}
            </Button>
            <Button type="button" variant="outline" onClick={() => nav('/licenses')} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
      <Toast />
    </div>
  );
}
