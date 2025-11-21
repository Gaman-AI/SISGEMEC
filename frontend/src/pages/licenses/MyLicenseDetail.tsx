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
    <div className="p-4 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Licencia
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Consulta el detalle y vigencia de esta licencia.
        </p>
      </div>
      {row && (
        <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-6 shadow-sm space-y-3">
          <div><span className="text-[#527779] font-medium">Código:</span> <span className="text-[#26272A]">{row.license_code || row.license_id}</span></div>
          <div><span className="text-[#527779] font-medium">Plan:</span> <span className="text-[#26272A]">{row.plan_name || '-'}</span></div>
          <div><span className="text-[#527779] font-medium">Estado:</span> <AssignmentStatusBadge status={row.status} /></div>
          <div><span className="text-[#527779] font-medium">Asignada:</span> <span className="text-[#26272A]">{new Date(row.assigned_at).toLocaleString()}</span></div>
          <div><span className="text-[#527779] font-medium">Revocada:</span> <span className="text-[#26272A]">{row.revoked_at ? new Date(row.revoked_at).toLocaleString() : '-'}</span></div>
          <div><span className="text-[#527779] font-medium">Notas:</span> <span className="text-[#26272A]">{row.notes || '-'}</span></div>
        </Card>
      )}
      {!row && !loading && <div className="text-[#527779]">No encontrada</div>}
    </div>
  );
}


