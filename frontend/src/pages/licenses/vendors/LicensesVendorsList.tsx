import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listVendors, removeVendor } from '@/data/licenses.repository';
import type { Vendor, VendorFilters } from '@/data/licenses.types';

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

export default function LicensesVendorsList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const { show, Toast } = useToast();
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
    if (!window.confirm('¿Eliminar proveedor?')) return;
    try {
      await removeVendor(id);
      show('Proveedor eliminado correctamente', 'success');
      await load();
    } catch (err: any) {
      console.error('[LicensesVendorsList] Error eliminando proveedor:', err);
      
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail;
      
      if (status === 409) {
        // Mensaje específico desde el backend (tiene productos/planes asociados)
        show(backendDetail || 'No se puede eliminar el proveedor porque tiene elementos asociados.', 'error');
      } else {
        const msg = backendDetail || err?.message || 'Error inesperado al eliminar el proveedor. Intente de nuevo o contacte al administrador.';
        show(msg, 'error');
      }
    }
  }

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'ADMIN')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
            Proveedores
          </h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Administra los proveedores de software registrados en el sistema.
          </p>
        </div>
        <Button
          onClick={() => nav('/licenses/vendors/nuevo')}
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
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5 mb-4 flex items-center gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar" className="max-w-xs" />
        <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Buscar</Button>
      </Card>

      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-[#527779]">Cargando proveedores...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 text-left bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
              <tr className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.vendor_id}
                  className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 hover:shadow-sm`}
                >
                  <td className="px-4 py-3 text-sm text-[#26272A]">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-[#26272A]">{r.website || '-'}</td>
                  <td className="px-4 py-3 text-sm text-[#26272A] text-right">
                    <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/vendors/${r.vendor_id}/editar`)}>Editar</Button>
                    <Button
                      size="sm"
                      className="
                        inline-flex items-center justify-center
                        rounded-xl
                        bg-[#D4D970] text-[#164F5B]
                        px-3 py-1.5 text-xs font-semibold
                        shadow-sm
                        transition-colors duration-200
                        hover:bg-[#C7D8D0]
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-[#D4D970]/40
                      "
                      onClick={() => onDelete(r.vendor_id)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td className="px-4 py-3 text-sm text-[#527779]" colSpan={3}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[#26272A]">
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


