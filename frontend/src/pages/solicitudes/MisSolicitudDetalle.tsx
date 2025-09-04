import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getSolicitudById } from "@/data/solicitudes.repository";
import { estadoSolicitudPillClasses } from "@/data/solicitudes.types";

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

export default function MisSolicitudDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [row, setRow] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await getSolicitudById(Number(id));
      if (error) setError(error.message);
      setRow(data);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Detalle de solicitud</h1>
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
          <div className="text-sm text-slate-700">Descripción: {row.descripcion || '-'}</div>
          <div className="text-sm text-slate-700">Estado: <span className={estadoSolicitudPillClasses(row.estado_solicitud_id)}>{row.estado_solicitud_nombre}</span></div>
          {row.servicio_id ? (
            <div className="text-sm">Servicio vinculado: <Link to={`/servicios/${row.servicio_id}/editar`} className="text-blue-600 underline">Ver servicio</Link></div>
          ) : null}
        </div>
      )}
    </div>
  );
}


