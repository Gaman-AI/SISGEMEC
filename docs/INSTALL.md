# Manual de Instalación - SISGEMEC 2.0

## 📌 Introducción

**SISGEMEC 2.0** es un sistema de gestión de mantenimiento de equipos de cómputo que permite registrar, atender y reportar solicitudes de mantenimiento. El sistema está compuesto por:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python 3.11+) con Supabase
- **Base de datos**: Supabase (PostgreSQL con Row Level Security)
- **Autenticación**: Supabase Auth con JWT

Este manual te guiará paso a paso para clonar, configurar y ejecutar el sistema completo en tu entorno local.

> **Nota importante**: Este manual está basado en la rama `feature/licenses-module`. Si trabajas con otra rama, ajusta los comandos de checkout según corresponda.

---

## ✅ Requisitos previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

### Software necesario

1. **Git** (versión 2.0+)
   - Descarga: https://git-scm.com/downloads
   - Verifica instalación: `git --version`

2. **Python 3.11 o superior**
   - Descarga: https://www.python.org/downloads/
   - Verifica instalación: `python --version` o `python3 --version`
   - **Importante**: Durante la instalación, marca la opción "Add Python to PATH"

3. **Node.js 18 o superior + npm**
   - Descarga: https://nodejs.org/
   - Verifica instalación: `node --version` y `npm --version`
   - Recomendado: Node.js 18 LTS o superior

4. **Cuenta y proyecto en Supabase**
   - Crea una cuenta gratuita en: https://supabase.com
   - Crea un nuevo proyecto
   - Obtén las siguientes credenciales desde **Settings → API**:
     - `SUPABASE_URL` (URL del proyecto)
     - `SUPABASE_ANON_KEY` (anon/public key)
     - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - **manténla secreta**)

### Opcional

- **Docker** (solo si planeas usar contenedores para producción)
- Editor de código recomendado: **VS Code** o **Cursor**

---

## 📥 Clonar el repositorio y seleccionar rama

1. **Clona el repositorio** (reemplaza `<URL_DEL_REPO>` con la URL real de tu repositorio):

```bash
git clone <URL_DEL_REPO>
cd SISGEMEC
```

2. **Cambia a la rama de trabajo actual**:

```bash
git checkout feature/licenses-module
```

> Si trabajas con otra rama, reemplaza `feature/licenses-module` con el nombre de tu rama.

3. **Verifica que estás en la rama correcta**:

```bash
git branch
```

Deberías ver un asterisco (*) junto a `feature/licenses-module`.

---

## 🔐 Configurar variables de entorno

El sistema requiere archivos `.env` tanto en el backend como en el frontend. Estos archivos contienen credenciales sensibles y **NO deben subirse al repositorio**.

### Backend - Variables de entorno

1. **Navega a la carpeta del backend**:

```bash
cd backend
```

2. **Copia el archivo de ejemplo**:

```bash
# En Windows (PowerShell)
Copy-Item env.example .env

# En Windows (CMD)
copy env.example .env

# En Linux/Mac
cp env.example .env
```

3. **Edita el archivo `.env`** con un editor de texto y configura las siguientes variables:

```env
# Supabase Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# JWT Configuration
JWT_SECRET=tu-jwt-secret-aqui-genera-uno-seguro
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Application Configuration
DEBUG=true
ENVIRONMENT=development

# Import Configuration (opcional para desarrollo)
API_ADMIN_TOKEN=tu-admin-token-aqui
SHEET_INVENTARIO=Inventario
SHEET_CORREOS=Lista de correos
```

**Explicación de variables importantes**:

