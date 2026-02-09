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
    try {
      const res = await listTiposServicio({ page, pageSize, search, active });
      if (res.error) {
        setError(res.error.message || "Error al listar");
        setRows([]);
        setCount(0);
      } else {
        setRows(res.data);
        setCount(res.count);
      }
    } catch (e: any) {
      setError(e?.message || "Error al listar");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false); // 🔑 garantizado
    }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">Tipos de Servicio</h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Administra los tipos de servicio disponibles en el sistema.
          </p>
        </div>
        <Button onClick={() => navigate('/tipos-servicio/nuevo')} className="
          group inline-flex items-center gap-2 rounded-xl
          bg-[#208692] hover:bg-[#164F5B] text-white
          transition-colors duration-200 shadow-sm
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
          px-4 py-2.5 text-sm font-semibold
        ">
          + Nuevo tipo
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Search className="h-4 w-4" /></span>
          <input
            className="h-11 w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400"
            placeholder="Buscar por nombre o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
        </div>
        <select
          className="h-11 w-full rounded-xl border border-gray-300 bg-white text-gray-900 px-3 text-sm shadow-sm outline-none focus:border-gray-400"
          value={active === '' ? '' : active ? '1' : '0'}
          onChange={(e) => {
            const v = e.target.value;
            setActive(v === '' ? '' : v === '1');
            setPage(1);
          }}
        >
          <option value="" className="bg-white text-gray-900">Todos</option>
          <option value="1" className="bg-white text-gray-900">Activos</option>
          <option value="0" className="bg-white text-gray-900">Inactivos</option>
        </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-[#CFD0BF] bg-slate-100/90 text-left text-[#26272A] backdrop-blur">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="w-[190px] px-4 py-3 text-right">Acciones</th>
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
                    className="border-t border-gray-100 transition hover:bg-slate-50 hover:shadow-sm even:bg-gray-50/60"
                  >
                    <td className="px-4 py-3">{r.nombre}</td>
                    <td className="px-4 py-3">{r.descripcion ?? '-'}</td>
                    <td className="px-4 py-3"><BadgeActive active={r.activo} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/tipos-servicio/${r.tipo_servicio_id}/editar`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#164F5B] bg-transparent hover:bg-[#E5EADF] transition-colors"
                        >
                          <PencilLine className="h-4 w-4" />
                          Editar
                        </Link>
                        <button
                          onClick={() => onToggle(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#527779] bg-transparent hover:bg-[#E5EADF] transition-colors"
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
        <div className="text-[#26272A]">Página {page} de {totalPages} · {count} registros</div>
        <div className="space-x-2">
          <button
            className="rounded-lg border border-[#CFD0BF] px-3 py-1.5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-[#CFD0BF] px-3 py-1.5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
          <button className="rounded-lg border border-[#CFD0BF] px-3 py-1.5" onClick={load}>
            Refrescar
          </button>
        </div>
      </div>

      <Toast />
    </div>
  );
}


