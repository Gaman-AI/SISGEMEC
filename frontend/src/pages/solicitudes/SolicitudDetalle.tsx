import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSolicitudById, updateSolicitudEstado, linkSolicitudToServicio } from "@/data/solicitudes.repository";
import { ESTADOS_SOLICITUD_LABEL } from "@/data/solicitudes.types";
import { Button } from "@/components/ui/button";

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

export default function SolicitudDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [row, setRow] = React.useState<any>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await getSolicitudById(Number(id));
    if (error) setError(error.message);
    setRow(data);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const changeEstado = async (next: number, msg: string) => {
    if (!id) return;
    const { ok, error } = await updateSolicitudEstado(Number(id), next as any);
    if (error || !ok) return show(error?.message || "Error", "error");
    show(msg);
    load();
  };

  const convertirAServicio = async () => {
    if (!row) return;
    // Navegar a ServiciosForm con prefill por query (mínimo: equipo y descripción)
    const params = new URLSearchParams();
    params.set("equipo_id", String(row.equipo_id));
    if (row.descripcion) params.set("descripcion", row.descripcion);
    navigate(`/servicios/nuevo?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Solicitud</h1>
      {loading ? (
        <div className="rounded-2xl border p-6">Cargando…</div>
      ) : error ? (
        <div className="rounded-2xl border p-6 text-rose-600">{error}</div>
      ) : !row ? (
        <div className="rounded-2xl border p-6">No encontrada</div>
      ) : (
        <div className="space-y-4 rounded-2xl border p-6">
          <div className="text-sm text-slate-700">Fecha: {new Date(row.created_at || '').toLocaleString()}</div>
          <div className="text-sm text-slate-700">Equipo: {row.equipo_label}</div>
          <div className="text-sm text-slate-700">Responsable: {row.solicitante_nombre || '-'}</div>
          <div className="text-sm text-slate-700">Descripción: {row.descripcion || '-'}</div>
          <div className="text-sm text-slate-700">Estado: 
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 ml-2">
              {row.estado_solicitud_nombre}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => changeEstado(2, "Marcada en revisión")}>En revisión</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => changeEstado(3, "Solicitud aprobada")}>Aprobar</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => changeEstado(4, "Solicitud rechazada")}>Rechazar</Button>
            <Button className="rounded-xl" onClick={convertirAServicio}>Convertir a servicio</Button>
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}


