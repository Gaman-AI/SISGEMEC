# Tickets (Módulo Nuevo) — SISGEMEC

## Objetivo
Unificar el ciclo de soporte en un solo módulo: ingreso (Google Forms), clasificación, atención técnica, cierre y notificación, **sin** convertir a "servicio".

## Tablas

### `public.tickets`
- **PK**: `ticket_id BIGSERIAL`
- **Campos clave**:
  - `solicitante_email TEXT NOT NULL`
  - `solicitante_nombre TEXT NULL`
  - `descripcion TEXT NOT NULL`
  - `equipo_id BIGINT NULL` (FK→`public.equipos`)
  - `solicitante_id UUID NULL` (FK→`public.profiles`)
  - `tipo_servicio_id BIGINT NULL` (FK→`public.tipos_servicio`)
  - `estado TEXT NOT NULL DEFAULT 'Pendiente'` (CHECK IN `'Pendiente'|'En atención'|'Cerrado'`)
  - `prioritario BOOLEAN NOT NULL DEFAULT FALSE`
  - `fuente TEXT NOT NULL DEFAULT 'google_forms'` (CHECK IN `'google_forms'|'email'|'manual'`)
  - `external_id TEXT UNIQUE` (para **idempotencia** de intake)
  - `raw_payload JSONB`
  - `requires_classification BOOLEAN NOT NULL DEFAULT FALSE`
  - `received_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `first_response_at TIMESTAMPTZ`
  - `closed_at TIMESTAMPTZ`
  - `tecnico_id UUID NULL` (FK→`public.profiles`)
  - `trabajo_realizado TEXT`
  - `notas_internas TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Trigger**: BEFORE UPDATE → `set_updated_at()`
- **Índices**: `(estado)`, `(prioritario)`, `(received_at)`, `(closed_at)`, `(fuente)`, y FT opcional sobre email/descripcion.

### `public.ticket_events`
- **PK**: `event_id BIGSERIAL`
- **Campos**:
  - `ticket_id BIGINT NOT NULL` (FK→`public.tickets` ON DELETE CASCADE)
  - `actor_id UUID NULL` (FK→`public.profiles`)
  - `event_type TEXT NOT NULL` (IN `'CREATED','STATE_CHANGED','PRIORITY_CHANGED','CLASSIFIED','ASSIGNED','UPDATED','CLOSED'`)
  - `payload JSONB`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Índices**: `(ticket_id)`, `(event_type)`, `(created_at)`

### Vista `public.v_report_tickets`
Incluye `ttr_seconds = EXTRACT(EPOCH FROM (closed_at - received_at))::bigint`.

## Estados y reglas automáticas
- **Pendiente → En atención**: si `first_response_at IS NULL`, poner `now()`.
- **En atención → Cerrado**: set `closed_at = now()` + enviar notificación + registrar evento.

## Idempotencia (`external_id`)
- Intake por Forms debe usar **ON CONFLICT DO NOTHING** o **UPSERT** sobre `external_id` para evitar duplicados (reintentos).
- Devuelve siempre el `ticket_id` (nuevo o existente).

## RLS
- Habilitado en `tickets` y `ticket_events`.
- UI: **solo ADMIN** puede SELECT/INSERT/UPDATE/DELETE (tickets) y SELECT/INSERT (events).
- Backend (Service Role): bypass para `/intake/google-forms`.

## Compatibilidad con legado
- `solicitudes_servicio` y `servicios` quedan como histórico (no se modifican).
- `notification_logs.ticket_id` (opcional) para trazar correos de cierre.

## Ejemplos de consultas

### Verificar ticket creado
```sql
SELECT ticket_id, estado, prioritario, received_at 
FROM public.tickets 
WHERE external_id = 'form_submission_123';
```

### Idempotencia en intake
```sql
INSERT INTO public.tickets (external_id, solicitante_email, descripcion, fuente)
VALUES ('form_submission_123', 'usuario@empresa.com', 'Problema con laptop', 'google_forms')
ON CONFLICT (external_id) DO NOTHING
RETURNING ticket_id;
```

### Eventos de un ticket
```sql
SELECT event_type, payload, created_at, actor_id
FROM public.ticket_events 
WHERE ticket_id = 123
ORDER BY created_at;
```

### TTR promedio por fuente
```sql
SELECT fuente, AVG(ttr_seconds) as avg_ttr_seconds
FROM public.v_report_tickets 
WHERE closed_at IS NOT NULL
GROUP BY fuente;
```
