import React from 'react';
import type { TicketOut, TicketClassify, PriorityType } from '@/types/tickets';
import { Button } from '@/components/ui/button';
import PriorityBadgeSelect from './PriorityBadgeSelect';

interface Props {
  ticket: TicketOut;
  onStateChange: (estado: 'En atención' | 'Cerrado') => void;
  onPriorityToggle: (priority: PriorityType) => void;
  onClassify: () => void;
}

export default function TicketHeaderActions({ ticket, onStateChange, onPriorityToggle, onClassify }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {ticket.estado === 'Pendiente' && <Button onClick={()=>onStateChange('En atención')}>Marcar En atención</Button>}
      {ticket.estado !== 'Cerrado' && <Button variant="secondary" onClick={()=>onStateChange('Cerrado')}>Cerrar ticket</Button>}
      <PriorityBadgeSelect
        value={ticket.priority}
        onChange={onPriorityToggle}
      />
      <Button variant="outline" onClick={onClassify}>
        Clasificar
      </Button>
    </div>
  );
}
