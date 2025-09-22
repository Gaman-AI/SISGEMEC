# SISGEMEC 2.0 - Project Brief

## Project Overview
SISGEMEC 2.0 is a comprehensive equipment management system built with FastAPI + Supabase + React. The system manages equipment inventory, user profiles, and service requests for an organization.

## Current Mission: Excel Import Refactoring
**Objective**: Completely refactor the Excel import module to separate it into two independent importers: **Users** and **Equipment**, while fixing current 422 errors and implementing proper security.

## Key Requirements

### 1. Eliminate 422 Unprocessable Entity Errors
- Backend endpoints must accept `multipart/form-data` with exact key `file`
- Use FastAPI `file: UploadFile = File(...)` parameter (no Body)
- Read bytes with `await file.read()`
- Avoid dependencies that alter the body
- Clear responses: 400 (invalid template), 401/403 (token), 500 (internal)

### 2. Security Implementation
- Use Supabase Service Role centralized in singleton
- Protect endpoints with `Authorization: Bearer <API_ADMIN_TOKEN>`
- No key exposure in frontend

### 3. Two Independent Importers
- **Import Users**: Creates/updates in `auth.users` (admin) and `public.profiles` (upsert by email, role='RESPONSABLE', active=true)
- **Import Equipment**: Creates/updates in `public.equipos` (upsert by num_serie), links responsable_id by email, validates Estado against `public.estados_equipo`

### 4. JSON Serializable Responses
- Never return Supabase SDK objects
- Return metrics and errors in string arrays
- Don't abort batch for partial errors

### 5. Stable Frontend
- Two simple screens for each importer
- Send with FormData (key 'file') and Authorization header
- Don't manually set Content-Type
- Show metrics and errors in lists/strings

### 6. Idempotency
- Upsert by email (users) and by num_serie (equipment)
- Re-import doesn't duplicate

## Database Schema (Existing)

### `public.profiles`
- `user_id uuid PK` (FK to `auth.users(id)`)
- `full_name text NOT NULL`
- `email text UNIQUE`
- `department text`, `phone text`, `location text`
- `role user_role NOT NULL DEFAULT 'RESPONSABLE'`
- `active boolean NOT NULL DEFAULT true`
- `created_at timestamptz DEFAULT now()`
- `updated_at timestamptz DEFAULT now()`

### `public.estados_equipo`
- `nombre text UNIQUE` with values: **`ACTIVO`, `EN_MANTENIMIENTO`, `DE_BAJA`**

### `public.equipos`
- `equipo_id bigint PK`
- `num_serie text UNIQUE` (natural upsert key)
- `estado_equipo_id bigint` (FK to `estados_equipo`)
- `responsable_id uuid` (FK to `profiles.user_id`)
- Additional fields: `tipo_equipo`, `marca`, `modelo`, `procesador`, `ram`, `disco`, `sistema_operativo`, `ubicacion_actual`, `fecha_ingreso date`, `fecha_salida date`, `observaciones`, `created_at`, `updated_at`

## Excel Templates

### A) Import Users → Sheet "Usuarios"
Headers (row 1):
- `First Name` (required)
- `Last Name` (required)
- `Email Address` (required, UNIQUE global)
- `Department` (optional)
- `Phone` (optional)
- `Location` (optional)

### B) Import Equipment → Sheet "Equipos"
Headers (row 1):
- `Tipo`, `Marca`, `Modelo`
- `Número de serie` (required, UNIQUE)
- `Procesador`, `RAM`, `Disco`, `Sistema Operativo`
- `Ubicación actual`
- `Estado` (required → normalize)
- `Fecha de ingreso` (YYYY-MM-DD, optional)
- `Fecha de salida` (YYYY-MM-DD, optional)
- `Responsable email` (required; must exist in profiles)
- `Observaciones`

## Success Criteria
1. Separate and stable import: Users creates/updates auth.users and profiles (role=RESPONSABLE)
2. Equipment import does upsert by num_serie, relates by email, validates and maps Estado
3. Zero 422 in both flows; errors with 400/401/403/500 (clear messages)
4. Plain JSON serializable responses with metrics + errors[] per row
5. Frontend with two simple screens, no crashes from object rendering
6. Idempotency: re-import doesn't duplicate
7. No existing modules broken
