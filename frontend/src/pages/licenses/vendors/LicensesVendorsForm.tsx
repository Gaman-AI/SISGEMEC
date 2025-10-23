import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { createVendor, getVendor, updateVendor } from '@/data/licenses.repository';
import type { VendorCreate } from '@/data/licenses.types';

export default function LicensesVendorsForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getVendor(Number(id))
      .then(v => { setName(v.name); setWebsite(v.website || ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!name.trim()) { setErrors({ name: 'Nombre requerido' }); return; }
    setLoading(true);
    try {
      const body: VendorCreate = { name: name.trim(), website: website.trim() || null };
      if (isEdit) await updateVendor(Number(id), body);
      else await createVendor(body);
      nav('/licenses/vendors');
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 422 && err?.response?.data) {
        setErrors(err.response.data);
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
        <h1 className="text-xl font-semibold">{isEdit ? 'Editar' : 'Nuevo'} Proveedor</h1>
      </div>
      <Card className="p-4 max-w-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nombre</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del proveedor" />
            {errors.name && <div className="text-sm text-red-600 mt-1">{errors.name}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>{isEdit ? 'Guardar' : 'Crear'}</Button>
            <Button type="button" variant="outline" onClick={() => nav('/licenses/vendors')}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


