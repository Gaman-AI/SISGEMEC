import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { listSolicitudesAdmin, setSolicitudEstado } from "@/data/solicitudes.repository";
import type { SolicitudRow } from "@/data/solicitudes.types";
import { PAGE_SIZE_SOLICITUDES } from "@/data/solicitudes.types";
import { useAuth } from "@/auth/auth.store";
import ConvertirSolicitudModal from "./components/ConvertirSolicitudModal";

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
  const { state } = useAuth();

  const [rows, setRows] = React.useState<SolicitudRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [estadoId, setEstadoId] = React.useState<number | undefined>(undefined);

  const [actingId, setActingId] = React.useState<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalSolicitudId, setModalSolicitudId] = React.useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE_SOLICITUDES));

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[SolicitudesDeServicioList] Cargando solicitudes...');
      }
      
      const { data, count: c, error: e } = await listSolicitudesAdmin({
        page,
        pageSize: PAGE_SIZE_SOLICITUDES,
        search: search.trim() || undefined,
        estadoId,
        fromDate: undefined,
        toDate: undefined,
      });
      if (signal?.aborted) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[SolicitudesDeServicioList] Carga abortada');
        }
        return;
      }
      if (e) throw e;
      setRows(data);
      setCount(c);
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[SolicitudesDeServicioList] Solicitudes cargadas:', data?.length || 0);
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      if (process.env.NODE_ENV === 'development') {
        console.debug('[SolicitudesDeServicioList] Error cargando:', e?.message);
      }
      setError(e?.message || "Error al cargar");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [page, search, estadoId]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleSetEstado = async (id: number, next: number, label: string) => {
    if (!window.confirm(`¿Confirmas cambiar estado a "${label}"?`)) return;
    setActingId(id);
    const { ok, error } = await setSolicitudEstado(id, next as any);
    if (!ok) { show(error?.message || "No se pudo actualizar estado", "error"); return; }
    show("Estado actualizado");
    await load();
    setActingId(null);
  };

  const onOpenConvert = (id: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SolicitudesDeServicioList] Abriendo modal para solicitud:', id);
    }
    setModalSolicitudId(id);
    setModalOpen(true);
  };

  const handleConverted = (servicioId: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SolicitudesDeServicioList] Conversión exitosa, navegando a servicio:', servicioId);
    }
    show("Solicitud convertida. Servicio #" + servicioId);
    load(); // Recargar la lista para actualizar estados
    navigate(`/servicios/${servicioId}/editar`);
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
            <Button variant="outline" className="rounded-xl" onClick={() => load()}>Aplicar</Button>
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
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 2, "En revisión")} disabled={actingId === r.solicitud_id}>En revisión</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 3, "Aprobada")} disabled={actingId === r.solicitud_id}>Aprobar</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => handleSetEstado(r.solicitud_id, 4, "Rechazada")} disabled={actingId === r.solicitud_id}>Rechazar</Button>
                      <Button className="rounded-xl" onClick={() => onOpenConvert(r.solicitud_id)} disabled={loading}>Convertir a servicio</Button>
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
          <button className="rounded-lg border border-gray-300 px-3 py-1.5" onClick={() => load()}>Refrescar</button>
        </div>
      </div>

      <Toast />

      {/* Modal de conversión */}
      {state.status === "authenticated" && (
        <ConvertirSolicitudModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          solicitudId={modalSolicitudId}
          adminId={state.profile.user_id}
          onConverted={handleConverted}
        />
      )}
    </div>
  );
}