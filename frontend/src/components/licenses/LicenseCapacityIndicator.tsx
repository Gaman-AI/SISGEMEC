import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  total: number;
  inUse: number;
  className?: string;
};

export default function LicenseCapacityIndicator({ total, inUse, className }: Props) {
  const available = Math.max(total - inUse, 0);
  const ratio = total > 0 ? Math.min(inUse / total, 1) : 0;
  const barColor = available === 0 ? 'bg-red-500' : ratio > 0.8 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="w-24 h-2 rounded bg-slate-200 overflow-hidden">
        <div className={cn('h-2', barColor)} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className={cn('text-xs', available === 0 ? 'text-red-700' : 'text-slate-700')}>
        {inUse}/{total} · libres {available}
      </div>
    </div>
  );
}


