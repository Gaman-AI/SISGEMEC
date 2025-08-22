# Anexo I — Cursor Context (MCP)

## Propósito
Este documento describe cómo se ha configurado el **Context 7 MCP de Cursor** para SISGEMEC, con el fin de garantizar que la IA tenga acceso a la información correcta y trabaje bajo las reglas establecidas.

---

## Archivos y Carpetas de Contexto

- **`.cursor/rules/`**
  - Contiene las reglas obligatorias de desarrollo.
  - Ejemplos: `typescript.mdc`, `ui.mdc`, `db.mdc`, `auth-config.mdc`, `supabase.mdc`, `docker.mdc`.

- **`docs/project/`**
  - Documentación funcional y técnica del proyecto.
  - Ejemplos: `tech-stack.mdc`, `application-flow.mdc`, `frontend-guide.mdc`, `backend-structure.mdc`, `database-schema-design.mdc`.

- **`annexes/`**
  - Documentos de control (seguridad, prompts, limitaciones de IA, contratos, etc.).
  - Refuerzan la trazabilidad y coherencia del proyecto.

---

## Reglas de Contexto (MCP)

1. **Prioridad de Archivos**
   - Primero se leen las reglas en `.cursor/rules/`.
   - Luego se consulta la documentación en `docs/project/`.
   - Finalmente, se revisan registros en `annexes/`.

2. **Restricciones**
   - La IA **no puede cambiar el stack** (debe seguir `tech-stack.mdc`).
   - No puede inventar funciones, tablas o endpoints (validar contra `database-schema-design.mdc` y `backend-structure.mdc`).
   - Todo código debe cumplir con los estilos definidos en `ui.mdc` y `typescript.mdc`.

3. **Buenas prácticas**
   - Registrar cada uso de IA en **Anexo F (Development Log)**.
   - Documentar prompts útiles en **Anexo H (Prompts Library)**.
   - Usar **Anexo C (RedFlags)** para registrar alucinaciones detectadas.

---

## Ejemplo de Flujo de Contexto en Cursor

1. Usuario pide: *"Genera un endpoint para registrar solicitudes."*  
2. Cursor consulta:
   - `.cursor/rules/db.mdc` → reglas de conexión BD.  
   - `docs/project/backend-structure.mdc` → estructura API.  
   - `docs/project/database-schema-design.mdc` → tabla `solicitudes`.  
3. Genera código alineado con el stack oficial.  
4. Usuario valida con **Anexo B (LLM-Sec Checklist)** y registra resultado en **Anexo F (DevLog)**.

---

## Referencias
- [Cursor Docs — MCP Context](https://docs.cursor.sh/)  
- Archivos locales del proyecto en `.cursor/rules/`, `docs/project/`, `annexes/`.  
