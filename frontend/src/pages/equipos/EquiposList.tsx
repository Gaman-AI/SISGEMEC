import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listEquipos,
  deleteEquipo,
  listEstados,
  listResponsables,
} from '../../data/equipos.repository';
import BadgeEstado from '../../components/BadgeEstado';

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
      // fechas eliminadas
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

  return (
    <div className="space-y-5">
      {/* Header + acción */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Equipos</h1>
        <Link
          to="/equipos/nuevo"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + Nuevo Equipo
        </Link>
      </div>

      {/* Filtros (sin fechas) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          placeholder="Buscar marca, modelo o serie"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
        />

        <select
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
          value={estadoId}
          onChange={(e) => { setEstadoId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>

        <select
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
          value={respId}
          onChange={(e) => { setRespId(e.target.value); setPage(1); }}
        >
          <option value="">Todos los responsables</option>
          {responsables.map((r) => <option key={r.user_id} value={r.user_id}>{r.full_name}</option>)}
        </select>
      </div>

      {/* Card tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100/80 text-left text-gray-700 backdrop-blur dark:bg-gray-900/70 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Serie</th>
                <th className="px-4 py-3">Ingreso</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={9}>Cargando…</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-8 text-center text-rose-600" colSpan={9}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={9}>No se encontraron equipos con los filtros aplicados.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.equipo_id}
                    className="border-t border-gray-100 transition hover:bg-gray-50/80 even:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/5 dark:even:bg-white/5"
                  >
                    <td className="px-4 py-3">{r.equipo_id}</td>
                    <td className="px-4 py-3">{r.tipo_equipo || '-'}</td>
                    <td className="px-4 py-3">{r.marca || '-'}</td>
                    <td className="px-4 py-3">{r.modelo || '-'}</td>
                    <td className="px-4 py-3">{r.num_serie || '-'}</td>
                    <td className="px-4 py-3">{r.fecha_ingreso?.slice(0,10) || '-'}</td>
                    <td className="px-4 py-3">{r.responsable_nombre || '-'}</td>
                    <td className="px-4 py-3"><BadgeEstado nombre={r.estado_nombre || null} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => nav(`/equipos/${r.equipo_id}/editar`)}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(r.equipo_id)}
                          className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          Eliminar
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
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-gray-700"
            onClick={load}
          >
            Refrescar
          </button>
        </div>
      </div>
    </div>
  );
}
