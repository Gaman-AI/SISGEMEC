# Project Requirements — SISGEMEC (v0)

> Este documento define los requisitos principales del proyecto y será la base del MVP 2.0.

## Objetivo
Optimizar la gestión y mantenimiento de equipos de cómputo para AOSENUMA mediante una aplicación moderna.

## Alcance funcional (MVP)
- **Equipos**: registro, consulta, edición, baja lógica y asignación a responsables.
- **Solicitudes/Servicios**: creación de solicitudes, atención por técnicos, actualización de estados, cierre con evidencias.
- **Historial y Reportes**: historial por equipo, reportes filtrados y exportables a Excel/CSV.
- **Autenticación y Roles**: Admin, Técnico, Responsable.
- **Notificaciones básicas**: estados de solicitudes a responsables.

## Alcance no funcional
- Seguridad con Supabase Auth y JWT.
- CI/CD con GitHub Actions.
- Despliegue en Docker.
- Documentación en `docs/` y reglas de Cursor en `.cursor/`.

## Roles
- **Administrador**: control total, reportes globales.
- **Técnico**: atiende solicitudes y actualiza estados.
- **Responsable**: crea solicitudes y consulta su equipo.

## Criterios de aceptación del MVP
- Flujo completo por rol funcionando.
- Exportación de reportes correcta.
- Contratos OpenAPI y esquema DB actualizados en `docs/`.
