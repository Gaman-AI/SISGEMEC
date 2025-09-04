import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { listTiposServicio, toggleTipoServicioActivo } from "../../data/tipos-servicio.repository";
import type { TipoServicioRow } from "../../data/tipos-servicio.types";
import BadgeActive from "../../components/BadgeActive";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Search, PencilLine } from "lucide-react";

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

export default function TiposServicioList() {
  const { show, Toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = React.useState<TipoServicioRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [active, setActive] = React.useState<'' | boolean>('');

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listTiposServicio({ page, pageSize, search, active });
    if (res.error) {
      setError(res.error.message || "Error al listar");
      setRows([]);
      setCount(0);
    } else {
      setRows(res.data);
      setCount(res.count);
    }
    setLoading(false);
  }, [page, pageSize, search, active]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onToggle = async (r: TipoServicioRow) => {
    const ok = await ConfirmDialog({
      title: r.activo ? "Desactivar tipo de servicio" : "Activar tipo de servicio",
      description: `¿Confirmas ${r.activo ? 'desactivar' : 'activar'} "${r.nombre}"?`,
    });
    if (!ok) return;
    try {
      await toggleTipoServicioActivo(r.tipo_servicio_id, !r.activo);
      load();
    } catch (e: any) {
      show(e?.message ?? "No se pudo actualizar", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Tipos de Servicio</h1>
        <Button onClick={() => navigate('/tipos-servicio/nuevo')} className="rounded-xl">
          + Nuevo tipo
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Search className="h-4 w-4" /></span>
          <input
            className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
            placeholder="Buscar por nombre o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
        </div>
        <select
          className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
          value={active === '' ? '' : active ? '1' : '0'}
          onChange={(e) => {
            const v = e.target.value;
            setActive(v === '' ? '' : v === '1');
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-slate-100/90 text-left text-gray-700 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={4}>Cargando…</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-8 text-center text-rose-600" colSpan={4}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={4}>No hay registros.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.tipo_servicio_id}
                    className="border-t border-gray-100 transition hover:bg-gray-50/80 even:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/5 dark:even:bg-white/5"
                  >
                    <td className="px-4 py-3">{r.nombre}</td>
                    <td className="px-4 py-3">{r.descripcion ?? '-'}</td>
                    <td className="px-4 py-3"><BadgeActive active={r.activo} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/tipos-servicio/${r.tipo_servicio_id}/editar`}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          <PencilLine className="mr-1 inline h-3.5 w-3.5" />
                          Editar
                        </Link>
                        <button
                          onClick={() => onToggle(r)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                            r.activo
                              ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {r.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm">
        <div>Página {page} de {totalPages} · {count} registros</div>
        <div className="space-x-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-gray-700" onClick={load}>
            Refrescar
          </button>
        </div>
      </div>

      <Toast />
    </div>
  );
}


