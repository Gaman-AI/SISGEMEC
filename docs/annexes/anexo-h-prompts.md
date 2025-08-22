# Anexo H — Biblioteca de Prompts

## Propósito
Este documento recopila los **prompts más útiles y probados** empleados en el desarrollo de SISGEMEC, para asegurar consistencia y eficiencia en el uso de la IA.

---

## Categorías de Prompts

### 1. **Generación de Código**
Ejemplo:
Eres un asistente de desarrollo en un proyecto llamado SISGEMEC.
Stack: Frontend React+TS con Vite, Backend FastAPI (Python), Supabase (DB+Auth).
Sigue siempre las reglas en .cursor/rules/ y la documentación en docs/project/.
Tarea: genera un endpoint en FastAPI para crear un nuevo equipo con validaciones básicas.



---

### 2. **Depuración / Debugging**
Ejemplo:
Analiza este error en FastAPI:
<pegar error de consola aquí>
Sugiere una solución paso a paso, validando contra el esquema de database-schema-design.mdc.



---

### 3. **Seguridad**
Ejemplo:
Revisa el siguiente fragmento de código y dime si cumple con el Checklist de Seguridad (Anexo B).
Si no lo cumple, sugiere correcciones.



---

### 4. **Documentación**
Ejemplo:
Genera documentación técnica para este módulo siguiendo el estilo de los archivos en docs/project/.
No inventes funciones ni librerías fuera del stack oficial.


---

### 5. **Pruebas**
Ejemplo:
Crea pruebas unitarias con pytest para este endpoint:
POST /api/solicitudes
Valida casos de éxito, error de validación y acceso no autorizado.


---

### 6. **Optimización**
Ejemplo:
Analiza este código y sugiere mejoras de rendimiento o legibilidad, manteniendo la compatibilidad con el stack oficial.



---

## Procedimiento de uso
1. Seleccionar el prompt más cercano a la tarea actual.  
2. Adaptar datos concretos (ruta, código, error, etc.).  
3. Ejecutar en Cursor o ChatGPT.  
4. Documentar resultados en **Anexo F — Development Log**.  

---

## Ejemplo de Registro

### PR-001
- **Fecha:** 2025-08-21  
- **Prompt usado:** Generación de Código (FastAPI equipos).  
- **Resultado:** Endpoint creado correctamente.  
- **Relacionado:** DevLog DEV-004.  