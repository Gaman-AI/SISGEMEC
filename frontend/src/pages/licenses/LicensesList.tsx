import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listLicenses, listVendors, listProducts, listPlans } from '@/data/licenses.repository';
import LicenseCapacityIndicator from '@/components/licenses/LicenseCapacityIndicator';
import type { License, LicenseFilters, Vendor, Product, Plan } from '@/data/licenses.types';

export default function LicensesList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [vendorId, setVendorId] = React.useState<number | ''>('');
  const [productId, setProductId] = React.useState<number | ''>('');
  const [planId, setPlanId] = React.useState<number | ''>('');
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [rows, setRows] = React.useState<License[]>([]);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    listVendors({ page: 1, size: 100 }).then(r => setVendors(r.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    const v = vendorId || undefined;
    listProducts({ vendor_id: v as any, page: 1, size: 100 }).then(r => setProducts(r.data)).catch(console.error);
  }, [vendorId]);

  React.useEffect(() => {
    const p = productId || undefined;
    listPlans({ product_id: p as any, page: 1, size: 100 }).then(r => setPlans(r.data)).catch(console.error);
  }, [productId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: LicenseFilters = {
        code: code || undefined,
        vendor_id: vendorId || undefined,
        product_id: productId || undefined,
        plan_id: planId || undefined,
        page, size
      };
      const res = await listLicenses(filters);
      setRows(res.data); 
      setTotal(res.total);
    } catch (e) {
      console.error('Error loading licenses:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [code, vendorId, productId, planId, page, size]);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Licencias</h1>
        <Button onClick={() => nav('/licenses/nuevo')}>Nueva</Button>
      </div>
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Código</label>
          <Input value={code} onChange={e => setCode(e.target.value)} placeholder="ABC-123..." />
        </div>
        <div>
          <label className="block text-sm mb-1">Proveedor</label>
          <select className="w-full border rounded h-9 px-2" value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Producto</label>
          <select className="w-full border rounded h-9 px-2" value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Plan</label>
          <select className="w-full border rounded h-9 px-2" value={planId} onChange={e => setPlanId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {plans.map(pl => <option key={pl.plan_id} value={pl.plan_id}>{pl.plan_name}</option>)}
          </select>
        </div>
        <div>
          <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Filtrar</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="text-left p-2">Código</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Producto</th>
              <th className="text-left p-2">Proveedor</th>
              <th className="text-left p-2">Capacidad</th>
              <th className="text-right p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.license_id} className="border-b hover:bg-slate-50">
                <td className="p-2">{r.code || '-'}</td>
                <td className="p-2">{r.plan_name || '-'}</td>
                <td className="p-2">{r.product_name || '-'}</td>
                <td className="p-2">{r.vendor_name || '-'}</td>
                <td className="p-2"><LicenseCapacityIndicator total={r.seats_total} inUse={r.seats_in_use} /></td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/${r.license_id}/editar`)}>Editar</Button>
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


