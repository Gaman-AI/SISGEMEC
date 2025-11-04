import React from 'react';
import type { TicketEvent } from '@/types/tickets';

interface Props {
  events: TicketEvent[];
  loading?: boolean;
}
const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Creado',
  STATE_CHANGED: 'Estado cambiado',
  PRIORITY_CHANGED: 'Prioridad cambiada',
  CLASSIFIED: 'Clasificado',
  ASSIGNED: 'Asignado',
  UPDATED: 'Actualizado',
  CLOSED: 'Cerrado'
};

export default function TicketEvents({ events, loading }: Props) {
  if (loading) {
    return <div className="text-muted-foreground">Cargando eventos...</div>;
  }
  
  if (!events || events.length === 0) {
    return <div className="text-muted-foreground">Sin eventos</div>;
  }
  
  return (
    <ol className="relative border-s ps-6 space-y-3">
      {events.map((ev) => (
        <li key={ev.event_id}>
          <div className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-slate-400" />
          <div className="text-sm font-medium">
            {EVENT_LABELS[ev.event_type] || ev.event_type}
          </div>
          <div className="text-xs text-muted-foreground">
            {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
          </div>
          {ev.payload && Object.keys(ev.payload).length > 0 && (
            <pre className="mt-1 bg-slate-50 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(ev.payload, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ol>
  );
}
