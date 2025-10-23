import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listVendors, removeVendor } from '@/data/licenses.repository';
import type { Vendor, VendorFilters } from '@/data/licenses.types';

export default function LicensesVendorsList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [rows, setRows] = React.useState<Vendor[]>([]);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: VendorFilters = { search, page, size };
      const res = await listVendors(filters);
      setRows(res.data); 
      setTotal(res.total);
    } catch (e) {
      console.error('Error loading vendors:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, size]);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar proveedor?')) return;
    try {
      await removeVendor(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proveedores</h1>
        <Button onClick={() => nav('/licenses/vendors/nuevo')}>Nuevo</Button>
      </div>
      <Card className="p-4 mb-4 flex items-center gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar" className="max-w-xs" />
        <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Buscar</Button>
      </Card>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando proveedores...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Website</th>
                <th className="text-right p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.vendor_id} className="border-b hover:bg-slate-50">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.website || '-'}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/vendors/${r.vendor_id}/editar`)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(r.vendor_id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td className="p-3 text-slate-500" colSpan={3}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
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


