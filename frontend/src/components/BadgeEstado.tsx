import React from 'react';

type BadgeEstadoProps = {
  nombre?: string | null;
};

const colorMap: Record<string, string> = {
  'Nuevo': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  'Buen estado': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  'Regular': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  'Reparado': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  'Baja': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

export default function BadgeEstado({ nombre }: BadgeEstadoProps) {
  if (!nombre) return <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">Sin estado</span>;
  const cls = colorMap[nombre] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${cls}`}>{nombre}</span>;
}
