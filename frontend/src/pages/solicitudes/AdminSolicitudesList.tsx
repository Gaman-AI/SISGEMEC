import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";

/** ⬇️ Usa los repos y tipos con imports RELATIVOS para evitar problemas de alias */
import { listSolicitudesAdmin } from "../../data/solicitudes.repository";
import {
  PAGE_SIZE_SOLICITUDES,
  ESTADOS_SOLICITUD_LABEL,
  type SolicitudRow,
} from "../../data/solicitudes.types";

/** Toast local sencillo */
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
      <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${
        type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
      }`}>
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function AdminSolicitudesList() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [estadoId, setEstadoId] = React.useState<number | "">("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<SolicitudRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const pageSize = PAGE_SIZE_SOLICITUDES;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await listSolicitudesAdmin({
        page,
        pageSize,
        search: search.trim() || undefined,
        estadoId: estadoId === "" ? undefined : Number(estadoId),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      if (error) throw error;
      setRows(data);
      setCount(count);
    } catch (e: any) {
      show(e?.message || "No se pudo cargar las solicitudes", "error");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, estadoId, fromDate, toDate, show]);

  React.useEffect(() => { void load(); }, [load]);

  const resetFilters = () => {
    setSearch("");
    setEstadoId("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de servicio</h1>
          <p className="mt-1 text-sm text-slate-600">Listado de solicitudes enviadas por responsables.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl" onClick={() => navigate("/servicios")}>
            Ir a Servicios
          </Button>
          <Button className="rounded-xl" onClick={load} disabled={loading}>
            {loading ? "Cargando…" : "Refrescar"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Buscar</label>
            <input
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm shadow-sm outline-none"
              placeholder="Descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setPage(1)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
            <select
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none"
              value={estadoId}
              onChange={(e) => { setEstadoId(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}
            >
              <option value="">Todos</option>
              {Object.entries(ESTADOS_SOLICITUD_LABEL).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Desde</label>
              <input type="date" className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm shadow-sm outline-none"
                value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hasta</label>
              <input type="date" className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm shadow-sm outline-none"
                value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(search || estadoId !== "" || fromDate || toDate) && (
            <Button variant="ghost" className="rounded-xl" onClick={resetFilters}>Limpiar filtros</Button>
          )}
          <div className="ml-auto text-sm text-slate-500">
            {count} resultado{count === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur border-b">
              <tr className="text-left">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>
              )}

              {rows.map((r) => {
                const d = new Date(r.created_at);
                const fecha = isNaN(d.getTime()) ? r.created_at : d.toISOString().slice(0, 10);
                return (
                  <tr key={r.solicitud_id} className="odd:bg-slate-50 hover:bg-slate-100/70">
                    <td className="px-4 py-3">{fecha}</td>
                    <td className="px-4 py-3">{r.equipo_label ?? `Equipo #${r.equipo_id}`}</td>
                    <td className="px-4 py-3">{r.solicitante_nombre ?? r.solicitante_id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                        style={{ borderColor: "#94a3b8", background: "#f1f5f9" }}>
                        {r.estado_solicitud_nombre ?? ESTADOS_SOLICITUD_LABEL[r.estado_solicitud_id] ?? r.estado_solicitud_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span title={r.descripcion ?? ""}>
                        {(r.descripcion ?? "").slice(0, 120)}{(r.descripcion && r.descripcion.length > 120) ? "…" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2">
          <div className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button variant="ghost" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Toast />
    </div>
  );
}
