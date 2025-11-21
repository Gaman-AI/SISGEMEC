import React from 'react';
import type { UserRole } from '../data/users.types';

type BadgeRoleProps = {
  role: UserRole;
  className?: string;
};

const roleConfig = {
  ADMIN: {
    bg: 'bg-[#D4D970]',
    text: 'text-[#164F5B]',
    ring: 'ring-[#CFD0BF]',
    label: 'Administrador',
  },
  TECNICO: {
    bg: 'bg-[#E5EADF]',
    text: 'text-[#527779]',
    ring: 'ring-[#CFD0BF]',
    label: 'Técnico',
  },
  RESPONSABLE: {
    bg: 'bg-[#C7D8D0]',
    text: 'text-[#164F5B]',
    ring: 'ring-[#CFD0BF]',
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
