import * as React from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { listMyAssignments } from '@/data/licenses.repository';
import type { Assignment } from '@/data/licenses.types';
import AssignmentStatusBadge from '@/components/licenses/AssignmentStatusBadge';

export default function MyLicensesList() {
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<Assignment[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMyAssignments({ page: 1, size: 100 });
      setRows(res.data);
    } catch (e) { 
      console.error('Error loading my assignments:', e);
      setRows([]);
    } finally { 
      setLoading(false); 
    }
  }, []);

  React.useEffect(() => { 
    void load(); 
  }, [load]);

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'RESPONSABLE')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Mis Licencias</h1>
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="text-left p-2">Licencia</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Asignada</th>
              <th className="text-left p-2">Revocada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.assignment_id} className="border-b hover:bg-slate-50">
                <td className="p-2">{r.license_code || r.license_id}</td>
                <td className="p-2">{r.plan_name || '-'}</td>
                <td className="p-2"><AssignmentStatusBadge status={r.status} /></td>
                <td className="p-2">{new Date(r.assigned_at).toLocaleDateString()}</td>
                <td className="p-2">{r.revoked_at ? new Date(r.revoked_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-3 text-slate-500" colSpan={5}>No tienes licencias asignadas</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}


