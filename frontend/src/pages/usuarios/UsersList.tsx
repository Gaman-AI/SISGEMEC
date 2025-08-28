// src/pages/usuarios/UsersList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  listUsers,
  toggleUserActive,
} from '../../data/users.repository';
import type { UserRow, UserRole } from '../../data/users.types';
import BadgeRole from '../../components/BadgeRole';
import BadgeActive from '../../components/BadgeActive';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function UsersList() {
  // filtros
  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState<UserRole | ''>('');
  const [active, setActive] = React.useState<boolean | ''>('');
  const [department, setDepartment] = React.useState('');

  // datos
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listUsers({
      page,
      pageSize,
      search,
      role,
      active,
      department,
    });
    if (res.error) {
      setError(res.error.message || 'Error al listar usuarios');
      setRows([]);
      setCount(0);
    } else {
      setRows(res.data);
      setCount(res.count);
    }
    setLoading(false);
  }, [page, pageSize, search, role, active, department]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onToggleActive = async (u: UserRow) => {
    const ok = await ConfirmDialog({
      title: u.active ? 'Desactivar usuario' : 'Activar usuario',
      description: `¿Confirmas ${u.active ? 'desactivar' : 'activar'} a "${u.full_name}"?`,
      confirmText: u.active ? 'Desactivar' : 'Activar',
      tone: u.active ? 'danger' : 'primary',
    });
    if (!ok) return;
    try {
      await toggleUserActive(u.user_id, !u.active);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo actualizar el estado');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Usuarios</h1>
        <Link
          to="/usuarios/nuevo"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + Nuevo usuario
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          placeholder="Buscar nombre, email o área"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
        />
        <select
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
          value={role}
          onChange={(e) => { setRole((e.target.value || '') as UserRole | ''); setPage(1); }}
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="TECNICO">TECNICO</option>
          <option value="RESPONSABLE">RESPONSABLE</option>
        </select>
        <select
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
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
        <input
          placeholder="Departamento"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100/80 text-left text-gray-700 backdrop-blur dark:bg-gray-900/70 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center" colSpan={8}>Cargando…</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-8 text-center text-rose-600" colSpan={8}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center" colSpan={8}>No se encontraron usuarios.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.user_id}
                    className="border-t border-gray-100 transition hover:bg-gray-50/80 even:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/5 dark:even:bg-white/5"
                  >
                    <td className="px-4 py-3">{u.full_name}</td>
                    <td className="px-4 py-3">{u.email ?? '-'}</td>
                    <td className="px-4 py-3">{u.department ?? '-'}</td>
                    <td className="px-4 py-3">{u.phone ?? '-'}</td>
                    <td className="px-4 py-3">{u.location ?? '-'}</td>
                    <td className="px-4 py-3"><BadgeRole role={u.role} /></td>
                    <td className="px-4 py-3"><BadgeActive active={u.active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/usuarios/${u.user_id}/editar`}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => onToggleActive(u)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                            u.active
                              ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
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
            onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
            onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
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
