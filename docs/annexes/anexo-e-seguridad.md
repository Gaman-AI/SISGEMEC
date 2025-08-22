# Anexo E — Resultados de Seguridad

## Propósito
Este documento registra los hallazgos de seguridad en el proyecto SISGEMEC, incluyendo revisiones manuales, análisis automáticos (pip-audit, npm audit, bandit), y pruebas de cumplimiento (OWASP, RLS en Supabase).

---

## Checklist de revisiones de seguridad

- [ ] **Dependencias seguras**: `pip-audit` y `npm audit` ejecutados y sin vulnerabilidades críticas.  
- [ ] **Autenticación**: Verificado uso de Supabase Auth con JWT.  
- [ ] **RLS en Supabase**: Confirmado que cada tabla tiene políticas correctas.  
- [ ] **Manejo de secretos**: Ningún secreto hardcodeado; todos en `.env`.  
- [ ] **Logs y errores**: Sin datos sensibles en mensajes de error o logs.  
- [ ] **Validación de inputs**: Todos los endpoints validan correctamente entradas de usuario.  
- [ ] **HTTPS/TLS**: Comunicación cifrada en tránsito.  

---

## Registro de hallazgos

### SEC-001
- **Fecha:** 2025-08-21  
- **Hallazgo:** Dependencia `axios` versión antigua con vulnerabilidad reportada.  
- **Acción:** Actualizada a versión segura `^1.7.2`.  
- **Estado:** Resuelto.  

### SEC-002
- **Fecha:** 2025-08-21  
- **Hallazgo:** Endpoint `/api/reportes` no verificaba rol del usuario.  
- **Acción:** Se agregó middleware de autorización en FastAPI.  
- **Estado:** Resuelto.  

### SEC-003
- **Fecha:** 2025-08-21  
- **Hallazgo:** RLS no configurado en tabla `servicios`.  
- **Acción:** Política agregada en Supabase.  
- **Estado:** Pendiente.  

---

## Procedimiento
1. Ejecutar herramientas de seguridad (`pip-audit`, `npm audit`, `bandit`) al menos 1 vez por sprint.  
2. Revisar resultados y registrar cada hallazgo aquí con ID (`SEC-XXX`).  
3. Documentar la corrección y marcar estado (Pendiente / Resuelto).  
4. Si aplica, actualizar reglas en `.cursor/rules/` para prevenir futuros errores.  

---

## Referencias
- [OWASP Top 10](https://owasp.org/Top10/)  
- [Supabase Security Docs](https://supabase.com/docs/guides/security)  
- [Bandit (Python Security)](https://bandit.readthedocs.io/en/latest/)  
- [pip-audit](https://pypi.org/project/pip-audit/)  
