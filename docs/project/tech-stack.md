# Tech Stack

## 1. Technology Stack Overview

**Objetivo:** Plataforma moderna para la **gestión de mantenimiento de equipos de cómputo (SISGEMEC)**, con módulos de inventario, solicitudes de servicio, reportes y notificaciones.

**Arquitectura:** Sistema distribuido con **Frontend en React + TypeScript**, **Backend API en FastAPI (Python)** y **Base de datos en Supabase (PostgreSQL + RLS)**.

**Capacidades principales:**
- Autenticación y control de roles (administrador, técnico, responsable).
- CRUD completo de equipos, usuarios, solicitudes y servicios.
- Exportación e importación de datos (Excel, PDF).
- Notificaciones internas (y en futuro, correo electrónico).
- Reportes con filtros avanzados.

**Tecnologías clave:**  
React + TypeScript, FastAPI, Supabase (Auth, DB, Storage), Docker, GitHub Actions (CI/CD).

---

## 2. Frontend Technologies

- **Framework:** React (con Vite/Next opcional) + TypeScript.
- **Estilos:** Tailwind CSS.
- **Gestión de estado:** Zustand o Context API.
- **Gráficas/Reportes:** Recharts.
- **Autenticación cliente:** Supabase JS Client.
- **Comunicación API:** fetch/axios.
- **Hosting:** Vercel (primario).

---

## 3. Backend Technologies

- **Lenguaje/Framework:** Python 3.x, FastAPI.
- **Librerías principales:** FastAPI, Pydantic, Supabase-py, python-jose (JWT), SQLAlchemy (si aplica).
- **Responsabilidades:**
  - Manejo de API REST (`/api/*`).
  - Autenticación y autorización con JWT + RLS de Supabase.
  - CRUD de entidades (equipos, usuarios, solicitudes, servicios).
  - Generación de reportes y exportes (Excel/PDF).

---

## 4. Database & Storage

- **Base de datos principal:** Supabase PostgreSQL.
- **Características:**
  - Tablas para usuarios, equipos, solicitudes, servicios, reportes.
  - Row-Level Security (RLS) según roles.
- **Almacenamiento de archivos:** Supabase Storage (para exportes y adjuntos).

---

## 5. Infrastructure & Deployment

- **Contenedores:** Docker (frontend + backend).
- **Orquestación:** Docker Compose (local), ECS/EKS o similar en producción.
- **CI/CD:** GitHub Actions (build, test, deploy).
- **Monitoreo:** Supabase logs + Datadog (opcional).

---

## 6. Security Architecture

- **Autenticación:** Supabase Auth (correo empresarial).
- **Autorización:** Roles (admin, técnico, responsable) + RLS.
- **Cifrado:**
  - Datos en tránsito: HTTPS/TLS.
  - Datos en reposo: cifrado nativo de Supabase.
- **Gestión de secretos:** Variables de entorno en `.env` y GitHub Secrets.

---

## 7. Data Flow Summary

1. **Login:** Usuario inicia sesión con correo/contraseña en Supabase Auth → recibe JWT.
2. **Operaciones CRUD:** Frontend llama al Backend (FastAPI) con JWT → FastAPI valida permisos → consulta/actualiza DB en Supabase.
3. **Solicitudes de servicio:** Responsable crea solicitud → técnico recibe notificación → actualiza estado.
4. **Reportes:** Admin/técnico filtra información → se consulta DB → exportación Excel/PDF.
5. **Notificaciones:** Se envían eventos internos (y en futuro correos).
