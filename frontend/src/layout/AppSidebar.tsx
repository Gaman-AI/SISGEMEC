import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const items = [
  { to: '/', label: 'Panel de control', end: true, icon: DashboardIcon },
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon },
  { to: '/equipos', label: 'Equipos', icon: DeviceIcon },
  { to: '/responsables', label: 'Responsables', icon: UsersIcon },
  { to: '/tipos-servicio', label: 'Tipos de Servicio', icon: ListIcon },
  { to: '/importar', label: 'Importar', icon: ImportIcon },
  { to: '/exportar', label: 'Exportar', icon: ExportIcon },
  { to: '/reportes', label: 'Reportes', icon: ReportIcon },
  { to: '/servicios', label: 'Servicios', icon: WrenchIcon },
];

export default function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex md:flex-col">
      {/* Branding */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="h-6 w-6 rounded bg-emerald-600" />
        <div className="text-sm font-semibold tracking-wide">SISGEMEC</div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {items.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-white'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
              )
            }
          >
            <Icon />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* footer mini */}
      <div className="border-t border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        v2.0 · demo
      </div>
    </aside>
  );
}

/* === Iconos inline (sin dependencias) === */
function iconBase(path: string) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="text-gray-500 dark:text-gray-400">
      <path d={path} fill="currentColor" />
    </svg>
  );
}
function DashboardIcon(){ return iconBase("M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 0h11v8H10v-8z"); }
function TicketIcon(){ return iconBase("M4 7h16v3a2 2 0 110 4v3H4v-3a2 2 0 110-4V7z"); }
function MapIcon(){ return iconBase("M9 3l6 2 6-2v18l-6 2-6-2-6 2V5l6-2zM9 5v14"); }
function DeviceIcon(){ return iconBase("M4 6h16v10H4V6zm4 12h8v2H8v-2z"); }
function UsersIcon(){ return iconBase("M16 11a4 4 0 10-8 0 4 4 0 008 0zm-9 8a7 7 0 0110 0H7z"); }
function ListIcon(){ return iconBase("M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"); }
function ImportIcon(){ return iconBase("M12 3v10l3-3 2 2-6 6-6-6 2-2 3 3V3h2z"); }
function ExportIcon(){ return iconBase("M12 21V11l-3 3-2-2 6-6 6 6-2 2-3-3v10h-2z"); }
function ReportIcon(){ return iconBase("M6 2h9l5 5v15H6V2zm8 1.5V8h5"); }
function WrenchIcon(){ return iconBase("M21 7l-2 2-3-3 2-2a4 4 0 11-6 6L5 17l-3 1 1-3 8-7a4 4 0 016-6l2 2z"); }
