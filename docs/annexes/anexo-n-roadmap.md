# Anexo N — Roadmap del Proyecto

## Propósito
Definir la hoja de ruta del sistema **SISGEMEC**, con fases de desarrollo, hitos y entregables, asegurando una visión clara del progreso y próximos pasos.

---

## Fases del Proyecto

### 🔹 Fase 0 — Preparación (✅ Completada)
- Instalación de entornos (Python, Node.js, Supabase, Docker).
- Configuración inicial de Cursor con Context 7 MCP.
- Definición del stack en `docs/project/tech-stack.mdc`.

### 🔹 Fase 1 — Documentación (⏳ En curso)
- Crear y llenar `.cursor/rules/`.
- Completar `docs/project/` con requisitos, arquitectura y esquemas.
- Crear `annexes/` (deuda técnica, seguridad, prompts, etc.).

### 🔹 Fase 2 — Backend (FastAPI)
- Implementar `main.py` con healthcheck.
- Endpoints CRUD: usuarios, equipos, solicitudes, servicios.
- Integración con Supabase (DB + Auth + Storage).
- Pruebas con `pytest`.

### 🔹 Fase 3 — Frontend (React + TS)
- Configuración inicial con Vite + Tailwind.
- Vistas principales:
  - Login / Auth Guard.
  - Dashboard admin/técnico.
  - Módulo responsable (solicitudes, equipo).
- Reportes con Recharts.
- Pruebas con Jest + Testing Library.

### 🔹 Fase 4 — Funcionalidades avanzadas
- Exportación de reportes (Excel, PDF).
- Notificaciones internas en frontend.
- Monitoreo de logs y métricas.
- Accesibilidad (WCAG 2.1 AA).

### 🔹 Fase 5 — QA & Seguridad
- Auditoría de dependencias (`pip-audit`, `npm audit`, `bandit`).
- Configuración de RLS en Supabase.
- Pruebas E2E con Cypress.
- Validación contra Anexo B (Checklist LLM-Sec).

### 🔹 Fase 6 — Despliegue
- Configuración de Docker Compose.
- CI/CD con GitHub Actions.
- Despliegue backend (Docker/ECS/EKS).
- Despliegue frontend en Vercel.
- Validación en entorno productivo.

---

## Hitos Clave

- 📌 **Sprint 1** → Documentación base + Backend inicial.  
- 📌 **Sprint 2** → Frontend base + CRUD completo.  
- 📌 **Sprint 3** → Reportes + Exportación.  
- 📌 **Sprint 4** → QA + Seguridad avanzada.  
- 📌 **Sprint 5** → Deploy productivo.  

---

## Seguimiento
Cada fase debe actualizarse en este documento con:
- Estado: Pendiente / En curso / Completada.
- Fecha real de finalización.
- Relación con **Anexo F (DevLog)** y **Anexo A (Deuda Técnica)**.

---

## Ejemplo de Registro

### ROAD-001
- **Fase:** Backend CRUD (Fase 2).  
- **Fecha prevista:** 2025-09-05.  
- **Estado:** En curso.  
- **Notas:** Endpoint de solicitudes en pruebas unitarias.  
