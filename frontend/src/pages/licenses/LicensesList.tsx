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

export default function LicensesList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const { show, Toast } = useToast();
  
  // Memoizar show para evitar bucles de renderizado usando ref
  const showRef = React.useRef(show);
  React.useEffect(() => {
    showRef.current = show;
  }, [show]);
  
  const safeShow = React.useCallback((msg: string, t: "success" | "error" = "success") => {
    showRef.current(msg, t);
  }, []); // Sin dependencias: siempre usa la referencia más reciente
  
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
    let mounted = true;
    const ac = new AbortController();
    
    listVendors({ page: 1, size: 100 })
      .then(r => {
        if (!mounted || ac.signal.aborted) return;
        setVendors(r.data);
      })
      .catch(err => {
        // Ignorar AbortError (cancelaciones esperadas)
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          return;
        }
        if (!mounted || ac.signal.aborted) return;
        console.error('Error loading vendors:', err);
        safeShow('Error al cargar proveedores', 'error');
      });
    
    return () => {
      mounted = false;
      ac.abort();
    };
  }, []); // Sin dependencias: solo se ejecuta una vez al montar

  React.useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    const v = vendorId || undefined;
    
    listProducts({ vendor_id: v as any, page: 1, size: 100 })
      .then(r => {
        if (!mounted || ac.signal.aborted) return;
        setProducts(r.data);
      })
      .catch(err => {
        // Ignorar AbortError (cancelaciones esperadas)
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          return;
        }
        if (!mounted || ac.signal.aborted) return;
        console.error('Error loading products:', err);
        safeShow('Error al cargar productos', 'error');
      });
    
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [vendorId]); // Solo depende de vendorId

  React.useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    const p = productId || undefined;
    
    listPlans({ product_id: p as any, page: 1, size: 100 })
      .then(r => {
        if (!mounted || ac.signal.aborted) return;
        setPlans(r.data);
      })
      .catch(err => {
        // Ignorar AbortError (cancelaciones esperadas)
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
          return;
        }
        if (!mounted || ac.signal.aborted) return;
        console.error('Error loading plans:', err);
        safeShow('Error al cargar planes', 'error');
      });
    
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [productId]); // Solo depende de productId

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
    } catch (err: any) {
      // Ignorar AbortError (cancelaciones esperadas)
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        return;
      }
      console.error('Error loading licenses:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al cargar licencias';
      safeShow(errorMsg, 'error');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [code, vendorId, productId, planId, page, size, safeShow]);

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
            Licencias
          </h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Gestiona las licencias disponibles en el sistema.
          </p>
        </div>
        <Button
          onClick={() => nav('/licenses/nuevo')}
          className="
            inline-flex items-center gap-2 rounded-xl
            bg-[#208692] hover:bg-[#164F5B] text-white
            transition-colors duration-200 shadow-sm
            px-4 py-2.5 text-sm font-semibold
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
          "
        >
          Nueva
        </Button>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Código</label>
          <Input value={code} onChange={e => setCode(e.target.value)} placeholder="ABC-123..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Proveedor</label>
          <select className="w-full border rounded h-9 px-2" value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Producto</label>
          <select className="w-full border rounded h-9 px-2" value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Plan</label>
          <select className="w-full border rounded h-9 px-2" value={planId} onChange={e => setPlanId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {plans.map(pl => <option key={pl.plan_id} value={pl.plan_id}>{pl.plan_name}</option>)}
          </select>
        </div>
        <div>
          <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Filtrar</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 text-left bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
            <tr className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Capacidad</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.license_id}
                className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 hover:shadow-sm`}
              >
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.code || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.plan_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.product_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.vendor_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]"><LicenseCapacityIndicator total={r.seats_total} inUse={r.seats_in_use} /></td>
                <td className="px-4 py-3 text-sm text-[#26272A] text-right">
                  <Button size="sm" variant="ghost" onClick={() => nav(`/licenses/${r.license_id}/editar`)}>Editar</Button>
                </td>
              </tr>
            ))}
            {loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-[#527779]" colSpan={6}>
                  Cargando...
                </td>
              </tr>
            )}
            {!rows.length && !loading && (
              <tr><td className="px-4 py-3 text-sm text-[#527779]" colSpan={6}>No hay licencias registradas</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[#26272A]">
        <div>Mostrando {rows.length} de {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page<=1 || loading} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
          <div>Página {page}</div>
          <Button variant="outline" disabled={(page*size)>=total || loading} onClick={() => setPage(p => p+1)}>Siguiente</Button>
        </div>
      </div>
      <Toast />
    </div>
  );
}