- `SUPABASE_URL`: URL de tu proyecto Supabase (ejemplo: `https://abcdefghijklmnop.supabase.co`)
- `SUPABASE_ANON_KEY`: Clave pública/anónima de Supabase (segura para usar en frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio con permisos administrativos (solo backend, nunca exponer)
- `JWT_SECRET`: Secreto para firmar tokens JWT (genera uno aleatorio y seguro)
- `JWT_EXPIRATION`: Tiempo de expiración del token en segundos (3600 = 1 hora)
- `API_ADMIN_TOKEN`: Token para endpoints administrativos (opcional en desarrollo)

> **⚠️ Importante**: 
> - Reemplaza todos los valores de ejemplo con tus credenciales reales de Supabase
> - Nunca compartas tu `SUPABASE_SERVICE_ROLE_KEY` ni la subas al repositorio
> - Para generar un `JWT_SECRET` seguro, puedes usar: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### Frontend - Variables de entorno

1. **Navega a la carpeta del frontend** (desde la raíz del proyecto):

```bash
cd frontend
```

2. **Crea el archivo `.env`** (si no existe un `.env.example`, créalo manualmente):

```bash
# En Windows (PowerShell)
New-Item -ItemType File -Path .env

# En Windows (CMD)
type nul > .env

# En Linux/Mac
touch .env
```

3. **Edita el archivo `.env`** y agrega las siguientes variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# API Configuration
VITE_API_BASE_URL=http://localhost:8000
# O alternativamente:
# VITE_BACKEND_URL=http://localhost:8000

# Feature Flags (opcional)
VITE_FEATURE_LICENSES=true

# Admin Token (opcional, solo para desarrollo)
VITE_API_ADMIN_TOKEN=tu-admin-token-aqui
```

**Explicación de variables**:

- `VITE_SUPABASE_URL`: Debe ser la misma URL que configuraste en el backend
- `VITE_SUPABASE_ANON_KEY`: Debe ser la misma clave anónima que configuraste en el backend
- `VITE_API_BASE_URL`: URL del backend (por defecto `http://localhost:8000`)
- `VITE_FEATURE_LICENSES`: Activa el módulo de licencias (opcional, puede ser `true` o `false`)

> **Nota**: Todas las variables de entorno en Vite deben comenzar con `VITE_` para que sean accesibles en el código del frontend.

---

## 🐍 Backend (API – FastAPI)

### 1. Crear y activar entorno virtual

**Windows (PowerShell)**:

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Si obtienes un error de política de ejecución, ejecuta primero:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows (CMD)**:

```bash
cd backend
python -m venv venv
venv\Scripts\activate.bat
```

**Linux/Mac**:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

Después de activar el entorno virtual, deberías ver `(venv)` al inicio de tu prompt.

### 2. Instalar dependencias

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

Este comando instalará todas las dependencias necesarias, incluyendo:
- FastAPI
- Uvicorn (servidor ASGI)
- Supabase Python Client
- Pandas y OpenPyXL (para importación de Excel)
- Y otras dependencias listadas en `requirements.txt`

### 3. Verificar la configuración (opcional)

Puedes ejecutar el script de verificación para asegurarte de que todo está configurado correctamente:

```bash
python check_setup.py
```

Este script verificará:
- Variables de entorno
- Dependencias instaladas
- Archivos necesarios

### 4. Ejecutar el servidor

Con el entorno virtual activado y las dependencias instaladas:

```bash
uvicorn app.main:app --reload --port 8000
```

**Explicación del comando**:
- `app.main:app`: Ruta al objeto FastAPI (archivo `app/main.py`, variable `app`)
- `--reload`: Activa el modo de recarga automática (útil para desarrollo)
- `--port 8000`: Puerto en el que se ejecutará el servidor

**Salida esperada**:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 5. Verificar que el backend está funcionando

Abre tu navegador o usa `curl` para verificar:

```bash
# En el navegador
http://localhost:8000

# O con curl
curl http://localhost:8000
```

Deberías recibir una respuesta JSON:

```json
{
  "message": "SISGEMEC API",
  "version": "2.0",
  "status": "running"
}
```

También puedes acceder a la documentación interactiva de la API:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 6. Endpoint de salud (health check)

```bash
curl http://localhost:8000/health
```

Debería responder: `{"status": "ok"}`

---

## 💻 Frontend (React + Vite)

Abre una **nueva terminal** (deja el backend corriendo en la terminal anterior).

### 1. Navegar a la carpeta del frontend

```bash
cd frontend
```

### 2. Instalar dependencias

```bash
npm install
```

Este comando instalará todas las dependencias listadas en `package.json`, incluyendo:
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- Y otras dependencias

> **Nota**: La primera instalación puede tardar varios minutos dependiendo de tu conexión a internet.

### 3. Ejecutar en modo desarrollo

```bash
npm run dev
```

**Salida esperada**:

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 4. Verificar que el frontend está funcionando

Abre tu navegador en:

```
http://localhost:5173
```

Deberías ver la página de login o la interfaz principal del sistema (dependiendo de si estás autenticado).

---

## 🧪 Verificación básica

Una vez que tanto el backend como el frontend estén corriendo, sigue estos pasos para verificar que todo funciona correctamente:

### 1. Verificar conexión frontend-backend

1. Abre el navegador en `http://localhost:5173`
2. Abre las **Herramientas de desarrollador** (F12)
3. Ve a la pestaña **Network** (Red)
4. Intenta iniciar sesión o navegar por la aplicación
5. Verifica que las peticiones al backend (`http://localhost:8000`) se realizan correctamente

### 2. Probar el login

1. Ve a la página de login: `http://localhost:5173/login`
2. Si no tienes un usuario de prueba, necesitarás crear uno primero:
   - Opción A: Usa la interfaz de Supabase Dashboard → Authentication → Users → Add User
   - Opción B: Usa el endpoint de importación de usuarios (requiere `API_ADMIN_TOKEN`)
3. Intenta iniciar sesión con credenciales válidas

### 3. Verificar módulos principales

Una vez autenticado, verifica que puedes acceder a:

- ✅ **Módulo de Usuarios**: Lista y gestión de usuarios
- ✅ **Módulo de Equipos**: Inventario de equipos de cómputo
- ✅ **Módulo de Licencias** (si `VITE_FEATURE_LICENSES=true`): Gestión de licencias de software
- ✅ **Módulo de Reportes**: Generación de reportes y exportación

### 4. Verificar que el sistema está funcionando

**Señales de que la instalación fue exitosa**:

- ✅ Puedes iniciar sesión sin errores
- ✅ Puedes ver el listado de equipos
- ✅ Puedes ver el listado de usuarios (si tienes permisos de administrador)
- ✅ Las peticiones al backend responden correctamente (sin errores 500 o de conexión)
- ✅ No hay errores en la consola del navegador relacionados con variables de entorno faltantes

---

## 🐛 Troubleshooting (Solución de problemas)

### Problema: Error de CORS en el navegador

**Síntomas**: 
- Errores en la consola del navegador como `CORS policy: No 'Access-Control-Allow-Origin' header`
- Las peticiones al backend fallan

**Solución**:
1. Verifica que el backend está corriendo en `http://localhost:8000`
2. Verifica que el frontend está corriendo en `http://localhost:5173`
3. Revisa el archivo `backend/app/main.py` - el CORS está configurado para permitir `http://localhost:5173`
4. Si cambiaste el puerto del frontend, actualiza `FRONTEND_ORIGIN` en el backend o en las variables de entorno

### Problema: Error de conexión con Supabase

**Síntomas**:
- Errores como `Failed to connect to Supabase` o `Invalid API key`
- El backend no puede conectarse a Supabase

**Solución**:
1. Verifica que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `backend/.env` son correctas
2. Verifica que las mismas variables están en `frontend/.env` con el prefijo `VITE_`
3. Asegúrate de que no hay espacios extra o comillas alrededor de los valores en los archivos `.env`
4. Verifica que tu proyecto de Supabase está activo (no pausado)

### Problema: Variables de entorno no definidas

**Síntomas**:
- Errores como `VITE_SUPABASE_URL is not defined` en el frontend
- Errores como `Missing required environment variables` en el backend

**Solución**:
1. **Backend**: Asegúrate de que el archivo `backend/.env` existe y contiene todas las variables necesarias
2. **Frontend**: Asegúrate de que el archivo `frontend/.env` existe y todas las variables comienzan con `VITE_`
3. **Reinicia los servidores** después de modificar los archivos `.env`:
   - Backend: Detén con `Ctrl+C` y vuelve a ejecutar `uvicorn app.main:app --reload --port 8000`
   - Frontend: Detén con `Ctrl+C` y vuelve a ejecutar `npm run dev`

### Problema: Puerto ya en uso

**Síntomas**:
- `Error: [Errno 48] Address already in use` (backend)
- `Port 5173 is in use` (frontend)

**Solución**:
1. **Backend**: Cambia el puerto: `uvicorn app.main:app --reload --port 8001`
   - Si cambias el puerto, actualiza `VITE_API_BASE_URL` en `frontend/.env`
2. **Frontend**: Cambia el puerto editando `frontend/vite.config.ts`:
   ```typescript
   server: {
     port: 5174, // Cambia el puerto aquí
   }
   ```

### Problema: Dependencias no se instalan correctamente

**Síntomas**:
- Errores durante `pip install` o `npm install`
- Módulos no encontrados al ejecutar el servidor

**Solución**:
1. **Backend**:
   - Asegúrate de que el entorno virtual está activado (deberías ver `(venv)` en el prompt)
   - Actualiza pip: `python -m pip install --upgrade pip`
   - Reinstala: `pip install -r requirements.txt --force-reinstall`
2. **Frontend**:
   - Limpia la caché: `npm cache clean --force`
   - Elimina `node_modules` y `package-lock.json`: 
     ```bash
     rm -rf node_modules package-lock.json  # Linux/Mac
     rmdir /s node_modules & del package-lock.json  # Windows
     ```
   - Reinstala: `npm install`

### Problema: El backend inicia pero el frontend no puede conectarse

**Síntomas**:
- El backend responde en `http://localhost:8000`
- El frontend muestra errores de conexión

**Solución**:
1. Verifica que `VITE_API_BASE_URL` en `frontend/.env` apunta a `http://localhost:8000`
2. Verifica que no hay un firewall bloqueando las conexiones
3. Prueba acceder directamente a `http://localhost:8000/health` desde el navegador
4. Revisa la consola del navegador (F12) para ver errores específicos

### Problema: Error de autenticación

**Síntomas**:
- No puedes iniciar sesión
- Errores 401 (Unauthorized) o 403 (Forbidden)

**Solución**:
1. Verifica que las credenciales de Supabase son correctas en ambos archivos `.env`
2. Verifica que el usuario existe en Supabase (Dashboard → Authentication → Users)
3. Verifica que Row Level Security (RLS) está configurado correctamente en Supabase
4. Revisa los logs del backend para ver errores específicos

### Problema: Módulo de licencias no aparece

**Síntomas**:
- El módulo de licencias no está visible en el menú

**Solución**:
1. Verifica que `VITE_FEATURE_LICENSES=true` en `frontend/.env`
2. Verifica que `FEATURE_LICENSES=true` en `backend/.env` (si es necesario)
3. Reinicia el frontend después de cambiar las variables de entorno

---

## 📚 Recursos adicionales

### Documentación del proyecto

- **README principal**: `README.md` (en la raíz del proyecto)
- **Documentación del backend**: `backend/README.md`
- **Documentación técnica**: `docs/project/`
- **Esquema de base de datos**: `docs/project/database-schema.mdc`

### Endpoints útiles del backend

- **Documentación interactiva (Swagger)**: http://localhost:8000/docs
- **Documentación alternativa (ReDoc)**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health
- **Diagnóstico (solo desarrollo)**: http://localhost:8000/__diagnostics/env

### Comandos útiles

**Backend**:
```bash
# Ejecutar con host específico (accesible desde red local)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Ejecutar sin recarga automática (producción)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview

# Verificar tipos TypeScript
npm run typecheck
```

---

## ✅ Checklist de instalación

Usa este checklist para asegurarte de que completaste todos los pasos:

- [ ] Git instalado y funcionando
- [ ] Python 3.11+ instalado y en PATH
- [ ] Node.js 18+ y npm instalados
- [ ] Proyecto clonado del repositorio
- [ ] Cambiado a la rama `feature/licenses-module` (o la rama correcta)
- [ ] Archivo `backend/.env` creado y configurado con credenciales reales
- [ ] Archivo `frontend/.env` creado y configurado con credenciales reales
- [ ] Entorno virtual de Python creado y activado
- [ ] Dependencias del backend instaladas (`pip install -r requirements.txt`)
- [ ] Dependencias del frontend instaladas (`npm install`)
- [ ] Backend corriendo en `http://localhost:8000` sin errores
- [ ] Frontend corriendo en `http://localhost:5173` sin errores
- [ ] Puedo acceder a la documentación de la API en `http://localhost:8000/docs`
- [ ] Puedo ver la interfaz del frontend en el navegador
- [ ] Puedo iniciar sesión con un usuario válido
- [ ] Puedo ver el listado de equipos
- [ ] No hay errores en la consola del navegador

---

## 🎉 ¡Listo!

Si completaste todos los pasos y el checklist, **¡felicidades!** Tienes SISGEMEC 2.0 funcionando en tu entorno local.

Ahora puedes:
- Explorar los diferentes módulos del sistema
- Revisar el código fuente para entender cómo funciona
- Hacer cambios y verlos reflejados en tiempo real (gracias al modo `--reload` del backend y hot-reload de Vite)
- Consultar la documentación de la API en `http://localhost:8000/docs`

Si encuentras algún problema que no está cubierto en esta guía, consulta:
- Los logs del backend (en la terminal donde ejecutaste `uvicorn`)
- La consola del navegador (F12 → Console)
- La pestaña Network del navegador para ver las peticiones HTTP
- La documentación adicional en la carpeta `docs/`

---

**Última actualización**: Este manual fue generado para la rama `feature/licenses-module`. Si trabajas con otra rama o versión, algunos detalles pueden variar.

