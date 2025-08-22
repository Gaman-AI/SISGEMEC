# Anexo J — Project Prompts

## Propósito
Este anexo centraliza los **prompts de proyecto de alto nivel**, utilizados en Cursor para generar y mantener la documentación técnica de SISGEMEC.  
Sirve como guía para regenerar documentación o alinear nuevas secciones.

---

## Lista de Prompts del Proyecto

### 1. **Project Requirements Document Prompt**
Genera el documento de requisitos para el sistema SISGEMEC, incluyendo:

Objetivos principales.

Roles de usuario (Admin, Técnico, Responsable).

Funcionalidades mínimas (CRUD, reportes, solicitudes, notificaciones).

Restricciones tecnológicas (stack definido en docs/project/tech-stack.mdc).


---

### 2. **Backend Structure Prompt**
Describe la estructura del backend de SISGEMEC con FastAPI:

Endpoints principales (/api/equipos, /api/solicitudes, /api/servicios, /api/reportes).

Integración con Supabase (DB, Auth, Storage).

Seguridad con JWT y RLS.

Uso de Docker para despliegue.



---

### 3. **Technology Stack Prompt**
Genera el documento Tech Stack para SISGEMEC:

Frontend (React + TS, Tailwind, Zustand/Context).

Backend (FastAPI, Supabase-py, JWT, SQLAlchemy opcional).

DB (Supabase PostgreSQL + Storage).

Infraestructura (Docker, GitHub Actions, Vercel).

Seguridad (RLS, HTTPS, cifrado en reposo).



---

### 4. **Frontend Design Guidelines Prompt**
Crea una guía de diseño frontend:

Estructura de carpetas.

Estilos con Tailwind y Headless UI.

Manejo de estado con Zustand/Context.

Gráficas con Recharts.

Menús dinámicos según rol.


---

### 5. **File Structure Prompt**
Define el árbol de carpetas y archivos del proyecto SISGEMEC, considerando:

backend/ (FastAPI con main.py y requirements.txt).

frontend/ (React + TS con package.json y tsconfig.json).

.cursor/rules/ (reglas de desarrollo).

docs/project/ (documentación).

annexes/ (control y trazabilidad).



---

### 6. **Application Flow Prompt**
Describe el flujo general del sistema:

Login con Supabase Auth.

Flujo de solicitudes (crear → atender → notificar).

Consulta de equipos y servicios.

Generación de reportes y exportes.



---

### 7. **Schema Design Prompt**
Diseña el esquema de base de datos de SISGEMEC:

Tablas usuarios, equipos, solicitudes, servicios, reportes.

Relaciones FK.

Campos principales.

RLS para roles.



---

## Procedimiento de Uso
1. Seleccionar el prompt adecuado según la necesidad.  
2. Usarlo en Cursor/ChatGPT para regenerar o actualizar documentación.  
3. Validar contra los archivos en `docs/project/`.  
4. Registrar cambios en **Anexo F — Development Log**.  