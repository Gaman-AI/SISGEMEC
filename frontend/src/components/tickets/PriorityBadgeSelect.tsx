import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PriorityType } from '@/types/tickets';

const PRIORITY_CONFIG = {
  Urgent: { label: 'Urgente', icon: '🛎️', color: 'bg-red-100 text-red-700 border-red-300' },
  Important: { label: 'Importante', icon: '❗', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  Medium: { label: 'Media', icon: '●', color: 'bg-green-100 text-green-700 border-green-300' },
  Low: { label: 'Baja', icon: '↧', color: 'bg-blue-100 text-blue-700 border-blue-300' }
};

interface Props {
  value: PriorityType;
  onChange: (priority: PriorityType) => void;
  disabled?: boolean;
}

export default function PriorityBadgeSelect({ value, onChange, disabled }: Props) {
  const config = PRIORITY_CONFIG[value];
  
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`w-36 border ${config.color}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-2">
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
