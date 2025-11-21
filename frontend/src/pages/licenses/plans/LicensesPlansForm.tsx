import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createPlan, getPlan, updatePlan, listProducts } from '@/data/licenses.repository';
import type { PlanCreate, Product } from '@/data/licenses.types';
import { FeaturesEditor } from '@/components/licenses/FeaturesEditor';
import { parseApiError } from '../utils';

// Hook de toast local
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
          type === "success" ? "bg-[#208692] text-white" : "bg-rose-600 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function LicensesPlansForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { state } = useAuth();
  const { show, Toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [productId, setProductId] = React.useState<number | ''>('');
  const [planName, setPlanName] = React.useState('');
  const [billing, setBilling] = React.useState<'annual' | 'monthly' | ''>('');
  const [seatLimit, setSeatLimit] = React.useState<string>('');
  const [currency, setCurrency] = React.useState<'MXN' | 'USD' | ''>('');
  const [costPerCycle, setCostPerCycle] = React.useState<string>('');
  const [features, setFeatures] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    listProducts({ page: 1, size: 100 }).then(r => setProducts(r.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getPlan(Number(id))
      .then(p => {
        setProductId(p.product_id);
        setPlanName(p.plan_name);
        setBilling(p.billing_cycle);
        setSeatLimit(p.seat_limit != null ? String(p.seat_limit) : '');
                    setCurrency((p.currency as any) || '');
                    setCostPerCycle(p.cost_per_cycle != null ? String(p.cost_per_cycle) : '');
                    setFeatures(p.features ?? {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Ya no necesitamos parseFeatures porque features es un objeto

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!productId) { setErrors({ product_id: 'Producto requerido' }); return; }
    if (!planName.trim()) { setErrors({ plan_name: 'Nombre requerido' }); return; }
    if (!billing) { setErrors({ billing_cycle: 'Ciclo requerido' }); return; }
    if (seatLimit && Number(seatLimit) < 0) { setErrors({ seat_limit: 'Debe ser >= 0' }); return; }
    if (costPerCycle && Number(costPerCycle) < 0) { setErrors({ cost_per_cycle: 'Debe ser >= 0' }); return; }
    setLoading(true);
    try {
      const body: PlanCreate = {
        product_id: Number(productId),
        plan_name: planName.trim(),
        billing_cycle: billing as 'annual' | 'monthly',
        seat_limit: seatLimit ? Number(seatLimit) : null,
        currency: (currency || undefined) as any,
        cost_per_cycle: costPerCycle ? Number(costPerCycle) : null,
        features: features,
      };
      if (isEdit) await updatePlan(Number(id), body);
      else await createPlan(body);
      show('Plan guardado correctamente', 'success');
      nav('/licenses/plans');
    } catch (err: any) {
      console.error('[LicensesPlansForm] Error guardando:', err);
      const { status, detail, data } = parseApiError(err);

      if (status === 409) {
        show(detail || 'Ya existe un plan con ese nombre para este producto', 'error');
      } else if (status === 422) {
        if (data && typeof data === 'object' && !data.detail) {
          setErrors(data);
        } else {
          show(detail || 'Error de validación', 'error');
        }
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
    <div className="p-4 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          {isEdit ? 'Editar' : 'Nuevo'} Plan
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Crea o edita un plan de licencias con sus características.
        </p>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#26272A] mb-1">Producto</label>
            <select className="w-full border rounded h-9 px-2" value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Seleccione</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
            {errors.product_id && <div className="text-sm text-red-600 mt-1">{errors.product_id}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Nombre del plan</label>
            <Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Plan" />
            {errors.plan_name && <div className="text-sm text-red-600 mt-1">{errors.plan_name}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Ciclo</label>
            <select className="w-full border rounded h-9 px-2" value={billing} onChange={e => setBilling(e.target.value as any)}>
              <option value="">Seleccione</option>
              <option value="annual">Anual</option>
              <option value="monthly">Mensual</option>
            </select>
            {errors.billing_cycle && <div className="text-sm text-red-600 mt-1">{errors.billing_cycle}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Límite de asientos</label>
            <Input type="number" value={seatLimit} onChange={e => setSeatLimit(e.target.value)} placeholder="Opcional" />
            {errors.seat_limit && <div className="text-sm text-red-600 mt-1">{errors.seat_limit}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Moneda</label>
            <select className="w-full border rounded h-9 px-2" value={currency} onChange={e => setCurrency(e.target.value as any)}>
              <option value="">Seleccione</option>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Costo por ciclo</label>
            <Input type="number" value={costPerCycle} onChange={e => setCostPerCycle(e.target.value)} placeholder="Opcional" />
            {errors.cost_per_cycle && <div className="text-sm text-red-600 mt-1">{errors.cost_per_cycle}</div>}
          </div>
          <div className="md:col-span-2">
            <FeaturesEditor
              value={features}
              onChange={setFeatures}
              label="Características"
              helpText="Agregue características clave/valor para el plan. Use los presets o agregue las suyas."
            />
            {errors.features && <div className="text-sm text-red-600 mt-1">{errors.features}</div>}
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-[#208692] hover:bg-[#164F5B] text-white
                transition-colors duration-200 shadow-sm
                px-4 py-2.5 text-sm font-semibold
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
              "
            >
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" onClick={() => nav('/licenses/plans')}>Cancelar</Button>
          </div>
        </form>
      </Card>
      <Toast />
    </div>
  );
}


