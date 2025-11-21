import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (resultado: string) => Promise<void>;
  loading?: boolean;
}

export default function TicketCloseDialog({ open, onClose, onConfirm, loading }: Props) {
  const [resultado, setResultado] = React.useState('');

  const handleSubmit = async () => {
    if (!resultado.trim()) return;
    await onConfirm(resultado.trim());
    setResultado(''); // Limpiar después de cerrar
  };

  const handleClose = () => {
    setResultado(''); // Limpiar al cancelar
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar Ticket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="resultado" className="mb-1 block text-sm font-medium text-[#26272A]">Resultado del Servicio *</Label>
            <Textarea
              id="resultado"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Describe el trabajo realizado y la solución aplicada..."
              rows={4}
              className="mt-1"
            />
            <p className="text-sm text-[#527779] mt-1">
              Este campo es obligatorio para cerrar el ticket.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              className="
                inline-flex items-center gap-2 rounded-xl
                border border-[#CFD0BF] text-[#164F5B]
                hover:bg-[#E5EADF] transition-colors
                px-4 py-2.5 text-sm font-semibold
              "
              onClick={handleClose} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-[#208692] hover:bg-[#164F5B] text-white
                transition-colors duration-200 shadow-sm
                px-4 py-2.5 text-sm font-semibold
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
              "
              onClick={handleSubmit} 
              disabled={loading || !resultado.trim()}
            >
              {loading ? 'Cerrando...' : 'Cerrar Ticket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
