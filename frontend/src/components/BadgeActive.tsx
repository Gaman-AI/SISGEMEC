import React from 'react';

type BadgeActiveProps = {
  active: boolean;
  className?: string;
};

export default function BadgeActive({ active, className = '' }: BadgeActiveProps) {
  if (active) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 ${className}`}
        role="status"
        aria-label="Usuario activo"
      >
        ACTIVO
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200 ${className}`}
      role="status"
      aria-label="Usuario inactivo"
    >
      INACTIVO
    </span>
  );
}
