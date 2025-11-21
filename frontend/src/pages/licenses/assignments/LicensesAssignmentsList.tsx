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

export default function LicensesAssignmentsList() {
  const nav = useNavigate();
  const { state } = useAuth();
  const { show, Toast } = useToast();
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
    } catch (err: any) {
      console.error('Error loading assignments:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al cargar asignaciones';
      show(errorMsg, 'error');
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
      show('Asignación revocada correctamente');
      await load();
    } catch (err: any) {
      console.error('Error revoking assignment:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al revocar asignación';
      show(errorMsg, 'error');
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
            Asignaciones
          </h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Consulta y administra las asignaciones de licencias a usuarios.
          </p>
        </div>
        <Button
          onClick={() => nav('/licenses/assignments/asignar')}
          className="
            inline-flex items-center gap-2 rounded-xl
            bg-[#208692] hover:bg-[#164F5B] text-white
            transition-colors duration-200 shadow-sm
            px-4 py-2.5 text-sm font-semibold
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
          "
        >
          Asignar
        </Button>
      </div>
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">License ID</label>
          <Input value={licenseId} onChange={e => setLicenseId(e.target.value)} placeholder="" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">User ID</label>
          <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="uuid" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#26272A] mb-1">Estado</label>
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

      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 text-left bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
            <tr className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
              <th className="px-4 py-3 font-semibold">Licencia</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Asignada</th>
              <th className="px-4 py-3 font-semibold">Revocada</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
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
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.user_full_name || r.user_email || r.user_id}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]"><AssignmentStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{new Date(r.assigned_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-[#26272A]">{r.revoked_at ? new Date(r.revoked_at).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-sm text-[#26272A] text-right">
                  {r.status === 'active' && (
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
                      onClick={() => onRevoke(r.assignment_id)}
                    >
                      Revocar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-[#527779]" colSpan={7}>
                  Cargando...
                </td>
              </tr>
            )}
            {!rows.length && !loading && (
              <tr><td className="px-4 py-3 text-sm text-[#527779]" colSpan={7}>No hay asignaciones registradas</td></tr>
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


