// A:\Proyectos\SISGEMEC\frontend\src\layout\AppSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const items = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/responsables', label: 'Responsables' },
  { to: '/tipos-servicio', label: 'Tipos de Servicio' },
  { to: '/importar', label: 'Importar' },
  { to: '/exportar', label: 'Exportar' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/servicios', label: 'Servicios' },
];

export default function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 p-4 dark:border-gray-800 md:block">
      <nav className="space-y-1">
        {items.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
