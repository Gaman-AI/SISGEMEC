import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listAssignments, revokeAssignment } from '@/data/licenses.repository';
import type { Assignment, AssignmentFilters } from '@/data/licenses.types';
import AssignmentStatusBadge from '@/components/licenses/AssignmentStatusBadge';

export default function LicensesAssignmentsList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [licenseId, setLicenseId] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [rows, setRows] = React.useState<Assignment[]>([]);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: AssignmentFilters = {
        license_id: licenseId ? Number(licenseId) : undefined,
        user_id: userId || undefined,
        status: status ? (status as any) : undefined,
        page, size
      };
      const res = await listAssignments(filters);
      setRows(res.data); 
      setTotal(res.total);
    } catch (e) {
      console.error('Error loading assignments:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [licenseId, userId, status, page, size]);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  async function onRevoke(id: number) {
    if (!confirm('¿Revocar asignación?')) return;
    try {
      await revokeAssignment(id);
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
        <h1 className="text-xl font-semibold">Asignaciones</h1>
        <Button onClick={() => nav('/licenses/assignments/asignar')}>Asignar</Button>
      </div>
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">License ID</label>
          <Input value={licenseId} onChange={e => setLicenseId(e.target.value)} placeholder="" />
        </div>
        <div>
          <label className="block text-sm mb-1">User ID</label>
          <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="uuid" />
        </div>
        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select className="w-full border rounded h-9 px-2" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="active">Activa</option>
            <option value="revoked">Revocada</option>
            <option value="expired">Vencida</option>
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
              <th className="text-left p-2">Licencia</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Usuario</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Asignada</th>
              <th className="text-left p-2">Revocada</th>
              <th className="text-right p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.assignment_id} className="border-b hover:bg-slate-50">
                <td className="p-2">{r.license_code || r.license_id}</td>
                <td className="p-2">{r.plan_name || '-'}</td>
                <td className="p-2">{r.user_full_name || r.user_email || r.user_id}</td>
                <td className="p-2"><AssignmentStatusBadge status={r.status} /></td>
                <td className="p-2">{new Date(r.assigned_at).toLocaleDateString()}</td>
                <td className="p-2">{r.revoked_at ? new Date(r.revoked_at).toLocaleDateString() : '-'}</td>
                <td className="p-2 text-right">
                  {r.status === 'active' && (
                    <Button size="sm" variant="destructive" onClick={() => onRevoke(r.assignment_id)}>Revocar</Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-3 text-slate-500" colSpan={7}>Sin resultados</td></tr>
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


