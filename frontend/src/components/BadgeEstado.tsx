import React from 'react';

type BadgeEstadoProps = { nombre?: string | null };

const colorMap: Record<string, string> = {
  nuevo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  buenestado: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  regular: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  reparado: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  baja: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  debaja: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  activo: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
};

function keyOf(n?: string | null) {
  if (!n) return null;
  return n.toLowerCase().replace(/[\s_-]+/g, '');
}
function pretty(n?: string | null) {
  if (!n) return 'SIN ESTADO';
  return n.replace(/_/g, ' ').toUpperCase();
}

export default function BadgeEstado({ nombre }: BadgeEstadoProps) {
  const k = keyOf(nombre);
  const cls = (k && colorMap[k]) || 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {pretty(nombre)}
    </span>
  );
}
