-- Migración para módulo de Reportes v1
-- Vistas e índices para reportes de equipos y servicios

-- Vistas
CREATE OR REPLACE VIEW public.vw_inventario_equipos AS
SELECT
  e.equipo_id,
  e.num_serie,
  e.tipo_equipo,
  e.marca,
  e.modelo,
  e.sistema_operativo,
  e.ram,
  e.disco,
  e.procesador,
  e.ubicacion_actual,
  e.fecha_ingreso,
  e.fecha_salida,
  ee.nombre AS estado_equipo,
  p.user_id AS responsable_id,
  p.full_name AS responsable,
  p.email AS responsable_email,
  p.department,
  p.location
FROM public.equipos e
LEFT JOIN public.estados_equipo ee ON ee.estado_equipo_id = e.estado_equipo_id
LEFT JOIN public.profiles p ON p.user_id = e.responsable_id;

CREATE OR REPLACE VIEW public.vw_servicios_detalle AS
SELECT
  s.servicio_id,
  s.fecha_servicio,
  s.created_at,
  s.updated_at,
  s.descripcion,
  s.observaciones,
  s.equipo_id,
  e.num_serie,
  e.marca,
  e.modelo,
  ts.nombre AS tipo_servicio,
  es.nombre AS estado_servicio
FROM public.servicios s
JOIN public.equipos e ON e.equipo_id = s.equipo_id
JOIN public.tipos_servicio ts ON ts.tipo_servicio_id = s.tipo_servicio_id
LEFT JOIN public.estados_servicio es ON es.estado_servicio_id = s.estado_servicio_id;

-- Índices recomendados (idempotentes)
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON public.equipos(estado_equipo_id);
CREATE INDEX IF NOT EXISTS idx_equipos_responsable ON public.equipos(responsable_id);
CREATE INDEX IF NOT EXISTS idx_equipos_fecha_ingreso ON public.equipos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_servicios_fecha ON public.servicios(fecha_servicio);
CREATE INDEX IF NOT EXISTS idx_servicios_tipo ON public.servicios(tipo_servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON public.servicios(estado_servicio_id);
