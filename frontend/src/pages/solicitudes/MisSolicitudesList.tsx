import React from "react";
import { useNavigate } from "react-router-dom";
import { listMisSolicitudes } from "@/data/solicitudes.repository";
import { PAGE_SIZE_SOLICITUDES, estadoSolicitudPillClasses } from "@/data/solicitudes.types";
import type { SolicitudRow } from "@/data/solicitudes.types";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

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

export default function MisSolicitudesList() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [rows, setRows] = React.useState<SolicitudRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE_SOLICITUDES));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const solicitanteId = (window as any).__currentUserId || "me";
      const { data, count: c, error: e } = await listMisSolicitudes({ page, pageSize: PAGE_SIZE_SOLICITUDES, search, solicitanteId: solicitanteId as string });
      if (e) throw e;
      setRows(data);
      setCount(c);
    } catch (e: any) {
      setError(e?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Mis solicitudes</h1>
        <Button className="rounded-xl" onClick={() => navigate("/mis-solicitudes/nueva")}>Nueva solicitud</Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-medium text-slate-700">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Search className="h-4 w-4" /></span>
            <input className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none focus:border-gray-400" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key==='Enter' && setPage(1)} />
          </div>
        </div>
        {(search) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Búsqueda: {search}
                <button onClick={() => setSearch("")} className="hover:text-blue-600"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button onClick={load} variant="outline" className="rounded-xl">Aplicar filtros</Button>
          <Button onClick={() => { setSearch(""); setPage(1); }} variant="ghost" className="rounded-xl">Limpiar</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-slate-100/90 text-left text-gray-700 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={5}>Cargando…</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-8 text-center text-rose-600" colSpan={5}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={5}>No hay solicitudes.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.solicitud_id} className="border-t hover:bg-gray-50/80 even:bg-gray-50/60">
                  <td className="px-4 py-3">{new Date(r.created_at || '').toLocaleDateString()}</td>
                  <td className="px-4 py-3">{r.equipo_label || '-'}</td>
                  <td className="px-4 py-3">{r.descripcion || '-'}</td>
                  <td className="px-4 py-3"><span className={estadoSolicitudPillClasses(r.estado_solicitud_id)}>{r.estado_solicitud_nombre || '-'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/mis-solicitudes/${r.solicitud_id}`)}>Ver</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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


