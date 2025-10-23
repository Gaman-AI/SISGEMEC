# Índice de Migraciones - SISGEMEC

## Migraciones Aplicadas

### 20250115_reportes_vistas.sql
- **Fecha**: 2025-01-15
- **Descripción**: Creación de vistas para reportes de equipos y servicios
- **Tablas afectadas**: Vistas `vw_inventario_equipos`, `vw_servicios_detalle`
- **Índices**: Múltiples índices para optimización de consultas
- **Estado**: ✅ Aplicada

### 20250120_tickets_module.sql
- **Fecha**: 2025-01-20 (aplicada vía SQL editor)
- **Descripción**: Creación del módulo de Tickets
- **Tablas nuevas**: 
  - `public.tickets` (BIGSERIAL ticket_id, campos de soporte técnico)
  - `public.ticket_events` (BIGSERIAL event_id, auditoría de cambios)
- **Vista nueva**: `public.v_report_tickets` (con TTR en segundos)
- **Índices**: 
  - `idx_tickets_estado` en `tickets(estado)`
  - `idx_tickets_prioritario` en `tickets(prioritario)`
  - `idx_tickets_received_at` en `tickets(received_at)`
  - `idx_tickets_closed_at` en `tickets(closed_at)`
  - `idx_tickets_fuente` en `tickets(fuente)`
  - `idx_ticket_events_ticket_id` en `ticket_events(ticket_id)`
  - `idx_ticket_events_event_type` en `ticket_events(event_type)`
  - `idx_ticket_events_created_at` en `ticket_events(created_at)`
- **RLS**: Políticas de seguridad para tickets (solo ADMIN en UI)
- **Triggers**: `set_updated_at()` en tickets
- **Estado**: ✅ Aplicada

### 20250120_notification_logs_ticket_id.sql (Opcional)
- **Fecha**: 2025-01-20 (aplicada vía SQL editor)
- **Descripción**: Extensión de notification_logs para tickets
- **Cambios**: 
  - `public.notification_logs.ticket_id BIGINT NULL` (FK→`public.tickets`)
  - Índice `idx_notification_logs_ticket_id` en `notification_logs(ticket_id)`
- **Estado**: ✅ Aplicada (opcional)

## Orden de Aplicación
1. ✅ Aplicar migración de tickets (tablas + índices + RLS)
2. ✅ Verificar RLS policies (solo ADMIN para UI)
3. ✅ Probar endpoints de intake (service role bypass)
4. ✅ Validar vista de reportes (TTR calculation)
5. ✅ Opcional: notification_logs.ticket_id para trazabilidad

## Notas de Migración
- **No rompe legado**: Las tablas `solicitudes_servicio` y `servicios` permanecen intactas
- **Idempotencia**: Campo `external_id` permite reintentos seguros en intake
- **RLS**: Service role bypass para operaciones internas, solo ADMIN para UI
- **Compatibilidad**: El módulo de Tickets coexiste con el sistema legacy
