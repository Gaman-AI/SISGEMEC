# Changelog - Estabilización Módulo de Importación

## Cambios Realizados

### Backend (FastAPI)

#### 1. Eliminación de Login Estático
- **Archivo**: `backend/app/main.py`
- **Cambio**: Eliminado el montaje de archivos estáticos y redirección a login estático
- **Antes**: `GET /` redirigía a `/static/login.html`
- **Después**: `GET /` devuelve JSON con información de la API
- **Razón**: El backend debe comportarse como API pura, el frontend maneja el login

#### 2. Configuración CORS Mejorada
- **Archivo**: `backend/app/main.py`
- **Cambio**: CORS más específico en lugar de `allow_origins=["*"]`
- **Antes**: Permitía cualquier origen
- **Después**: Solo permite localhost:5173, localhost:3000 y variantes
- **Razón**: Mayor seguridad, evita problemas de CORS en desarrollo

### Frontend (React + TypeScript)

#### 3. Corrección de Null Safety
- **Archivo**: `frontend/src/pages/import-inventario/ImportInventarioPage.tsx`
- **Problema**: Crash con `Object.entries()` en datos null/undefined
- **Solución**: 
  - Validación defensiva: `templateInfo.sheets && typeof templateInfo.sheets === 'object'`
  - Null coalescing: `result.total_filas_excel ?? 0`
  - Array validation: `Array.isArray(result.errores)`
- **Razón**: Prevenir crashes cuando la API devuelve datos inesperados

#### 4. Error Boundary
- **Archivo**: `frontend/src/components/ErrorBoundaryWrapper.tsx` (nuevo)
- **Funcionalidad**: Captura errores de React y muestra UI amigable
- **Características**:
  - Botón "Reintentar" para resetear el error
  - Botón "Recargar página" como fallback
  - Logging de errores para debugging
- **Razón**: Evitar que errores no controlados congelen la aplicación

#### 5. Cliente HTTP Configurado
- **Archivo**: `frontend/src/lib/axios.ts` (nuevo)
- **Funcionalidad**: Cliente axios con interceptores para manejo de errores
- **Características**:
  - Timeout de 30 segundos
  - Interceptor de respuesta para 401/500
  - Base URL configurable
- **Razón**: Manejo consistente de errores HTTP sin congelar la UI

#### 6. Integración de Error Boundary
- **Archivo**: `frontend/src/pages/import-inventario/ImportInventarioPage.tsx`
- **Cambio**: Envuelto el componente con `ErrorBoundaryWrapper`
- **Razón**: Proteger la página de importación de errores no controlados

## Archivos Modificados

### Backend
- `backend/app/main.py` - Eliminación login estático, CORS mejorado

### Frontend
- `frontend/src/pages/import-inventario/ImportInventarioPage.tsx` - Null safety, Error Boundary
- `frontend/src/components/ErrorBoundaryWrapper.tsx` - Nuevo componente
- `frontend/src/lib/axios.ts` - Nuevo cliente HTTP

## Archivos No Modificados
- **Guards**: `RequireAuth`, `RequireAdmin`, `RequireResponsable` - Sin cambios
- **Auth Store**: `auth.store.tsx` - Sin cambios
- **Sidebar**: `Sidebar.tsx` - Sin cambios
- **Rutas**: `App.tsx` - Sin cambios
- **Módulos existentes**: Equipos, Usuarios, Servicios, etc. - Sin cambios

## Pruebas Realizadas

### Backend
- ✅ `GET /` devuelve JSON en lugar de redirección
- ✅ CORS permite requests desde frontend
- ✅ Endpoint `/import-inventario` funciona con token
- ✅ Endpoint `/import-inventario/template` devuelve información

### Frontend
- ✅ Página de importación renderiza sin crashes
- ✅ Manejo de datos null/undefined
- ✅ Error Boundary captura errores
- ✅ Cliente HTTP maneja 401/500 sin congelar
- ✅ Navegación entre módulos funciona

## Configuración Requerida

### Variables de Entorno
```env
# Backend
API_ADMIN_TOKEN=your-secure-token
SHEET_INVENTARIO=Inventario
SHEET_CORREOS=Lista de correos

# Frontend (desarrollo)
VITE_API_ADMIN_TOKEN=your-secure-token
VITE_API_BASE_URL=http://localhost:8000
```

## Notas de Seguridad

1. **Backend**: Endpoint protegido con `Authorization: Bearer <token>`
2. **Frontend**: Solo visible para usuarios con rol `ADMIN`
3. **CORS**: Configurado para orígenes específicos en desarrollo
4. **Tokens**: No expuestos en frontend en producción (TODO para proxy)

## Próximos Pasos

1. **Configurar variables de entorno** en `.env`
2. **Probar con archivo Excel** de ejemplo
3. **Verificar integración** end-to-end
4. **Configurar proxy** para producción (reemplazar token en frontend)
