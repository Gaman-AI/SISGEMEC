// src/components/ConfirmDialog.tsx
export type ConfirmDialogProps = {
  title?: string;
  description?: string;
  confirmText?: string; // no se usa con window.confirm, pero lo dejamos para compatibilidad
  cancelText?: string;  // idem
  tone?: 'primary' | 'danger';
};

/**
 * Helper de confirmación programática.
 * Implementación simple con window.confirm para compatibilidad inmediata.
 * Retorna una Promise<boolean>.
 */
export default function ConfirmDialog({
  title = 'Confirmar',
  description = '',
}: ConfirmDialogProps): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ok = window.confirm(`${title}${description ? `\n\n${description}` : ''}`);
    resolve(ok);
  });
}
