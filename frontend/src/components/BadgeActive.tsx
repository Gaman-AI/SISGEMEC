import React from 'react';

type BadgeActiveProps = {
  active: boolean;
  className?: string;
};

export default function BadgeActive({ active, className = '' }: BadgeActiveProps) {
  if (active) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-[#208692] px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-[#164F5B] ${className}`}
        role="status"
        aria-label="Usuario activo"
      >
        ACTIVO
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#E5EADF] px-2.5 py-0.5 text-xs font-medium text-[#527779] ring-1 ring-inset ring-[#CFD0BF] ${className}`}
      role="status"
      aria-label="Usuario inactivo"
    >
      INACTIVO
    </span>
  );
}
