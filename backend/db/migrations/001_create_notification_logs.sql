-- =====================================================
-- Migración: Crear tabla notification_logs
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

create table if not exists notification_logs (
  id bigserial primary key,
  event_type text not null check (event_type in ('SOLICITUD_NUEVA','SERVICIO_COMPLETADO')),
  solicitud_id bigint null,
  servicio_id bigint null,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('SENT','FAILED','RETRYING')),
  error_message text null,
  created_at timestamptz not null default now()
);

-- Índices para mejorar performance
create index if not exists idx_notification_logs_solicitud on notification_logs (solicitud_id);
create index if not exists idx_notification_logs_servicio on notification_logs (servicio_id);
create index if not exists idx_notification_logs_status on notification_logs (status);
create index if not exists idx_notification_logs_event_type on notification_logs (event_type);
create index if not exists idx_notification_logs_created_at on notification_logs (created_at);

-- Habilitar RLS
alter table notification_logs enable row level security;

-- Política para que solo los admins puedan ver los logs
create policy "Admins can view notification logs" on notification_logs
    for all using (
        exists (
            select 1 from profiles 
            where user_id = auth.uid() and role = 'ADMIN'
        )
    );

-- Verificar la creación
select 
    'notification_logs' as table_name,
    count(*) as row_count,
    'RLS enabled: ' || (select case when relrowsecurity then 'YES' else 'NO' end 
                        from pg_class where relname = 'notification_logs') as rls_status
from notification_logs;
