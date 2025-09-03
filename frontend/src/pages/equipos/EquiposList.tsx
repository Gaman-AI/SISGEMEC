import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listEquipos,
  deleteEquipo,
  listEstados,
  listResponsables,
} from '../../data/equipos.repository';
// import BadgeEstado from '../../components/BadgeEstado'; // <- ya no la usamos en la tabla

import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  ListFilter,
  UserRound,
  ChevronDown,
  X,
  PencilLine,
  Trash2,
} from 'lucide-react';

type Row = {
  equipo_id: number;
  tipo_equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  num_serie?: string | null;
  fecha_ingreso?: string | null;
  estado_equipo_id?: number | null;
  responsable_id?: string | null;
  estado_nombre?: string | null;
  responsable_nombre?: string | null;
};

/* ---------- FancySelect: nativo con look shadcn + iconos ---------- */
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
          ${icon ? 'pl-10' : 'pl-3'} pr-9
          text-sm shadow-sm transition
          hover:bg-slate-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
          ring-offset-background
        `}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden
      />
    </div>
  );
}

/* ---------- EstadoPill: mapea nombre de estado a colores tipo shadcn ---------- */
function EstadoPill({ nombre }: { nombre: string | null }) {
  const n = (nombre || '').toUpperCase().trim();
  let classes =
    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium';

  if (n === 'ACTIVO') {
    classes += ' border-emerald-200 bg-emerald-50 text-emerald-700';
  } else if (n === 'DE BAJA' || n === 'DE_BAJA' || n === 'DE-BAJA') {
    classes += ' border-rose-200 bg-rose-50 text-rose-700';
  } else if (n === 'EN MANTENIMIENTO' || n === 'EN_MANTENIMIENTO' || n === 'MANTENIMIENTO') {
    classes += ' border-amber-200 bg-amber-50 text-amber-700';
  } else {
    // fallback neutro
    classes += ' border-slate-200 bg-slate-50 text-slate-700';
  }

  return <span className={classes}>{nombre || '-'}</span>;
}

export default function EquiposList() {
  const nav = useNavigate();

  // filtros
  const [q, setQ] = React.useState('');
  const [estadoId, setEstadoId] = React.useState<number | ''>('');
  const [respId, setRespId] = React.useState<string | ''>('');

  // catálogos
  const [estados, setEstados] = React.useState<{ id: number; nombre: string }[]>([]);
  const [responsables, setResponsables] = React.useState<{ user_id: string; full_name: string }[]>([]);

  // datos
  const [rows, setRows] = React.useState<Row[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // cargar catálogos
  React.useEffect(() => {
    (async () => {
      const [e, r] = await Promise.all([listEstados(), listResponsables()]);
      if (!e.error) setEstados(e.data);
      if (!r.error) setResponsables(r.data);
    })();
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listEquipos({
      page,
      pageSize,
      search: q,
      estado_equipo_id: estadoId === '' ? null : Number(estadoId),
      responsable_id: respId === '' ? null : respId,
    });
    if (res.error) {
      setError(res.error.message || 'Error al listar equipos');
      setRows([]);
      setCount(0);
    } else {
      setRows((res.data as Row[]) || []);
      setCount(res.count || 0);
    }
    setLoading(false);
  }, [page, pageSize, q, estadoId, respId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (id: number) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    const res = await deleteEquipo(id);
    if ('error' in res && res.error) {
      alert(res.error.message || 'No se pudo eliminar');
      return;
    }
    load();
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const limpiarFiltros = () => {
    setQ('');
    setEstadoId('');
    setRespId('');
    setPage(1);
  };
  const hayFiltros = q || estadoId !== '' || respId;

  return (
    <div className="space-y-6">
      {/* Header + acción */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Equipos</h1>

        <Link to="/equipos/nuevo" aria-label="Registrar nuevo equipo">
          <Button
            className="
              group inline-flex items-center gap-2 rounded-xl
              bg-gradient-to-b from-slate-900 to-slate-700
              text-white shadow-sm
              hover:from-slate-800 hover:to-slate-600
              active:from-slate-900 active:to-slate-700
              focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
              px-4 py-2.5 text-sm font-semibold
            "
          >
            <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>Nuevo Equipo</span>
          </Button>
        </Link>
      </div>

      {/* -------- Filtros (card slate) -------- */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Buscar */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
              <Search className="h-4 w-4" />
            </span>
            <input
              placeholder="Buscar marca, modelo o serie"
              className="
                h-11 w-full rounded-xl border border-input bg-white pl-10 pr-9 text-sm
                shadow-sm transition outline-none
                hover:bg-slate-50
                focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
                ring-offset-background
              "
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/70 hover:bg-slate-100"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Estado */}
          <FancySelect
            id="estado"
            value={estadoId === '' ? '' : String(estadoId)}
            onChange={(val) => { setEstadoId(val === '' ? '' : Number(val)); setPage(1); }}
            placeholder="Todos los estados"
            icon={<ListFilter className="h-4 w-4" />}
          >
            {estados.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.nombre}
              </option>
            ))}
          </FancySelect>

          {/* Responsable */}
          <FancySelect
            id="responsable"
            value={respId || ''}
            onChange={(val) => { setRespId(val); setPage(1); }}
            placeholder="Todos los responsables"
            icon={<UserRound className="h-4 w-4" />}
          >
            {responsables.map((r) => (
              <option key={r.user_id} value={r.user_id}>
                {r.full_name}
              </option>
            ))}
          </FancySelect>
        </div>

        {/* chips + limpiar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hayFiltros ? (
            <>
              <span className="text-xs text-muted-foreground">Filtros activos:</span>
              {q && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  búsqueda: “{q}”
                </span>
              )}
              {estadoId !== '' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  estado: {estados.find((e) => String(e.id) === String(estadoId))?.nombre || estadoId}
                </span>
              )}
              {respId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  responsable: {responsables.find((r) => r.user_id === respId)?.full_name || respId}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={limpiarFiltros}
                className="ml-1 h-8 rounded-full px-3 text-xs text-slate-700 hover:bg-slate-100"
              >
                Limpiar
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Usa los filtros para refinar la lista.</span>
          )}
        </div>
      </div>

      {/* -------------------- Tabla estilizada -------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-sm">
            <colgroup>
              <col className="w-14" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-44" />
              <col className="w-28" />
              <col className="w-40" />
            </colgroup>

            <thead
              className="
                sticky top-0 z-10 text-left text-slate-700
                bg-slate-50/95 backdrop-blur
                border-b border-slate-200
              "
            >
              <tr className="text-[13px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Marca</th>
                <th className="px-4 py-3 font-semibold">Modelo</th>
                <th className="px-4 py-3 font-semibold">Serie</th>
                <th className="px-4 py-3 font-semibold">Ingreso</th>
                <th className="px-4 py-3 font-semibold">Responsable</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-8 text-center text-rose-600" colSpan={9}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                    No se encontraron equipos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.equipo_id}
                    className={`
                      transition
                      ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                      hover:bg-slate-50
                    `}
                  >
                    <td className="px-4 py-3 text-slate-700">{r.equipo_id}</td>
                    <td className="px-4 py-3 text-slate-700">{r.tipo_equipo || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.marca || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="line-clamp-1">{r.modelo || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="line-clamp-1">{r.num_serie || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.fecha_ingreso?.slice(0, 10) || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="line-clamp-1">{r.responsable_nombre || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Píldora con colores por estado */}
                      <EstadoPill nombre={r.estado_nombre || null} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100"
                          onClick={() => nav(`/equipos/${r.equipo_id}/editar`)}
                        >
                          <PencilLine className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100"
                          onClick={() => onDelete(r.equipo_id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Eliminar
                        </Button>
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
        <div className="text-slate-600">
          Página {page} de {totalPages} · {count} registros
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={load}
          >
            Refrescar
          </Button>
        </div>
      </div>
    </div>
  );
}

