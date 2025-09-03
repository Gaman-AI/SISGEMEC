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

import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  ListFilter,
  UserRound,
  ChevronDown,
  X,
  Building2,
  PencilLine,
} from 'lucide-react';

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

  const limpiarFiltros = () => {
    setSearch('');
    setRole('');
    setActive('');
    setDepartment('');
    setPage(1);
  };
  const hayFiltros = search || role !== '' || active !== '' || department;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Usuarios</h1>
        <Link to="/usuarios/nuevo" aria-label="Registrar nuevo usuario">
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
            <span>Nuevo usuario</span>
          </Button>
        </Link>
      </div>

      {/* -------- Filtros (card slate) -------- */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {/* Buscar */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
              <Search className="h-4 w-4" />
            </span>
            <input
              placeholder="Buscar nombre, email o área"
              className="
                h-11 w-full rounded-xl border border-input bg-white pl-10 pr-9 text-sm
                shadow-sm transition outline-none
                hover:bg-slate-50
                focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
                ring-offset-background
              "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/70 hover:bg-slate-100"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Rol */}
          <FancySelect
            id="role"
            value={role || ''}
            onChange={(val) => { setRole((val || '') as UserRole | ''); setPage(1); }}
            placeholder="Todos los roles"
            icon={<UserRound className="h-4 w-4" />}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="TECNICO">TECNICO</option>
            <option value="RESPONSABLE">RESPONSABLE</option>
          </FancySelect>

          {/* Activo */}
          <FancySelect
            id="active"
            value={active === '' ? '' : active ? '1' : '0'}
            onChange={(val) => { setActive(val === '' ? '' : val === '1'); setPage(1); }}
            placeholder="Todos"
            icon={<ListFilter className="h-4 w-4" />}
          >
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </FancySelect>

          {/* Departamento */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
              <Building2 className="h-4 w-4" />
            </span>
            <input
              placeholder="Departamento"
              className="
                h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm
                shadow-sm transition outline-none
                hover:bg-slate-50
                focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
                ring-offset-background
              "
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
          </div>
        </div>

        {/* chips + limpiar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hayFiltros ? (
            <>
              <span className="text-xs text-muted-foreground">Filtros activos:</span>
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  búsqueda: “{search}”
                </span>
              )}
              {role && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  rol: {role}
                </span>
              )}
              {active !== '' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  estado: {active ? 'Activos' : 'Inactivos'}
                </span>
              )}
              {department && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  depto: {department}
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
              <col className="w-[220px]" />
              <col className="w-[260px]" />
              <col className="w-[180px]" />
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[160px]" />
            </colgroup>

            {/* ENCABEZADO resaltado en slate-100 */}
            <thead
              className="
                sticky top-0 z-10 text-left
                bg-slate-100/90 backdrop-blur
                border-b border-slate-200
              "
            >
              <tr className="text-[13px] uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Departamento</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Ubicación</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-8 text-center text-rose-600" colSpan={8}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                rows.map((u, idx) => (
                  <tr
                    key={u.user_id}
                    className={`
                      transition
                      ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                      hover:bg-slate-50
                    `}
                  >
                    <td className="px-4 py-3 text-slate-700">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-700">{u.email ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{u.department ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{u.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{u.location ?? '-'}</td>
                    <td className="px-4 py-3"><BadgeRole role={u.role} /></td>
                    <td className="px-4 py-3"><BadgeActive active={u.active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <Link
                          to={`/usuarios/${u.user_id}/editar`}
                          className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
                        >
                          <PencilLine className="h-4 w-4" />
                          <span>Editar</span>
                        </Link>
                        <button
                          onClick={() => onToggleActive(u)}
                          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-700"
                        >
                          <span>{u.active ? 'Desactivar' : 'Activar'}</span>
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
        <div className="text-slate-600">
          Página {page} de {totalPages} · {count} registros
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
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
