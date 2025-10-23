import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  endDate?: string | null;
  className?: string;
};

function getStatus(endDate?: string | null): { label: string; intent: 'ok' | 'warn' | 'danger' | 'neutral' } {
  if (!endDate) return { label: 'Sin vencimiento', intent: 'neutral' };
  const now = new Date();
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Vencida', intent: 'danger' };
  if (diffDays <= 30) return { label: `Vence en ${diffDays} días`, intent: 'warn' };
  return { label: 'Vigente', intent: 'ok' };
}

export default function LicenseStatusBadge({ endDate, className }: Props) {
  const s = getStatus(endDate);
  const color = s.intent === 'ok' ? 'bg-green-100 text-green-800'
    : s.intent === 'warn' ? 'bg-yellow-100 text-yellow-800'
    : s.intent === 'danger' ? 'bg-red-100 text-red-800'
    : 'bg-slate-100 text-slate-700';

  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', color, className)}>
      {s.label}
    </span>
  );
}


