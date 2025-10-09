# Configuración de Variables de Entorno - Módulo de Importación

## Backend (.env)

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# API Configuration - CRÍTICO para importación
API_ADMIN_TOKEN=sisgemec_admin_token_2025

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Application Configuration
DEBUG=true
ENVIRONMENT=development
```

## Frontend (.env.local)

```bash
# API Configuration - CRÍTICO para importación
VITE_API_ADMIN_TOKEN=sisgemec_admin_token_2025

# Backend URL
VITE_API_URL=http://localhost:8000

# Supabase Configuration (si se usa)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Variables Críticas para Importación

### API_ADMIN_TOKEN / VITE_API_ADMIN_TOKEN
- **DEBE ser idéntico** en backend y frontend
- **Valor recomendado**: `sisgemec_admin_token_2025`
- **Uso**: Autenticación para endpoints de importación

### SUPABASE_SERVICE_ROLE_KEY
- **CRÍTICO**: Necesario para crear usuarios en `auth.users`
- **Uso**: Operaciones administrativas de Supabase
- **NO usar**: `SUPABASE_ANON_KEY` (insuficiente para crear usuarios)

## Verificación

1. **Backend**: Verificar que `settings.API_ADMIN_TOKEN` no esté vacío
2. **Frontend**: Verificar que `VITE_API_ADMIN_TOKEN` no esté vacío
3. **Coincidencia**: Ambos tokens deben ser idénticos
4. **Service Role**: Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado

## Reinicio Requerido

Después de cambiar variables de entorno:
- **Backend**: Reiniciar servidor FastAPI
- **Frontend**: Reiniciar servidor de desarrollo
