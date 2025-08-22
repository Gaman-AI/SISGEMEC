# Anexo G — Limitaciones de la IA

## Propósito
Este anexo documenta las **limitaciones y riesgos del uso de IA** en el desarrollo de SISGEMEC, con el fin de tener un marco de control y prevención de errores.

---

## Limitaciones identificadas

### 1. **Alucinaciones**
- Riesgo: La IA puede inventar funciones, dependencias o rutas que no existen.  
- Mitigación: Revisar contra `docs/project/` y `database-schema-design.mdc`. Registrar en **Anexo C (RedFlags)**.

### 2. **Inconsistencias de stack**
- Riesgo: La IA podría sugerir frameworks fuera del stack oficial (ej. Django, Angular, MongoDB).  
- Mitigación: Recordar que el stack está definido en `tech-stack.mdc`. Rechazar cualquier cambio no documentado.

### 3. **Errores de seguridad**
- Riesgo: Generación de código con JWT hardcodeados, saltos de RLS, o bypass de autenticación.  
- Mitigación: Revisar cada entrega con el **Checklist LLM-Sec (Anexo B)**.

### 4. **Sesgos de entrenamiento**
- Riesgo: La IA puede recomendar librerías obsoletas o no mantenidas.  
- Mitigación: Validar cada dependencia con `pip-audit` y `npm audit`.

### 5. **Falta de contexto completo**
- Riesgo: Si la IA no tiene acceso a toda la documentación, puede generar soluciones parciales o incoherentes.  
- Mitigación: Mantener actualizados `.cursor/rules/` y `docs/project/`.

### 6. **Dependencia excesiva**
- Riesgo: Basarse 100% en la IA puede llevar a no entender bien el código generado.  
- Mitigación: Siempre acompañar con validación manual y registrar decisiones en **Anexo F (Development Log)**.

---

## Procedimiento de control
1. Al recibir código generado por IA → revisar con **Anexo B (Checklist LLM-Sec)** y **Anexo C (RedFlags)**.  
2. Registrar cualquier error o hallazgo en **Anexo F (Development Log)**.  
3. Documentar cambios estructurales en `docs/project/`.  
4. Actualizar `.cursor/rules/` si se encuentra un patrón de error recurrente.  

---

## Ejemplos de registros

### AI-LIM-001
- **Fecha:** 2025-08-21  
- **Descripción:** Cursor sugirió el paquete `fastapi-supabase` (no existe).  
- **Mitigación aplicada:** Se usó `supabase-py`.  
- **Relacionado:** RedFlag RF-001, DevLog DEV-003.  
- **Estado:** Resuelto.

### AI-LIM-002
- **Fecha:** 2025-08-21  
- **Descripción:** ChatGPT propuso usar Django ORM en lugar de SQLAlchemy/Supabase.  
- **Mitigación aplicada:** Rechazado, stack oficial es FastAPI + Supabase.  
- **Relacionado:** Tech Stack.  
- **Estado:** Resuelto.
