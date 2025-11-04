-- Migración: Agregar columna priority (enum) y migrar datos desde prioritario
-- Reversible con archivo _down correspondiente

-- 1) Nueva columna con enum y default
ALTER TABLE public.tickets
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'
  CHECK (priority IN ('Urgent','Important','Medium','Low'));

-- 2) Migrar datos existentes (TRUE→Important, FALSE→Medium)
UPDATE public.tickets
SET priority = CASE 
  WHEN prioritario IS TRUE THEN 'Important'
  ELSE 'Medium'
END;

-- 3) Crear índice para filtros de prioridad
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);

-- 4) Comentario sobre período de compatibilidad
COMMENT ON COLUMN public.tickets.priority IS 'Nivel de prioridad. prioritario (boolean) será eliminado en 2 sprints.';
