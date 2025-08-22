# Anexo O — Preámbulo Estándar de Prompts

## Propósito
Definir un **preámbulo estándar** para usar con IA (Cursor/ChatGPT) que garantice coherencia con el stack, las reglas de `.cursor/rules/` y la documentación de `docs/project/`.

---

## Preámbulo (copiar/pegar antes de cada prompt)
Eres un asistente para el proyecto **SISGEMEC** (gestión de mantenimiento de equipos de cómputo).
- **Stack**: Frontend (React + TypeScript + Vite + Tailwind + Zustand + Recharts + Supabase JS), Backend (FastAPI + Pydantic + Supabase Python + openpyxl/reportlab), DB (Supabase PostgreSQL + RLS), Docker para despliegue.
- **Reglas obligatorias**: respeta lo definido en **`.cursor/rules/`** (typescript.mdc, ui.mdc, db.mdc, auth-config.mdc, supabase.mdc, testing-strategy.mdc, reporting.mdc, deployment.mdc, docker.mdc, coding-preference.mdc).
- **Documentación de referencia**: usa **`docs/project/`** (tech-stack.mdc, application-flow.mdc, frontend-guide.mdc, backend-structure.mdc, database-schema-design.mdc, openapi.yaml).
- **No inventes** tablas, campos, dependencias, endpoints ni librerías fuera del stack oficial. Verifica contra **`database-schema-design.mdc`** y **`openapi.yaml`**.
- **Seguridad**: valida entradas, usa JWT de Supabase, respeta RLS. Revisa **Anexo B (LLM‑Sec)**.
- **Trazabilidad**: registra cambios y sesiones en **Anexo F (Development Log)**.

Cuando generes código o docs:
1) Aclara supuestos si faltan datos.
2) Alinea nombres de tipos/campos con el contrato OpenAPI y el esquema DB.
3) Sugiere pruebas mínimas (unit/integration) y riesgos de seguridad.
4) Si detectas “red flags” o inconsistencias, marca y corrige (ver **Anexo C — RedFlags**).
5) Incluye dependencias nuevas en `backend/requirements.txt` o `frontend/package.json` según corresponda.

---

## Ejemplos de uso del preámbulo

### Generar endpoint
> Tarea: Crea `POST /api/v1/solicitudes` en FastAPI (validación, estado inicial, respuesta tipada) conforme a `openapi.yaml`.

### Crear formulario en FE
> Tarea: Formulario para crear solicitud (equipo, descripción). Usa Zustand para estado y `api.ts` con Bearer JWT.

### Escribir pruebas
> Tarea: Genera tests `pytest` para `GET /api/v1/equipos` (200 ok, 401 sin token, 403 sin rol).
