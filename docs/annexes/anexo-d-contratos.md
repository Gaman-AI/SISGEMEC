# Anexo D — Verificación de Contratos (API)

## Propósito
Este documento asegura que el **contrato de la API** (definido en `docs/contracts/openapi.yaml`) se mantenga **coherente** con:
- El backend (FastAPI).
- El frontend (React + TypeScript).
- La base de datos (Supabase, PostgreSQL).

---

## Checklist de verificación

1. **OpenAPI actualizado**
   - [ ] Cada nuevo endpoint agregado en FastAPI está reflejado en `openapi.yaml`.
   - [ ] Los parámetros, request bodies y responses tienen los mismos nombres y tipos.

2. **Backend (FastAPI)**
   - [ ] Los modelos Pydantic (`schemas/`) coinciden con el contrato.
   - [ ] Los controladores (`api/v1/*.py`) devuelven respuestas tipadas.

3. **Frontend (React + TS)**
   - [ ] Los tipos TypeScript (`src/types/`) coinciden con los esquemas del contrato.
   - [ ] Las llamadas API (`src/lib/api.ts`) usan las rutas y payloads correctos.

4. **Base de datos (Supabase)**
   - [ ] Los campos de las tablas coinciden con lo descrito en el contrato.
   - [ ] No se usan columnas inexistentes o inventadas.

---

## Procedimiento de verificación

1. **Cambio detectado** → Nuevo endpoint, campo o respuesta en FastAPI.
2. **Actualizar contrato** → Modificar `docs/contracts/openapi.yaml`.
3. **Revisar frontend** → Ajustar tipos y llamadas API.
4. **Validar DB** → Confirmar que los campos existen en `database-schema-design.mdc`.
5. **Registrar en Development Log (Anexo F)** → Dejar constancia del ajuste.

---

## Ejemplo de Registro

### VC-001
- **Fecha:** 2025-08-21  
- **Cambio:** Se agregó `PUT /api/solicitudes/{id}` para actualizar estado.  
- **Acción:** Actualizado `openapi.yaml` + tipo TS `SolicitudUpdate`.  
- **Estado:** Validado.

### VC-002
- **Fecha:** 2025-08-21  
- **Cambio:** Respuesta de `GET /api/equipos` ahora incluye `estado`.  
- **Acción:** Ajustado Pydantic `EquipoOut` y tipo TS `Equipo`.  
- **Estado:** Validado.
