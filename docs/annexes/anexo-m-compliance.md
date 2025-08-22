# Anexo M — Checklist de Compliance

## Propósito
Este anexo asegura que el sistema SISGEMEC cumpla con los **requisitos legales, organizacionales y de seguridad** aplicables, así como con las mejores prácticas de desarrollo.

---

## Áreas de Compliance

### 1. **Protección de Datos**
- [ ] Se cumple con la **Ley de Protección de Datos Personales** aplicable (ej. México: LFPDPPP).
- [ ] Se almacena solo la información necesaria de usuarios.
- [ ] Todos los datos sensibles están cifrados en tránsito (TLS).
- [ ] Supabase RLS asegura que cada usuario solo accede a su información.

### 2. **Seguridad de la Información**
- [ ] Políticas de contraseñas seguras aplicadas en Supabase Auth.
- [ ] JWT con expiración configurada.
- [ ] Ningún secreto está versionado en Git (todos en `.env` o GitHub Secrets).
- [ ] Auditorías de dependencias (npm audit, pip-audit) realizadas por sprint.

### 3. **Accesibilidad**
- [ ] La UI cumple parcialmente con **WCAG 2.1 AA**.
- [ ] Uso de `aria-label` y soporte para lectores de pantalla.
- [ ] Contraste de colores validado.

### 4. **Licencias de Software**
- [ ] Todas las librerías usadas tienen licencia permisiva (MIT, Apache, BSD).
- [ ] Ninguna dependencia con licencias restrictivas (GPL fuerte) en producción.

### 5. **Organizacional**
- [ ] Documentación completa en `docs/project/`.
- [ ] Anexos actualizados por sprint (deuda técnica, seguridad, dev log).
- [ ] CI/CD integrado con validaciones de tests y seguridad.

---

## Procedimiento
1. Antes de cada **release**, ejecutar esta checklist.
2. Registrar resultado en sección **Historial de Compliance**.
3. Si algún ítem queda pendiente → documentar en **Anexo A (Deuda Técnica)**.

---

## Historial de Compliance

### CMP-001
- **Fecha:** 2025-08-21  
- **Revisión:** Sprint 1.  
- **Resultado:**  
  - Protección de datos ✅  
  - Seguridad de la información ⚠️ (faltan pruebas de expiración JWT).  
  - Accesibilidad ⚠️ (falta test con axe-core).  
  - Licencias ✅  
  - Organizacional ✅  
- **Estado:** Pendiente de corrección.  

### CMP-002
- **Fecha:** 2025-09-01  
- **Revisión:** Sprint 2.  
- **Resultado:** Pendiente de ejecución.  
