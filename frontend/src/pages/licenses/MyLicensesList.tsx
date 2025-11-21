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
    <div className="p-4 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Mis Licencias
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Visualiza las licencias que tienes asignadas en el sistema.
        </p>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 text-left bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
            <tr className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
              <th className="px-4 py-3 font-semibold">Licencia</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Asignada</th>
              <th className="px-4 py-3 font-semibold">Revocada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.assignment_id}
                className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 hover:shadow-sm`}
              >
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.license_code || r.license_id}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.plan_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]"><AssignmentStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{new Date(r.assigned_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.revoked_at ? new Date(r.revoked_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="px-4 py-3 text-sm text-[#527779]" colSpan={5}>No tienes licencias asignadas</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}


