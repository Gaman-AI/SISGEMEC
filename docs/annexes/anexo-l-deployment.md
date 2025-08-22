# Anexo L — Plan de Despliegue (Deployment Plan)

## Propósito
Definir el procedimiento de despliegue del sistema SISGEMEC, desde entornos locales hasta producción, garantizando consistencia y seguridad.

---

## Entornos

1. **Local (Desarrollo)**
   - Backend: FastAPI ejecutado con `uvicorn main:app --reload`.
   - Frontend: React con `pnpm run dev`.
   - Base de datos: Supabase (servicio gestionado).
   - Archivos sensibles: `.env` locales (no versionados).

2. **Staging (Preproducción)**
   - Docker Compose para levantar backend + frontend juntos.
   - Variables de entorno gestionadas en `.env.staging`.
   - Deploy en servidor VPS o contenedor cloud (ej. ECS/EKS).

3. **Producción**
   - Backend: Imagen Docker en contenedor (FastAPI).
   - Frontend: Deploy en **Vercel** (o como static build de Docker).
   - Base de datos: Supabase en modo productivo (con RLS).
   - Monitoreo: Logs de Supabase + GitHub Actions + opcional Sentry/Datadog.

---

## Flujo de Despliegue (CI/CD con GitHub Actions)

```mermaid
flowchart TD
  A[Push en rama main] --> B[GitHub Actions CI]
  B --> C[Test Backend con pytest]
  B --> D[Test Frontend con Jest]
  C --> E[Build Imagen Docker Backend]
  D --> E
  E --> F[Deploy Backend (Docker Hub/ECS)]
  D --> G[Deploy Frontend (Vercel)]
Checklist antes de deploy
 Todos los tests pasan (pytest, jest, cypress).

 Auditorías limpias (pip-audit, npm audit).

 Variables de entorno configuradas correctamente.

 Imagen Docker construida y verificada localmente.

 Documentación actualizada (docs/project/).

Variables de Entorno
Ejemplo de .env para backend:


SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_ANON_KEY=xxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxx
JWT_SECRET=xxxxxxxxxx
Ejemplo de .env para frontend:


VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxx
Registro de Despliegues
DEP-001
Fecha: 2025-08-21

Entorno: Staging

Acción: Primer despliegue con Docker Compose.

Resultado: Éxito, ambos servicios responden.

DEP-002
Fecha: 2025-08-21

Entorno: Producción

Acción: Deploy en Vercel (frontend) + ECS (backend).

Resultado: Pendiente.


