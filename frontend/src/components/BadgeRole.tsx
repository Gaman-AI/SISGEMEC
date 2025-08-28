import React from 'react';
import type { UserRole } from '../data/users.types';

type BadgeRoleProps = {
  role: UserRole;
  className?: string;
};

const roleConfig = {
  ADMIN: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    label: 'Administrador',
  },
  TECNICO: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200',
    label: 'Técnico',
  },
  RESPONSABLE: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
    label: 'Responsable',
  },
};

export default function BadgeRole({ role, className = '' }: BadgeRoleProps) {
  const config = roleConfig[role];

  return (
    <span
      className={`inline-flex items-center rounded-full ${config.bg} px-2.5 py-0.5 text-xs font-medium ${config.text} ring-1 ring-inset ${config.ring} ${className}`}
      role="status"
      aria-label={`Rol: ${config.label}`}
    >
      {role}
    </span>
  );
}
