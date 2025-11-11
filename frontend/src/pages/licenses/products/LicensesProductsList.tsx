import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listProducts, removeProduct, listVendors } from '@/data/licenses.repository';
import type { Product, ProductFilters, Vendor } from '@/data/licenses.types';

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

export default function LicensesProductsList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const { show, Toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [vendorId, setVendorId] = React.useState<number | ''>('');
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [rows, setRows] = React.useState<Product[]>([]);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    listVendors({ page: 1, size: 100 }).then(r => setVendors(r.data)).catch(console.error);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProductFilters = { search, vendor_id: vendorId || undefined, page, size };
      const res = await listProducts(filters);
      setRows(res.data); 
      setTotal(res.total);
    } catch (e) {
      console.error('Error loading products:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, vendorId, page, size]);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  async function onDelete(id: number) {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      await removeProduct(id);
      show('Producto eliminado correctamente', 'success');
      await load();
    } catch (err: any) {
      console.error('[LicensesProductsList] Error eliminando producto:', err);
      
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail;
      
      if (status === 409) {
        // Mensaje específico desde el backend (tiene planes asociados)
        show(backendDetail || 'No se puede eliminar el producto porque tiene elementos asociados.', 'error');
      } else {
        const msg = backendDetail || err?.message || 'Error inesperado al eliminar el producto. Intente de nuevo o contacte al administrador.';
        show(msg, 'error');
      }
    }
  }

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <Button onClick={() => nav('/licenses/products/nuevo')}>Nuevo</Button>
      </div>
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Buscar</label>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o descripción" />
        </div>
        <div>
          <label className="block text-sm mb-1">Proveedor</label>
          <select className="w-full border rounded h-9 px-2" value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
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
              <th className="text-left p-2">Producto</th>
              <th className="text-left p-2">Proveedor</th>
              <th className="text-left p-2">Descripción</th>
              <th className="text-right p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.product_id} className="border-b hover:bg-slate-50">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.vendor_name || '-'}</td>
                <td className="p-2">{r.description || '-'}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/products/${r.product_id}/editar`)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(r.product_id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-3 text-slate-500" colSpan={4}>Sin resultados</td></tr>
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
      <Toast />
    </div>
  );
}


