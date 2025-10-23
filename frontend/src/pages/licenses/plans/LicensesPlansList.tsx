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
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Planes</h1>
        <Button onClick={() => nav('/licenses/plans/nuevo')}>Nuevo</Button>
      </div>
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Buscar</label>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Plan, características" />
        </div>
        <div>
          <label className="block text-sm mb-1">Producto</label>
          <select className="w-full border rounded h-9 px-2" value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Ciclo</label>
          <select className="w-full border rounded h-9 px-2" value={billing} onChange={e => setBilling(e.target.value)}>
            <option value="">Todos</option>
            <option value="annual">Anual</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Moneda</label>
          <select className="w-full border rounded h-9 px-2" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="">Todas</option>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-sm mb-1">Precio min</label>
            <Input value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0" type="number" />
          </div>
          <div>
            <label className="block text-sm mb-1">Precio max</label>
            <Input value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="1000" type="number" />
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Filtrar</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Producto</th>
              <th className="text-left p-2">Proveedor</th>
              <th className="text-left p-2">Ciclo</th>
              <th className="text-left p-2">Precio</th>
              <th className="text-right p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.plan_id} className="border-b hover:bg-slate-50">
                <td className="p-2">{r.plan_name}</td>
                <td className="p-2">{r.product_name || '-'}</td>
                <td className="p-2">{r.vendor_name || '-'}</td>
                <td className="p-2">{r.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</td>
                <td className="p-2">{r.cost_per_cycle ? `${r.currency || ''} ${r.cost_per_cycle}` : '-'}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/plans/${r.plan_id}/editar`)}>Editar</Button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-3 text-slate-500" colSpan={6}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
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


