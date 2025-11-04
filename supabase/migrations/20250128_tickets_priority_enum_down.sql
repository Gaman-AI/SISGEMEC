-- Rollback: Eliminar columna priority
DROP INDEX IF EXISTS idx_tickets_priority;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS priority;
