import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/auth/auth.store';
import { isAuthenticated, hasRole } from '@/auth/guards';
import { getAssignment } from '@/data/licenses.repository';
import type { Assignment } from '@/data/licenses.types';
import AssignmentStatusBadge from '@/components/licenses/AssignmentStatusBadge';

export default function MyLicenseDetail() {
  const { id } = useParams();
  const { state } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [row, setRow] = React.useState<Assignment | null>(null);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAssignment(Number(id))
      .then(setRow)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (state.status === 'loading') return <div className="p-4">Cargando...</div>;
  if (!isAuthenticated(state)) return <div className="p-4">No autorizado</div>;
  if (!hasRole(state, 'RESPONSABLE')) return <div className="p-4">No autorizado</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Licencia</h1>
      {row && (
        <Card className="p-4 space-y-2">
          <div><span className="text-slate-500">Código:</span> {row.license_code || row.license_id}</div>
          <div><span className="text-slate-500">Plan:</span> {row.plan_name || '-'}</div>
          <div><span className="text-slate-500">Estado:</span> <AssignmentStatusBadge status={row.status} /></div>
          <div><span className="text-slate-500">Asignada:</span> {new Date(row.assigned_at).toLocaleString()}</div>
          <div><span className="text-slate-500">Revocada:</span> {row.revoked_at ? new Date(row.revoked_at).toLocaleString() : '-'}</div>
          <div><span className="text-slate-500">Notas:</span> {row.notes || '-'}</div>
        </Card>
      )}
      {!row && !loading && <div className="text-slate-500">No encontrada</div>}
    </div>
  );
}


