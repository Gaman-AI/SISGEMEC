import React from 'react';
import type { TicketOut, TicketUpdate } from '@/types/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  ticket: TicketOut;
  onSave: (data: TicketUpdate) => void;
  loading?: boolean;
}

export default function TicketFormNotes({ ticket, onSave, loading }: Props) {
  const [trabajo, setTrabajo] = React.useState<string>(ticket.trabajo_realizado || '');
  const [notas, setNotas] = React.useState<string>(ticket.notas_internas || '');

  return (
    <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B] mb-4">Notas técnicas</h3>
      <div className="grid gap-2">
        <Input placeholder="Trabajo realizado" value={trabajo} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTrabajo(e.target.value)} />
        <Input placeholder="Notas internas" value={notas} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNotas(e.target.value)} />
        <div>
          <Button 
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-[#208692] hover:bg-[#164F5B] text-white
              transition-colors duration-200 shadow-sm
              px-4 py-2.5 text-sm font-semibold
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
            "
            disabled={loading} 
            onClick={()=>onSave({ trabajo_realizado: trabajo, notas_internas: notas })}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
