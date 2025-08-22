# SISGEMEC — Sistema de Gestión de Mantenimiento de Equipos de Cómputo

SISGEMEC es una plataforma web para **registrar, atender y reportar** solicitudes de mantenimiento de equipos de cómputo. Está compuesta por:
- **Frontend:** React + TypeScript (Vite) + Tailwind.
- **Backend:** FastAPI (Python).
- **Base de datos y autenticación:** Supabase (PostgreSQL + RLS + Auth).
- **Despliegue:** Docker (solo producción) + Vercel (FE) + contenedor para BE.
- **Asistencia IA:** Cursor (Context 7 MCP) con reglas en `.cursor/rules/`.

---

## Módulos principales
- **Inventario de equipos** (CRUD).
- **Solicitudes de servicio** (creación, estados, atención por técnicos).
- **Servicios realizados** (historial y evidencias).
- **Reportes** (filtros; exportación a Excel/PDF).
- **Autenticación/Autorización** con roles (admin, técnico, responsable) y RLS.

---

## Stack tecnológico
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Zustand/Context, Recharts, Supabase JS.
- **Backend:** FastAPI, Pydantic, Supabase Python Client, (opcional SQLAlchemy), openpyxl/reportlab para exportes.
- **DB:** Supabase PostgreSQL + Storage + RLS.
- **CI/CD:** GitHub Actions (lint, tests, auditorías).
- **Docker (prod):** imágenes separadas de FE/BE; compose para orquestar.

---

## Estructura de carpetas (resumen)
SISGEMEC/
backend/
main.py
requirements.txt
app/ (api, core, models, schemas, services, repositories, utils)
tests/
frontend/
package.json
tsconfig.json
src/ (routes, pages, components, store, lib, styles, types, utils)
.cursor/
rules/ (typescript.mdc, ui.mdc, db.mdc, auth-config.mdc, supabase.mdc, testing-strategy.mdc, reporting.mdc, deployment.mdc, docker.mdc, coding-preference.mdc)
docs/
project/ (tech-stack.mdc, application-flow.mdc, frontend-guide.mdc, backend-structure.mdc, database-schema-design.mdc, openapi.yaml)
anexos/ (A–N: deuda, LLM-Sec, redflags, contratos, seguridad, devlog, IA, prompts, cursor-context, project-prompts, test-plan, deployment, compliance, roadmap)
.github/
workflows/ (backend-ci.yml, frontend-ci.yml)
docker/ (backend.Dockerfile, frontend.Dockerfile, docker-compose.prod.yml)
.gitignore
README.md



---

## Reglas de contexto (Cursor — Context 7 MCP)
- **Fuente de verdad de reglas:** `.cursor/rules/`.
- **Documentación funcional y de arquitectura:** `docs/project/`.
- **Control, auditoría y trazabilidad:** `docs/anexos/`.
- Cada vez que se genere código con IA:
  - Respetar `.cursor/rules/`.
  - Registrar en **Anexo F — Development Log**.
  - Pasar **Anexo B — Checklist LLM‑Sec**.
  - Verificar contrato con **Anexo D — Contratos** y `docs/project/openapi.yaml`.

---

## Requisitos previos
- **Backend:** Python 3.11+, `venv` local; dependencias en `backend/requirements.txt`.
- **Frontend:** Node.js 18+ y **pnpm**; dependencias en `frontend/package.json`.
- **Supabase:** proyecto creado (URL, ANON KEY) y RLS activado.
- **Variables de entorno:**
  - `backend/.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_ISSUER`, etc.
  - `frontend/.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.

---

## Cómo trabajar (visión general)
> Si prefieres sin terminal, usa Cursor/Explorer para crear archivos. Si usas terminal, estos son los pasos típicos.

**Backend (visión):**
- Crear `venv`, instalar `requirements.txt`, punto de entrada `main.py`.
- Endpoints bajo `/api/v1/*`, health en `/healthz`.
- Validación JWT (emitido por Supabase Auth).
- Exportes Excel/PDF con `openpyxl` y `reportlab`.

**Frontend (visión):**
- Proyecto Vite + TS, Tailwind configurado.
- Rutas: Login, Dashboard, Equipos, Solicitudes, Reportes, Mi Equipo.
- Estado global (Zustand/Context) y cliente Supabase JS.
- Cliente API que agrega `Authorization: Bearer <JWT>`.

---

## Contrato de API
El contrato se define en `docs/project/openapi.yaml`.  
Se usa para **verificación de contratos** entre Frontend y Backend.

---

## Calidad y seguridad
- **CI/CD**:
  - Backend: `black`, `isort`, `mypy`, `bandit`, `pip-audit`, `pytest`.
  - Frontend: `eslint`, `tsc --noEmit`, `jest` (si se incluye), `npm audit`.
- **Anexos obligatorios por PR asistido por IA**:
  - LLM‑Sec (B), RedFlags (C), DevLog (F), Contratos (D).

---

## Despliegue (resumen)
- **Frontend:** Vercel (build estático).
- **Backend:** Contenedor Docker (ECS/EKS/VPS).
- **Supabase:** servicio gestionado (DB + Auth + Storage).
- **Compose (prod):** `docker/docker-compose.prod.yml`.

---

## Checklist antes de programar
- [ ] `.cursor/rules/` completos y revisados.
- [ ] `docs/project/` listos (incluye `openapi.yaml`).
- [ ] `annexes/` creados (A–N).
- [ ] `backend/requirements.txt` y `frontend/package.json` preparados.
- [ ] `.env.example` en **backend** y **frontend** documentados.
- [ ] Workflows CI en `.github/workflows/`.

---

## Licencia
Si el proyecto es privado, puedes omitir. Si público, considera **MIT**.

---

## Contribuir
Crea PRs con:
- Checklist LLM‑Sec pasado.
- DevLog actualizado.
- Verificación de contrato y RLS cuando aplique.