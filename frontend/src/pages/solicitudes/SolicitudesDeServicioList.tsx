import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { listSolicitudesAdmin, setSolicitudEstado, convertirSolicitudEnServicio, listTiposServicioLite } from "@/data/solicitudes.repository";
import type { SolicitudRow } from "@/data/solicitudes.types";
import { PAGE_SIZE_SOLICITUDES } from "@/data/solicitudes.types";

function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"success" | "error" | null>(null);
  const show = (m: string, t: "success" | "error" = "success") => {
    setMsg(m); setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => { setMsg(null); setType(null); }, 3000);
  };
  const Toast = () => msg ? (
    <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{msg}</div>
  ) : null;
  return { show, Toast };
}

export default function SolicitudesDeServicioList() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const [rows, setRows] = React.useState<SolicitudRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [estadoId, setEstadoId] = React.useState<number | undefined>(undefined);

  const [tipos, setTipos] = React.useState<Array<{ tipo_servicio_id: number; nombre: string }>>([]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE_SOLICITUDES));

  const loadTipos = React.useCallback(async () => {
    const { data } = await listTiposServicioLite();
    setTipos(data ?? []);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count: c, error: e } = await listSolicitudesAdmin({
        page,
        pageSize: PAGE_SIZE_SOLICITUDES,
        search: search.trim() || undefined,
        estadoId,
        fromDate: undefined,
        toDate: undefined,
      });
      if (e) throw e;
      setRows(data);
      setCount(c);
    } catch (e: any) {
      setError(e?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [page, search, estadoId]);

  React.useEffect(() => { loadTipos(); }, [loadTipos]);
  React.useEffect(() => { load(); }, [load]);

  const handleSetEstado = async (id: number, next: number, label: string) => {
    if (!window.confirm(`¿Confirmas cambiar estado a "${label}"?`)) return;
    const { ok, error } = await setSolicitudEstado(id, next as any);
    if (!ok) { show(error?.message || "No se pudo actualizar estado", "error"); return; }
    show("Estado actualizado");
    load();
  };

  const handleConvertir = async (row: SolicitudRow) => {
    // pedir tipo de servicio (simple prompt) — en prod puedes usar un modal/selector
    if (!tipos || tipos.length === 0) {
      show("No hay tipos de servicio activos", "error");
      return;
    }
    const opciones = tipos.map(t => `${t.tipo_servicio_id} - ${t.nombre}`).join("\n");
    const entrada = window.prompt(`Elige tipo_servicio_id:\n${opciones}\n\nEscribe el ID del tipo:`);
    const tipoId = Number(entrada);
    if (!tipoId || Number.isNaN(tipoId)) return;

    // admin actual — en integración real, obtener de sesión
    const adminId = (window as any).__currentUserId;
    if (!adminId) { show("No hay admin logueado (adminId)", "error"); return; }

    const { ok, servicio_id, error } = await convertirSolicitudEnServicio({
      solicitudId: row.solicitud_id,
      tipoServicioId: tipoId,
      adminId,
      fechaServicio: undefined,
      observaciones: null,
    });

    if (!ok || !servicio_id) {
      show(error?.message || "No se pudo convertir", "error");
      return;
    }
    show(`Convertido a servicio #${servicio_id}`);
    // navegar a editar servicio
    navigate(`/servicios/${servicio_id}/editar`);
  };

  const pill = (label: string) => (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
      {label}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Solicitudes de servicio</h1>
          <p className="mt-1 text-sm text-slate-600">
            Revisa, cambia estado y convierte solicitudes en servicios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/servicios")}>
            Volver a Servicios
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-gray-400"
            placeholder="Buscar en descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          />
          <select
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-gray-400"
            value={estadoId?.toString() || ""}
            onChange={(e) => { const v = e.target.value; setEstadoId(v ? Number(v) : undefined); setPage(1); }}
          >
            <option value="">Todos los estados</option>
            <option value="1">Enviada</option>
            <option value="2">En revisión</option>
            <option value="3">Aprobada</option>
            <option value="4">Rechazada</option>
            <option value="5">Convertida</option>
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={load}>Aplicar</Button>
            <Button variant="ghost" className="rounded-xl" onClick={() => { setSearch(""); setEstadoId(undefined); setPage(1); }}>Limpiar</Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-slate-100/90 text-left text-gray-700 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={6}>Cargando…</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-8 text-center text-rose-600" colSpan={6}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={6}>No hay solicitudes.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.solicitud_id} className="border-t hover:bg-gray-50/80 even:bg-gray-50/60">
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{r.equipo_label || `Equipo #${r.equipo_id}`}</td>
                  <td className="px-4 py-3">{r.solicitante_nombre || r.solicitante_id}</td>
                  <td className="px-4 py-3">{r.descripcion || "-"}</td>
                  <td className="px-4 py-3">{pill(r.estado_solicitud_nombre || String(r.estado_solicitud_id))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 2, "En revisión")}>En revisión</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 3, "Aprobada")}>Aprobar</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 4, "Rechazada")}>Rechazar</Button>
                      <Button className="rounded-xl" onClick={() => handleConvertir(r)}>Convertir a servicio</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm">
        <div>Página {page} de {totalPages} · {count} solicitudes</div>
        <div className="space-x-2">
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</button>
          <button className="rounded-lg border border-gray-300 px-3 py-1.5" onClick={load}>Refrescar</button>
        </div>
      </div>

      <Toast />
    </div>
  );
}