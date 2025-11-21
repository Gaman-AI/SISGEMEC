import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AssignmentStatus } from '@/data/licenses.types';

type Props = { status: AssignmentStatus; className?: string };

const STATUS_CONFIG = {
  active: {
    label: "Activa",
    classes: "bg-[#208692] text-white ring-1 ring-inset ring-[#164F5B]",
  },
  revoked: {
    label: "Revocada",
    classes: "bg-[#E5EADF] text-[#527779] ring-1 ring-inset ring-[#CFD0BF]",
  },
  expired: {
    label: "Vencida",
    classes: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200",
  },
} as const;

export default function AssignmentStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.classes,
        className
      )}
      role="status"
      aria-label={`Estado: ${config.label}`}
    >
      {config.label}
    </span>
  );
}


