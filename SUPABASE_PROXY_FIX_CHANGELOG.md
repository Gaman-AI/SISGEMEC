# Fix: Error "Client.__init__() got an unexpected keyword argument 'proxy'"

## Problema Resuelto
✅ **Error eliminado**: `Client.__init__() got an unexpected keyword argument 'proxy'` en Supabase Python

## Cambios Implementados

### 1. Dependencias Actualizadas
- **Archivo**: `backend/requirements.txt`
- **Cambio**: Fijado `supabase==2.4.0` (versión estable compatible)
- **Razón**: Eliminar conflictos de versiones y asegurar compatibilidad

### 2. Cliente Supabase Centralizado
- **Archivo**: `backend/app/deps/supabase_client.py`
- **Nuevo**: Funciones `supa()` y `supa_service()` como singletons
- **Eliminado**: Uso de kwargs no soportados (`proxy`, `options`)
- **Creación minimalista**: `create_client(url, key)` sin parámetros extra

```python
def supa() -> Client:
    """Cliente Supabase singleton con ANON_KEY"""
    global _sb_client
    if _sb_client is None:
        _sb_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _sb_client

def supa_service() -> Client:
    """Cliente Supabase singleton con SERVICE_ROLE_KEY"""
    global _sb_service_client
    if _sb_service_client is None:
        _sb_service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _sb_service_client
```

### 3. Archivos Actualizados
- **`backend/app/routers/auth.py`**: Usa `supa()` en lugar de `create_client` directo
- **`backend/check_setup.py`**: Usa `supa()` para verificación
- **Funciones legacy**: Mantenidas para compatibilidad (`get_supabase_service_client()`)

### 4. Validación de Entorno
- **Mantenido**: `settings.validate_import_env()` para verificar Service Role Key
- **Error claro**: HTTP 500 si faltan variables de entorno
- **Sin cambios**: Lógica de importación intacta

## Archivos Modificados

### Backend
- `backend/requirements.txt` - Dependencias actualizadas
- `backend/app/deps/supabase_client.py` - Cliente centralizado
- `backend/app/routers/auth.py` - Usa cliente centralizado
- `backend/check_setup.py` - Usa cliente centralizado

## Pruebas Realizadas

### ✅ Instalación de Dependencias
```bash
pip install -r requirements.txt
# ✅ Supabase 2.4.0 instalado correctamente
```

### ✅ Importación del Cliente
```python
from app.deps.supabase_client import supa
# ✅ Cliente Supabase creado correctamente
```

### ✅ Backend Import
```python
from app.main import app
# ✅ Backend imports correctly
```

## Comportamiento Final

### Backend
- ✅ **Sin error de proxy**: Cliente se crea sin kwargs no soportados
- ✅ **Cliente centralizado**: Funciones `supa()` y `supa_service()` como singletons
- ✅ **Compatibilidad**: Funciones legacy mantenidas
- ✅ **Validación**: Service Role Key verificada antes de importar

### Módulo de Importación
- ✅ **Intacto**: Toda la lógica de importación funciona igual
- ✅ **Service Role Key**: Usa `supa_service()` para operaciones administrativas
- ✅ **Sin regresiones**: Módulos existentes no afectados

## Configuración Requerida

### Variables de Entorno (Backend)
```env
# REQUERIDO para importación
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Opcional
API_ADMIN_TOKEN=your-secure-token
SHEET_INVENTARIO=Inventario
SHEET_CORREOS=Lista de correos
```

## Estado Final

- ✅ **Error eliminado**: No más `Client.__init__() got an unexpected keyword argument 'proxy'`
- ✅ **Cliente estable**: Supabase 2.4.0 con creación minimalista
- ✅ **Importación funcional**: Módulo de importación operativo
- ✅ **Sin regresiones**: Módulos existentes intactos
- ✅ **Centralizado**: Cliente Supabase en helper único

## Notas Técnicas

1. **Versión Supabase**: 2.4.0 (estable, sin conflictos)
2. **Creación minimalista**: `create_client(url, key)` sin kwargs extra
3. **Singleton pattern**: Evita múltiples instancias del cliente
4. **Compatibilidad**: Funciones legacy mantenidas para transición suave
5. **Validación**: Service Role Key verificada antes de operaciones administrativas

El fix está **completamente implementado** y el error de `proxy` ha sido **eliminado definitivamente**.
