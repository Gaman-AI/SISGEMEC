-- =====================================================
-- Migración: Extender notification_logs para TICKET_CLOSED_USER
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Eliminar la restricción existente si existe
ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_event_type_check;

-- Crear constraint actualizado con todos los eventos incluyendo TICKET_CLOSED_USER
ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_event_type_check
  CHECK (
    event_type IN (
      'SOLICITUD_NUEVA',
      'SERVICIO_COMPLETADO',
      'SERVICIO_ATENDIDO',
      'TICKET_CLOSED_USER'
    )
  );

-- Verificar la actualización
SELECT 
    'notification_logs' as table_name,
    'TICKET_CLOSED_USER added to event_type constraint' as status,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE table_name = 'notification_logs' 
  AND constraint_name = 'notification_logs_event_type_check';

