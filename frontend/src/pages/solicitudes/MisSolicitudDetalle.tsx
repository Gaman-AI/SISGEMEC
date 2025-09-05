import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getSolicitudById } from "@/data/solicitudes.repository";
import type { SolicitudRow } from "@/data/solicitudes.types";
import { ESTADOS_SOLICITUD_LABEL } from "@/data/solicitudes.types";

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
    }, 3000);
  };
  const Toast = () =>
    msg ? (
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${
          type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function MisSolicitudDetalle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { show, Toast } = useToast();

  const [row, setRow] = React.useState<SolicitudRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id || Number.isNaN(Number(id))) {
          throw new Error("ID inválido");
        }
        const { data, error } = await getSolicitudById(Number(id));
        if (error) throw error;
        setRow(data ?? null);
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar la solicitud");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fecha = row?.created_at ? new Date(row.created_at).toLocaleDateString() : "-";
  const estadoLabel =
    (row?.estado_solicitud_nombre ??
      (row ? ESTADOS_SOLICITUD_LABEL[row.estado_solicitud_id] : undefined)) ??
    (row ? String(row.estado_solicitud_id) : "-");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalle de solicitud</h1>
          <p className="text-sm text-slate-600">Consulta el estado y la información enviada.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/mis-solicitudes")}>
            Volver
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-600">Cargando…</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-rose-600">{error}</div>
        ) : !row ? (
          <div className="py-8 text-center text-sm text-slate-600">No se encontró la solicitud.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Folio</div>
              <div className="text-sm font-medium">#{row.solicitud_id}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Fecha</div>
              <div className="text-sm font-medium">{fecha}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">Equipo</div>
              <div className="text-sm font-medium">{row.equipo_label ?? `Equipo #${row.equipo_id}`}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">Descripción</div>
              <div className="text-sm">{row.descripcion || "-"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Estado</div>
              <div className="mt-1">
                {/* ⬇️ Pill neutra (sin estadoSolicitudPillClasses) */}
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                  {estadoLabel}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Servicio vinculado</div>
              <div className="text-sm">
                {row.servicio_id ? (
                  <button
                    className="underline underline-offset-2 hover:text-slate-700"
                    onClick={() => navigate(`/servicios/${row.servicio_id}/editar`)}
                  >
                    Servicio #{row.servicio_id}
                  </button>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast />
    </div>
  );
}


