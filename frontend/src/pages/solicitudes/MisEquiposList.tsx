// frontend/src/pages/solicitudes/MisEquiposList.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { listEquiposPropiosLite } from "@/data/solicitudes.repository";
import type { EquipoLite } from "@/data/solicitudes.types";
import { buildEquipoLabel } from "@/data/solicitudes.types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/auth.store";

function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"success" | "error" | null>(null);
  const show = (m: string, t: "success" | "error" = "success") => {
    setMsg(m);
    setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => { setMsg(null); setType(null); }, 3000);
  };
  const Toast = () => msg ? (
    <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{msg}</div>
  ) : null;
  return { show, Toast };
}

export default function MisEquiposList() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const { state } = useAuth();
  const [rows, setRows] = React.useState<EquipoLite[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (state.status !== "authenticated") return;
    (async () => {
      try {
        setLoading(true);
        const userId = state.profile.user_id;
        const { data, error } = await listEquiposPropiosLite(userId);
        if (error) throw error;
        setRows(data);
      } catch (e: any) {
        show(e?.message || "No se pudieron cargar equipos", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [show, state]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Mis equipos</h1>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-slate-100/90 text-left text-gray-700 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={2}>Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={2}>No tienes equipos asignados.</td></tr>
              ) : rows.map((e) => (
                <tr key={e.equipo_id} className="border-t hover:bg-gray-50/80 even:bg-gray-50/60">
                  <td className="px-4 py-3">{buildEquipoLabel(e)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button className="rounded-xl" onClick={() => navigate(`/mis-solicitudes/nueva?equipo_id=${e.equipo_id}`)}>
                      Solicitar servicio
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast />
    </div>
  );
}



