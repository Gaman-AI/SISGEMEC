# Anexo P — Manifest de Sesión IA

## Propósito
Registrar de forma **estructurada** cada sesión importante con IA (Cursor/ChatGPT) para garantizar trazabilidad y reproducibilidad.

---

## Plantilla de Manifest
Completar los siguientes campos **por sesión**:

- **ID Sesión:** IA-YYYYMMDD-XXX
- **Fecha/Hora:** YYYY-MM-DD HH:mm (TZ local)
- **Objetivo de la sesión:** (p.ej. generar endpoint `equipos`, crear formulario `solicitudes`)
- **Archivos/reglas de contexto usados:** (listar .cursor/rules/.mdc y docs clave)
- **Prompt de preámbulo aplicado:** Sí/No (si se usó **Anexo O**)
- **Prompts ejecutados (resumen):**
  - P1: …
  - P2: …
- **Archivos modificados:** (rutas afectadas)
- **Dependencias nuevas:** (backend/requirements.txt o frontend/package.json)
- **Checklist LLM‑Sec (Anexo B):** ✅/⚠️ (anotar hallazgos si ⚠️)
- **Contratos (Anexo D + openapi.yaml):** ✅/⚠️
- **RedFlags (Anexo C):** (IDs si hubo)
- **Resultado de la sesión:** Implementado / Pendiente / Revertido
- **Notas:** observaciones, decisiones de arquitectura, TODOs

---

## Ejemplo (relleno)
- **ID Sesión:** IA-2025-08-21-001  
- **Fecha/Hora:** 2025-08-21 18:40  
- **Objetivo:** Crear contrato `docs/project/openapi.yaml` y routers vacíos.  
- **Contexto:** `.cursor/rules/*`, `docs/project/*`  
- **Preámbulo (Anexo O):** Sí  
- **Prompts:**  
  - P1: “Genera contrato OpenAPI para equipos/solicitudes/servicios/reportes”  
- **Archivos modificados:** `docs/project/openapi.yaml`  
- **Dependencias nuevas:** N/A  
- **LLM‑Sec:** ✅  
- **Contratos:** ✅  
- **RedFlags:** N/A  
- **Resultado:** Implementado  
- **Notas:** Alinear estados de `solicitudes` con DB.
