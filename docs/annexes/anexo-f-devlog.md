# Anexo F — Development Log

## Propósito
Este documento funciona como un **registro histórico** de todo lo ocurrido durante el desarrollo de SISGEMEC.  
Aquí se anotan las decisiones técnicas, cambios de arquitectura, resultados de prompts de IA, hallazgos de bugs, y correcciones realizadas.

---

## Formato de Registro
Cada entrada debe seguir este esquema:

- **ID:** `DEV-001` (consecutivo)
- **Fecha:** YYYY-MM-DD
- **Área:** Backend / Frontend / DB / DevOps / Docs
- **Descripción:** Breve resumen de lo trabajado o descubierto.
- **Uso de IA:** Sí / No (si se utilizó IA para apoyar el cambio).
- **Resultado:** Implementado / Pendiente / Revertido
- **Notas adicionales:** Observaciones relevantes.

---

## Ejemplos iniciales

### DEV-001
- **Fecha:** 2025-08-21  
- **Área:** Backend  
- **Descripción:** Creación de archivo `main.py` con FastAPI y health check.  
- **Uso de IA:** Sí (Cursor generó base inicial).  
- **Resultado:** Implementado.  
- **Notas adicionales:** Revisar middleware de trace ID para mejorar con uuid4.

### DEV-002
- **Fecha:** 2025-08-21  
- **Área:** Frontend  
- **Descripción:** Configuración inicial de `package.json` y `tsconfig.json`.  
- **Uso de IA:** Sí.  
- **Resultado:** Implementado.  
- **Notas adicionales:** Asegurar que las versiones de Tailwind y Vite se mantengan actualizadas.

### DEV-003
- **Fecha:** 2025-08-21  
- **Área:** Seguridad  
- **Descripción:** Se detectó endpoint `/api/reportes` sin control de rol.  
- **Uso de IA:** No.  
- **Resultado:** Implementado (se agregó middleware).  
- **Notas adicionales:** Documentado también en **Anexo E — Seguridad**.
