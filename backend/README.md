# SISGEMEC Backend

Backend de la aplicación SISGEMEC construido con FastAPI y Supabase.

## Características

- ✅ Autenticación completa con Supabase Auth
- ✅ Endpoints protegidos con JWT
- ✅ Manejo de roles (ADMIN, RESPONSABLE)
- ✅ API REST para equipos, servicios y usuarios
- ✅ CORS configurado
- ✅ Validación de datos con Pydantic

## Instalación

### 1. Crear entorno virtual

```bash
cd backend
python -m venv venv

# En Windows
venv\Scripts\activate

# En macOS/Linux
source venv/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Copia el archivo `env.example` a `.env` y configura tus credenciales de Supabase:

```bash
cp env.example .env
```

Edita `.env` con tus credenciales reales:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### 4. Configurar la base de datos

Ejecuta el script de configuración para verificar y configurar la tabla `profiles`:

```bash
python setup_database.py
```

Este script:
- Verifica la conexión a Supabase
- Revisa la estructura de la tabla `profiles`
- Proporciona SQL para configurar la tabla manualmente si es necesario
- Crea un perfil de administrador de ejemplo

### 5. Ejecutar el servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El servidor estará disponible en `http://localhost:8000`

## Endpoints Disponibles

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/session` - Verificar sesión
- `POST /auth/refresh` - Refrescar token

### Debug y Troubleshooting
- `GET /auth/debug/connection` - Verificar conexión a Supabase
- `GET /auth/debug/profiles` - Verificar estructura de tabla profiles

### Usuario
- `GET /me` - Obtener perfil del usuario autenticado

### Equipos
- Endpoints para gestión de equipos (pendiente)

### Servicios
- Endpoints para gestión de servicios (pendiente)

## Estructura del Proyecto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Aplicación principal
│   ├── config.py            # Configuración
│   ├── routers/             # Routers de la API
│   │   ├── auth.py          # Autenticación
│   │   ├── me.py            # Perfil de usuario
│   │   ├── equipos.py       # Gestión de equipos
│   │   └── servicios.py     # Gestión de servicios
│   ├── deps/                # Dependencias
│   │   ├── auth.py          # Utilidades de autenticación
│   │   └── supabase_client.py # Cliente de Supabase
│   └── static/              # Archivos estáticos
│       ├── login.html       # Página de login
│       ├── admin.html       # Dashboard de admin
│       └── responsable.html # Dashboard de responsable
├── requirements.txt          # Dependencias de Python
├── env.example              # Ejemplo de variables de entorno
└── test_server.py           # Script de prueba
```

## Pruebas

### Probar el servidor

```bash
python test_server.py
```

### Documentación de la API

Una vez que el servidor esté corriendo, puedes acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Desarrollo

### Agregar nuevos endpoints

1. Crea un nuevo router en `app/routers/`
2. Define los modelos Pydantic en el router
3. Implementa la lógica de negocio
4. Incluye el router en `app/main.py`

### Manejo de errores

Todos los endpoints deben manejar errores apropiadamente:

```python
from fastapi import HTTPException, status

raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Mensaje de error descriptivo"
)
```

### Autenticación

Para proteger un endpoint, usa la dependencia `HTTPBearer`:

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

@router.get("/protected")
async def protected_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Validar token y procesar request
```

## Despliegue

### Producción

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### Error: "Supabase configuration not found"

Verifica que el archivo `.env` existe y contiene las variables correctas.

### Error: "Module not found"

Asegúrate de que el entorno virtual esté activado y las dependencias instaladas.

### Error de CORS

Verifica que el middleware CORS esté configurado correctamente en `main.py`.

### Error: "infinite recursion detected in policy"

Si encuentras este error al usar `/auth/debug/profiles`, ejecuta el script de corrección:

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta el contenido de `emergency_fix.sql` (RECOMENDADO)
3. O usa `fix_supabase_simple.sql` como alternativa
4. Si persiste, usa `quick_setup.sql` para una configuración rápida

### Error: "operator does not exist: uuid = text"

Este error indica problemas de tipos en Supabase. Usa `emergency_fix.sql` que maneja correctamente los tipos UUID.

### Error: "Rol no reconocido: USER"

El sistema ahora reconoce el rol "USER". Si persiste el problema:
1. Verifica que la tabla `profiles` tenga datos
2. Usa `/auth/debug/table-info` para diagnóstico
3. Ejecuta `quick_setup.sql` si es necesario

## Contribuir

1. Crea una rama para tu feature
2. Implementa los cambios
3. Ejecuta las pruebas
4. Crea un Pull Request

## Licencia

Este proyecto es privado y confidencial.
