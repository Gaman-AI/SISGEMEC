import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PriorityType } from '@/types/tickets';

const priorityConfig: Record<string, { bg: string; text: string; ring: string; label: string; icon: string }> = {
  URGENT: {
    bg: "bg-[#D4D970]",
    text: "text-[#164F5B]",
    ring: "ring-[#CFD0BF]",
    label: 'Urgente',
    icon: '🛎️',
  },
  IMPORTANT: {
    bg: "bg-[#208692]",
    text: "text-white",
    ring: "ring-[#164F5B]",
    label: 'Importante',
    icon: '❗',
  },
  MEDIUM: {
    bg: "bg-[#C7D8D0]",
    text: "text-[#164F5B]",
    ring: "ring-[#CFD0BF]",
    label: 'Media',
    icon: '●',
  },
  LOW: {
    bg: "bg-[#E5EADF]",
    text: "text-[#527779]",
    ring: "ring-[#CFD0BF]",
    label: 'Baja',
    icon: '↧',
  },
  DEFAULT: {
    bg: "bg-[#E5EADF]",
    text: "text-[#527779]",
    ring: "ring-[#CFD0BF]",
    label: 'Media',
    icon: '●',
  },
};

const PRIORITY_CONFIG = {
  Urgent: { 
    label: priorityConfig.URGENT.label, 
    icon: priorityConfig.URGENT.icon, 
    color: `${priorityConfig.URGENT.bg} ${priorityConfig.URGENT.text} ${priorityConfig.URGENT.ring}` 
  },
  Important: { 
    label: priorityConfig.IMPORTANT.label, 
    icon: priorityConfig.IMPORTANT.icon, 
    color: `${priorityConfig.IMPORTANT.bg} ${priorityConfig.IMPORTANT.text} ${priorityConfig.IMPORTANT.ring}` 
  },
  Medium: { 
    label: priorityConfig.MEDIUM.label, 
    icon: priorityConfig.MEDIUM.icon, 
    color: `${priorityConfig.MEDIUM.bg} ${priorityConfig.MEDIUM.text} ${priorityConfig.MEDIUM.ring}` 
  },
  Low: { 
    label: priorityConfig.LOW.label, 
    icon: priorityConfig.LOW.icon, 
    color: `${priorityConfig.LOW.bg} ${priorityConfig.LOW.text} ${priorityConfig.LOW.ring}` 
  }
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
      <SelectTrigger className={`w-36 border border-[#CFD0BF] ring-1 ring-inset ${config.color}`}>
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
