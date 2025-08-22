# Anexo C — Procedimiento de Detección de Alucinaciones (RedFlags)

## Propósito
Este anexo define el proceso para **detectar y corregir alucinaciones de la IA** durante el desarrollo de SISGEMEC.  
Una *alucinación* ocurre cuando la IA inventa código, funciones, dependencias o conceptos que **no existen** o **no aplican al proyecto**.

---

## RedFlags comunes a revisar

- [ ] **Dependencias inexistentes:** la IA sugiere instalar paquetes que no existen en PyPI o npm.  
- [ ] **Funciones inventadas:** aparecen llamadas a métodos que no existen en FastAPI, Supabase o React.  
- [ ] **Rutas incorrectas:** endpoints mencionados que no están definidos en el backend.  
- [ ] **Campos de base de datos inventados:** tablas o columnas que no están en el esquema oficial (ver `database-schema-design.mdc`).  
- [ ] **Errores en seguridad:** uso de JWT hardcodeados, saltos de RLS o bypass de permisos.  
- [ ] **Copias de código irrelevante:** la IA inserta ejemplos genéricos que no encajan con SISGEMEC.  
- [ ] **Cambio de stack sin justificación:** IA propone tecnologías fuera del stack oficial (ej. Django, Angular, MongoDB).  

---

## Procedimiento cuando se detecta un RedFlag

1. **Marcar el hallazgo** en este documento con un ID: `RF-001`, `RF-002`, etc.  
2. **Registrar la ubicación**: archivo o fragmento de código donde apareció.  
3. **Corregir manualmente**: validar contra la documentación (`docs/project/`, `database-schema-design.mdc`, `.cursor/rules/`).  
4. **Documentar la corrección** en el **Development Log (Anexo F)**.  
5. **Actualizar reglas** en `.cursor/rules/` si el error se repite (para entrenar el contexto de Cursor).

---

## Ejemplos iniciales

### RF-001
- **Fecha:** 2025-08-21  
- **Descripción:** La IA sugirió instalar `fastapi-supabase` (paquete inexistente).  
- **Corrección:** Usar `supabase-py`, cliente oficial.  
- **Estado:** Resuelto.  

### RF-002
- **Fecha:** 2025-08-21  
- **Descripción:** En un endpoint de servicios, la IA inventó un campo `prioridad` en la tabla `servicios`.  
- **Corrección:** Revisar esquema oficial. Campo eliminado.  
- **Estado:** Resuelto.
