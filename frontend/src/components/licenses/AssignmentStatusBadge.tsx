import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AssignmentStatus } from '@/data/licenses.types';

type Props = { status: AssignmentStatus; className?: string };

export default function AssignmentStatusBadge({ status, className }: Props) {
  const map: Record<AssignmentStatus, { label: string; color: string }> = {
    active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
    revoked: { label: 'Revocada', color: 'bg-slate-200 text-slate-700' },
    expired: { label: 'Vencida', color: 'bg-red-100 text-red-800' },
  };
  const m = map[status] || map.active;
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', m.color, className)}>
      {m.label}
    </span>
  );
}


