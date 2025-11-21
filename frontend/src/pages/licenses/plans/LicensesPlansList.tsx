import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listPlans, listProducts } from '@/data/licenses.repository';
import type { Plan, PlanFilters, Product } from '@/data/licenses.types';

export default function LicensesPlansList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [productId, setProductId] = React.useState<number | ''>('');
  const [billing, setBilling] = React.useState('');
  const [currency, setCurrency] = React.useState('');
  const [priceMin, setPriceMin] = React.useState('');
  const [priceMax, setPriceMax] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [rows, setRows] = React.useState<Plan[]>([]);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    listProducts({ page: 1, size: 100 }).then(r => setProducts(r.data)).catch(console.error);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: PlanFilters = {
        search,
        product_id: productId || undefined,
        billing_cycle: billing ? (billing as any) : undefined,
        currency: currency ? (currency as any) : undefined,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
        page, size
      };
      const res = await listPlans(filters);
      setRows(res.data); 
      setTotal(res.total);
    } catch (e) {
      console.error('Error loading plans:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, productId, billing, currency, priceMin, priceMax, page, size]);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
            Planes
          </h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Administra los planes de licencias y su capacidad.
          </p>
        </div>
        <Button
          onClick={() => nav('/licenses/plans/nuevo')}
          className="
            inline-flex items-center gap-2 rounded-xl
            bg-[#208692] hover:bg-[#164F5B] text-white
            transition-colors duration-200 shadow-sm
            px-4 py-2.5 text-sm font-semibold
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
          "
        >
          Nuevo
        </Button>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5 mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#26272A] mb-1">Buscar</label>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Plan, características" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Producto</label>
          <select className="w-full border rounded h-9 px-2" value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Ciclo</label>
          <select className="w-full border rounded h-9 px-2" value={billing} onChange={e => setBilling(e.target.value)}>
            <option value="">Todos</option>
            <option value="annual">Anual</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Moneda</label>
          <select className="w-full border rounded h-9 px-2" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="">Todas</option>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Precio min</label>
            <Input value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0" type="number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Precio max</label>
            <Input value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="1000" type="number" />
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Filtrar</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 text-left bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
            <tr className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Ciclo</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.plan_id}
                className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 hover:shadow-sm`}
              >
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.plan_name}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.product_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.vendor_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.cost_per_cycle ? `${r.currency || ''} ${r.cost_per_cycle}` : '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A] text-right">
                  <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/plans/${r.plan_id}/editar`)}>Editar</Button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="px-4 py-3 text-sm text-[#527779]" colSpan={6}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[#26272A]">
        <div>Mostrando {rows.length} de {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
          <div>Página {page}</div>
          <Button variant="outline" disabled={(page*size)>=total} onClick={() => setPage(p => p+1)}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}


