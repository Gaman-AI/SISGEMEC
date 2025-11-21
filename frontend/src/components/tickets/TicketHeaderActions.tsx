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
      {ticket.estado === 'Pendiente' && (
        <Button 
          className="
            inline-flex items-center gap-2 rounded-xl
            bg-[#208692] hover:bg-[#164F5B] text-white
            transition-colors duration-200 shadow-sm
            px-4 py-2.5 text-sm font-semibold
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
          "
          onClick={()=>onStateChange('En atención')}
        >
          Marcar En atención
        </Button>
      )}
      {ticket.estado !== 'Cerrado' && (
        <Button 
          variant="secondary"
          className="
            inline-flex items-center gap-2 rounded-xl
            border border-[#CFD0BF] text-[#164F5B]
            hover:bg-[#E5EADF] transition-colors
            px-4 py-2.5 text-sm font-semibold
          "
          onClick={()=>onStateChange('Cerrado')}
        >
          Cerrar ticket
        </Button>
      )}
      <PriorityBadgeSelect
        value={ticket.priority}
        onChange={onPriorityToggle}
      />
      <Button 
        variant="outline"
        className="
          inline-flex items-center gap-2 rounded-xl
          border border-[#CFD0BF] text-[#164F5B]
          hover:bg-[#E5EADF] transition-colors
          px-4 py-2.5 text-sm font-semibold
        "
        onClick={onClassify}
      >
        Clasificar
      </Button>
    </div>
  );
}
