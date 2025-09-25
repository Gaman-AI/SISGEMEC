# Configuración de Supabase para SISGEMEC

## Problema Identificado

El error "Invalid API key" al crear usuarios se debe a que el backend está usando una clave de ejemplo en lugar de la **SUPABASE_SERVICE_ROLE_KEY** real.

## Solución

### 1. Obtener las Claves Correctas

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** → **API**
3. Copia las siguientes claves:

```
Project URL: https://xongkzaqnuyypkeycllg.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbmdremFxbnV5eXBrZXljbGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzYzNDYsImV4cCI6MjA3MTQ1MjM0Nn0.osiM1-UI5LEwep_wKPSEgikKpQpGnuCwMohE1b_4OpI
service_role: [CLAVE_REAL_AQUI] ← ESTA ES LA IMPORTANTE
```

### 2. Configurar backend/env.local

Reemplaza el archivo `backend/env.local` con las claves reales:

```bash
# Supabase Configuration
SUPABASE_URL=https://xongkzaqnuyypkeycllg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbmdremFxbnV5eXBrZXljbGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzYzNDYsImV4cCI6MjA3MTQ1MjM0Nn0.osiM1-UI5LEwep_wKPSEgikKpQpGnuCwMohE1b_4OpI
SUPABASE_SERVICE_ROLE_KEY=[TU_CLAVE_SERVICE_ROLE_REAL_AQUI]

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Application Configuration
DEBUG=true
ENVIRONMENT=development

# Import Configuration
API_ADMIN_TOKEN=dev-admin-token-123
SHEET_INVENTARIO=Inventario
SHEET_CORREOS=Lista de correos
```

### 3. Verificar la Configuración

Después de configurar las claves reales, prueba:

```bash
cd backend
python -c "from app.core.supabase_client import get_supabase; client = get_supabase(); print('✅ Supabase client OK')"
```

Debería mostrar: `✅ Supabase client OK`

### 4. Probar el Endpoint de Diagnóstico

Inicia el servidor:
```bash
uvicorn app.main:app --reload --port 8000
```

Visita: http://localhost:8000/__diagnostics/supabase

Debería devolver:
```json
{
  "supabase_admin_ok": true,
  "sample_count": 0
}
```

### 5. Probar Creación de Usuarios

```bash
curl -X POST http://localhost:8000/users \
  -H "Authorization: Bearer dev-admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","email":"test@example.com","password":"password123","role":"RESPONSABLE"}'
```

## Diferencias entre Claves

- **ANON KEY**: Para operaciones del frontend (lectura pública, autenticación de usuarios)
- **SERVICE ROLE KEY**: Para operaciones administrativas del backend (crear usuarios, administrar auth)

## Seguridad

- ✅ **NUNCA** expongas la SERVICE_ROLE_KEY al frontend
- ✅ **NUNCA** uses la ANON_KEY para operaciones `auth.admin.*`
- ✅ Mantén las claves en archivos `.env` locales, no en el repositorio

## Implementación Completada

El código ya está corregido para:
- ✅ Usar el cliente centralizado de Supabase
- ✅ Validar que la SERVICE_ROLE_KEY funcione
- ✅ Manejar errores "Invalid API key" correctamente
- ✅ Proporcionar diagnósticos claros
