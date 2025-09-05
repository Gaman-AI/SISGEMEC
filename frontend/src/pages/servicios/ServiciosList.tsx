import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { listServicios } from "../../data/servicios.repository";
import type { ServicioRow } from "../../data/servicios.types";
import { estadoToPillClasses, PAGE_SIZE_SERVICIOS } from "../../data/servicios.types";
import { Button } from "@/components/ui/button";
import { Search, PencilLine, Calendar, Filter, X, ChevronDown } from "lucide-react";

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

type FancySelectProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

function FancySelect({ id, value, onChange, placeholder, icon, children }: FancySelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
          {icon}
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          h-11 w-full appearance-none rounded-xl
          border border-input bg-white
          ${icon ? "pl-10" : "pl-3"} pr-9
          text-sm shadow-sm outline-none
          transition-colors
          focus:border-gray-400 focus:ring-0
          dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600
        `}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
    </div>
  );
}

export default function ServiciosList() {
  const { show, Toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = React.useState<ServicioRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filtros
  const [search, setSearch] = React.useState("");
  const [estadoId, setEstadoId] = React.useState<number | undefined>(undefined);
  const [tipoId, setTipoId] = React.useState<number | undefined>(undefined);
  const [tecnicoId, setTecnicoId] = React.useState<string | undefined>(undefined);
  const [equipoId, setEquipoId] = React.useState<number | undefined>(undefined);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  // Catálogos
  const [estados, setEstados] = React.useState<Array<{ estado_servicio_id: number; nombre: string }>>([]);
  const [tipos, setTipos] = React.useState<Array<{ tipo_servicio_id: number; nombre: string }>>([]);
  const [tecnicos, setTecnicos] = React.useState<Array<{ user_id: string; full_name: string | null }>>([]);
  const [equipos, setEquipos] = React.useState<
    Array<{ equipo_id: number; tipo_equipo: string | null; marca: string | null; modelo: string | null; num_serie: string | null }>
  >([]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE_SERVICIOS));

  const loadCatálogos = React.useCallback(async () => {
    try {
      // Cargar catálogos en paralelo
      const [estadosRes, tiposRes, tecnicosRes, equiposRes] = await Promise.all([
        fetch("/api/estados-servicio")
          .then((r) => r.json())
          .catch(() => [
            { estado_servicio_id: 1, nombre: "Pendiente" },
            { estado_servicio_id: 2, nombre: "En atención" },
            { estado_servicio_id: 3, nombre: "Atendido" },
          ]),
        fetch("/api/tipos-servicio").then((r) => r.json()).catch(() => []),
        fetch("/api/tecnicos").then((r) => r.json()).catch(() => []),
        fetch("/api/equipos").then((r) => r.json()).catch(() => []),
      ]);

      setEstados(estadosRes);
      setTipos(tiposRes);
      setTecnicos(tecnicosRes);
      setEquipos(equiposRes);
    } catch (e) {
      console.error("Error cargando catálogos:", e);
    }
  }, []);

  const load = React.useCallback(
    async () => {
      setLoading(true);
      setError(null);

      const params = {
        page,
        pageSize: PAGE_SIZE_SERVICIOS,
        search: search.trim() || undefined,
        estadoId,
        tipoId,
        tecnicoId,
        equipoId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const res = await listServicios(params);
      if (res.error) {
        setError(res.error);
        setRows([]);
        setCount(0);
      } else {
        setRows(res.data);
        setCount(res.count);
      }
      setLoading(false);
    },
    [page, search, estadoId, tipoId, tecnicoId, equipoId, fromDate, toDate]
  );

  React.useEffect(() => {
    loadCatálogos();
  }, [loadCatálogos]);

  React.useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setSearch("");
    setEstadoId(undefined);
    setTipoId(undefined);
    setTecnicoId(undefined);
    setEquipoId(undefined);
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters = search || estadoId || tipoId || tecnicoId || equipoId || fromDate || toDate;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Servicios</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/solicitudes')}>
            Solicitudes de servicio
          </Button>
          <Button onClick={() => navigate('/servicios/nuevo')} className="rounded-xl">
            + Nuevo servicio
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-medium text-slate-700">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Búsqueda */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              placeholder="Buscar por equipo, descripción, técnico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setPage(1)}
            />
          </div>

          {/* Estado */}
          <FancySelect
            value={estadoId?.toString() || ""}
            onChange={(v) => {
              setEstadoId(v ? Number(v) : undefined);
              setPage(1);
            }}
            placeholder="Todos los estados"
            icon={<Filter className="h-4 w-4" />}
          >
            {estados.map((e) => (
              <option key={e.estado_servicio_id} value={e.estado_servicio_id}>
                {e.nombre}
              </option>
            ))}
          </FancySelect>

          {/* Tipo de servicio */}
          <FancySelect
            value={tipoId?.toString() || ""}
            onChange={(v) => {
              setTipoId(v ? Number(v) : undefined);
              setPage(1);
            }}
            placeholder="Todos los tipos"
            icon={<Filter className="h-4 w-4" />}
          >
            {tipos.map((t) => (
              <option key={t.tipo_servicio_id} value={t.tipo_servicio_id}>
                {t.nombre}
              </option>
            ))}
          </FancySelect>

          {/* Administrador asignado */}
          <FancySelect
            value={tecnicoId || ""}
            onChange={(v) => {
              setTecnicoId(v || undefined);
              setPage(1);
            }}
            placeholder="Todos los administradores"
            icon={<Filter className="h-4 w-4" />}
          >
            {tecnicos.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.full_name || "Sin nombre"}
              </option>
            ))}
          </FancySelect>

          {/* Equipo */}
          <FancySelect
            value={equipoId?.toString() || ""}
            onChange={(v) => {
              setEquipoId(v ? Number(v) : undefined);
              setPage(1);
            }}
            placeholder="Todos los equipos"
            icon={<Filter className="h-4 w-4" />}
          >
            {equipos.map((e) => (
              <option key={e.equipo_id} value={e.equipo_id}>
                {[e.tipo_equipo, e.marca, e.modelo, e.num_serie].filter(Boolean).join(" - ")}
              </option>
            ))}
          </FancySelect>

          {/* Fecha desde */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Fecha hasta */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Chips de filtros activos */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-slate-600">Filtros activos:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Búsqueda: {search}
                <button onClick={() => setSearch("")} className="hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {estadoId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Estado: {estados.find((e) => e.estado_servicio_id === estadoId)?.nombre}
                <button onClick={() => setEstadoId(undefined)} className="hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {tipoId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Tipo: {tipos.find((t) => t.tipo_servicio_id === tipoId)?.nombre}
                <button onClick={() => setTipoId(undefined)} className="hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {tecnicoId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Admin asignado: {tecnicos.find((t) => t.user_id === tecnicoId)?.full_name}
                <button onClick={() => setTecnicoId(undefined)} className="hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {equipoId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Equipo: {equipos.find((e) => e.equipo_id === equipoId)?.num_serie}
                <button onClick={() => setEquipoId(undefined)} className="hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                Fechas: {fromDate || "..."} - {toDate || "..."}
                <button
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Limpiar todos
            </button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-4 flex gap-2">
          <Button onClick={load} variant="outline" className="rounded-xl">
            Aplicar filtros
          </Button>
          <Button onClick={clearFilters} variant="ghost" className="rounded-xl">
            Limpiar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-slate-100/90 text-left text-gray-700 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Tipo de servicio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Asignado a</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={6}>
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-8 text-center text-rose-600" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={6}>
                    No hay servicios registrados.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.servicio_id}
                    className="border-t border-gray-100 transition hover:bg-gray-50/80 even:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/5 dark:even:bg.white/5"
                  >
                    <td className="px-4 py-3">{new Date(r.fecha_servicio).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.equipo_label || "-"}</td>
                    <td className="px-4 py-3">{r.tipo_servicio_nombre || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={estadoToPillClasses(r.estado_servicio_id)}>
                        {r.estado_servicio_nombre || "Sin estado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.tecnico_nombre || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/servicios/${r.servicio_id}/editar`}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          <PencilLine className="mr-1 inline h-3.5 w-3.5" />
                          Editar
                        </Link>
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
        <div>
          Página {page} de {totalPages} · {count} servicios
        </div>
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

