# Anexo A — Registro de Deuda Técnica

## Propósito
Este documento lleva un control de la **deuda técnica acumulada** en el proyecto SISGEMEC.  
La deuda técnica incluye decisiones rápidas, atajos, tareas postergadas o compromisos que requieren resolución futura para mantener la calidad del sistema.

---

## Estructura de Registro
Cada entrada debe seguir esta plantilla:

- **ID:** `DT-001` (número consecutivo)
- **Fecha:** YYYY-MM-DD
- **Descripción:** Resumen del problema o deuda.
- **Impacto:** Bajo / Medio / Alto (explicar consecuencias).
- **Área afectada:** Backend / Frontend / Base de Datos / DevOps / Docs.
- **Acción pendiente:** Qué se debe hacer para resolverlo.
- **Estado:** Pendiente / En curso / Resuelto.

---

## Ejemplos iniciales

### DT-001
- **Fecha:** 2025-08-21  
- **Descripción:** El sistema aún no tiene pruebas unitarias completas en el backend.  
- **Impacto:** Alto (riesgo de errores en producción).  
- **Área afectada:** Backend.  
- **Acción pendiente:** Implementar `pytest` en todos los módulos críticos.  
- **Estado:** Pendiente.

### DT-002
- **Fecha:** 2025-08-21  
- **Descripción:** La validación de roles en frontend todavía se hace de manera básica.  
- **Impacto:** Medio (puede permitir acceso incorrecto a vistas).  
- **Área afectada:** Frontend.  
- **Acción pendiente:** Implementar guardas de rutas y control granular en menú lateral.  
- **Estado:** Pendiente.
