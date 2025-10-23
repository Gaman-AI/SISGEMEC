# Arquitectura de Módulos - SISGEMEC

## 1. Módulos del Sistema

### 🔹 Módulo de Equipos (Activo)
- **Estado**: Activo, mantenimiento continuo
- **Tablas**: `equipos`, `estados_equipo`, `profiles`
- **Funcionalidad**: Inventario de equipos, asignación de responsables
- **Endpoints**: CRUD completo para equipos
- **Vista**: `vw_inventario_equipos` para reportes

### 🔹 Módulo de Tickets (Nuevo - Activo)
- **Estado**: Implementación activa, desarrollo principal
- **Tablas**: `tickets`, `ticket_events`
- **Funcionalidad**: Gestión de incidencias, flujo de estados, métricas
- **Endpoints**: CRUD completo + intake automático
- **Vista**: `v_report_tickets` con TTR calculation
- **Reemplaza**: Gradualmente el módulo de Solicitudes/Servicios

### 🔹 Módulo de Solicitudes/Servicios (Legacy - Histórico)
- **Estado**: Histórico, mantenimiento mínimo
- **Tablas**: `solicitudes_servicio`, `servicios`
- **Funcionalidad**: Sistema legacy de solicitudes
- **Endpoints**: Mantenidos para compatibilidad
- **Migración**: Datos históricos se mantienen, nuevos casos usan Tickets

### 🔹 Módulo de Reportes (Activo)
- **Estado**: Activo, integrado con todos los módulos
- **Vistas**: 
  - `v_report_tickets` (TTR, métricas de tickets)
  - `vw_inventario_equipos` (inventario de equipos)
  - `vw_servicios_detalle` (servicios legacy)
- **Funcionalidad**: KPIs, exportación, análisis
- **Endpoints**: Consultas y exportación

### 🔹 Módulo de Notificaciones (Activo)
- **Estado**: Activo, integrado con Tickets
- **Tablas**: `notification_logs`
- **Funcionalidad**: Trazabilidad de correos, notificaciones de cierre
- **Integración**: `notification_logs.ticket_id` (opcional)

## 2. Flujo de Migración

```
Solicitudes/Servicios (Legacy) → Tickets (Nuevo)
     ↓                              ↓
Datos históricos              Nuevos casos
Mantenimiento                 Desarrollo activo
```

### Estrategia de Migración
1. **Datos históricos**: Permanecen en `solicitudes_servicio` y `servicios`
2. **Nuevos casos**: Se crean en `tickets` y `ticket_events`
3. **Coexistencia**: Ambos sistemas funcionan en paralelo
4. **Reportes**: Integran datos de ambos módulos

## 3. Integración entre Módulos

### Tickets ↔ Equipos
- **Relación**: `tickets.equipo_id` → `equipos.equipo_id` (opcional)
- **Uso**: Tickets pueden estar asociados a equipos específicos
- **Clasificación**: Si 0 o >1 equipos encontrados → `requires_classification = true`

### Tickets ↔ Profiles
- **Relaciones**: 
  - `tickets.solicitante_id` → `profiles.user_id` (opcional)
  - `tickets.tecnico_id` → `profiles.user_id` (opcional)
- **Uso**: Asignación de creadores y técnicos

### Tickets ↔ Tipos de Servicio
- **Relación**: `tickets.tipo_servicio_id` → `tipos_servicio.tipo_servicio_id` (opcional)
- **Uso**: Clasificación de tickets por tipo de servicio

### Tickets ↔ Notifications
- **Relación**: `notification_logs.ticket_id` → `tickets.ticket_id` (opcional)
- **Uso**: Trazabilidad de notificaciones de cierre

## 4. Arquitectura de Datos

### Flujo de Datos
```
Intake (Google Forms) → Tickets → Events → Notifications
     ↓                    ↓         ↓
  Clasificación      Asignación   Cierre
     ↓                    ↓         ↓
  Equipos            Técnicos   Reportes
```

### Políticas de Acceso
- **ADMIN**: Acceso completo a todos los módulos
- **TÉCNICO**: Acceso a tickets asignados
- **RESPONSABLE**: Acceso a tickets propios y equipos asignados
- **SERVICE_ROLE**: Bypass para intake automático

## 5. Consideraciones de Desarrollo

### Nuevas Funcionalidades
- **Prioridad**: Tickets (nuevo módulo)
- **Mantenimiento**: Equipos, Reportes
- **Legacy**: Solicitudes/Servicios (mínimo)

### Testing
- **Tickets**: Tests completos (unitarios, integración, e2e)
- **Equipos**: Tests de regresión
- **Legacy**: Tests de compatibilidad

### Documentación
- **Tickets**: Documentación completa y actualizada
- **Equipos**: Documentación mantenida
- **Legacy**: Documentación histórica
