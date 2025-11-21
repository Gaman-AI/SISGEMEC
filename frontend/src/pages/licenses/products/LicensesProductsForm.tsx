import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createProduct, getProduct, updateProduct, listVendors } from '@/data/licenses.repository';
import type { ProductCreate, Vendor } from '@/data/licenses.types';
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

export default function LicensesProductsForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { state } = useAuth();
  const { show, Toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [vendorId, setVendorId] = React.useState<number | ''>('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    listVendors({ page: 1, size: 100 }).then(r => setVendors(r.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getProduct(Number(id))
      .then(p => { setVendorId(p.vendor_id); setName(p.name); setDescription(p.description || ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!vendorId) { setErrors({ vendor_id: 'Proveedor requerido' }); return; }
    if (!name.trim()) { setErrors({ name: 'Nombre requerido' }); return; }
    setLoading(true);
    try {
      const body: ProductCreate = { vendor_id: Number(vendorId), name: name.trim(), description: description.trim() || null };
      if (isEdit) await updateProduct(Number(id), body);
      else await createProduct(body);
      show('Producto guardado correctamente', 'success');
      nav('/licenses/products');
    } catch (err: any) {
      console.error('[LicensesProductsForm] Error guardando:', err);
      const { status, detail, data } = parseApiError(err);

      if (status === 409) {
        show(detail || 'Ya existe un producto con ese nombre para este proveedor', 'error');
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
          {isEdit ? 'Editar' : 'Nuevo'} Producto
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Registra o actualiza un producto de software.
        </p>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-6 shadow-sm max-w-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Proveedor</label>
            <select className="w-full border rounded h-9 px-2" value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Seleccione</option>
              {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
            </select>
            {errors.vendor_id && <div className="text-sm text-red-600 mt-1">{errors.vendor_id}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Nombre</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto" />
            {errors.name && <div className="text-sm text-red-600 mt-1">{errors.name}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#26272A] mb-1">Descripción</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción" />
          </div>
          <div className="flex items-center gap-2">
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
            <Button type="button" variant="outline" onClick={() => nav('/licenses/products')}>Cancelar</Button>
          </div>
        </form>
      </Card>
      <Toast />
    </div>
  );
}


