# Anexo K — Plan de Pruebas y Calidad

## Propósito
Definir la estrategia de pruebas para asegurar la **calidad, seguridad y rendimiento** del sistema SISGEMEC.  
Este plan establece qué tipos de pruebas se realizan, con qué herramientas y cómo se registran los resultados.

---

## Tipos de Pruebas

### 1. **Unitarias**
- **Objetivo:** Validar componentes individuales (funciones, endpoints).  
- **Backend:** `pytest` en FastAPI.  
- **Frontend:** Jest + React Testing Library.  

### 2. **Integración**
- **Objetivo:** Verificar que los módulos funcionen juntos (ej. API ↔ DB ↔ Frontend).  
- **Herramienta:** `pytest` con test client en FastAPI.  

### 3. **End-to-End (E2E)**
- **Objetivo:** Simular el flujo completo de usuario (ej. crear solicitud → técnico atiende → responsable recibe notificación).  
- **Herramienta:** Cypress.  

### 4. **Seguridad**
- **Objetivo:** Validar autenticación, autorización y RLS en Supabase.  
- **Herramientas:** `pip-audit`, `npm audit`, `bandit`.  

### 5. **Performance**
- **Objetivo:** Asegurar que el sistema responde rápido bajo carga moderada.  
- **Herramientas:** Locust (Python).  

### 6. **Accesibilidad**
- **Objetivo:** Verificar que la UI cumple con WCAG 2.1 AA.  
- **Herramienta:** axe-core.  

---

## Flujo de QA

1. **Desarrollo**: Cada módulo debe incluir pruebas unitarias mínimas.  
2. **Pre-merge (PR)**: Ejecutar test suite (unitarias + linting).  
3. **CI/CD (GitHub Actions)**:  
   - Correr `pytest` para backend.  
   - Correr `jest` para frontend.  
   - Revisar auditorías (`pip-audit`, `npm audit`).  
4. **Entrega Sprint**: Ejecutar E2E con Cypress.  
5. **Producción**: Monitorear logs y errores (Sentry opcional).  

---

## Criterios de Aceptación

- [ ] 90% de cobertura mínima en pruebas unitarias.  
- [ ] Todos los endpoints críticos con tests de integración.  
- [ ] Flujo principal de solicitudes cubierto por E2E.  
- [ ] Auditorías de seguridad sin vulnerabilidades críticas.  
- [ ] UI con accesibilidad básica validada.  

---

## Registro de Resultados

Cada ciclo de pruebas debe registrarse aquí con un ID:

### QA-001
- **Fecha:** 2025-08-21  
- **Tipo de prueba:** Unitarias (backend).  
- **Resultado:** 15/15 tests aprobados.  
- **Incidencias:** Ninguna.  
- **Estado:** ✅ Aprobado.  

### QA-002
- **Fecha:** 2025-08-21  
- **Tipo de prueba:** Seguridad (`pip-audit`).  
- **Resultado:** 1 vulnerabilidad crítica en `urllib3`.  
- **Acción:** Actualizar a versión segura.  
- **Estado:** ⚠️ Pendiente.
