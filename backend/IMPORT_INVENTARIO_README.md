# Módulo de Importación de Inventario

## Descripción
Módulo completo para importar inventario de equipos desde archivos Excel, con validación automática e importación directa a la base de datos.

## Características
- ✅ Importación desde Excel (.xlsx, .xls)
- ✅ Validación de estructura y datos
- ✅ Mapeo automático de estados
- ✅ Vinculación por email a profiles existentes
- ✅ Importación directa a base de datos
- ✅ Upsert de equipos por número de serie
- ✅ Reporte detallado de resultados
- ✅ Manejo robusto de errores

## Contrato de Respuesta

### Éxito (200)
```json
{
  "ok": true,
  "stats": {
    "filas_procesadas": 150,
    "equipos_procesados": 145,
    "perfiles_creados": 0
  },
  "errores": []
}
```

### Error de Datos (422)
```json
{
  "ok": false,
  "stats": {
    "filas_procesadas": 10,
    "equipos_procesados": 8,
    "perfiles_creados": 0
  },
  "errores": [
    {"fila": 5, "mensaje": "Estado no encontrado: 'roto' (válidos: ACTIVO, EN_MANTENIMIENTO, DE_BAJA)"},
    {"fila": 23, "mensaje": "Usuario 'juan@test.com' no existe en profiles"}
  ]
}
```

### Error Inesperado (500)
```json
{
  "ok": false,
  "error": {
    "message": "Error interno del servidor",
    "detail": "Traceback completo..."
  },
  "stats": {
    "filas_procesadas": 0,
    "equipos_procesados": 0,
    "perfiles_creados": 0
  },
  "errores": []
}
```

## Formato de Excel

### Hoja "Inventario" (REQUERIDA)
| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| Activo | No | Tipo de equipo (por defecto: "Computadora") |
| Modelo | No | Modelo del equipo |
| Número de serie | **Sí** | Número de serie único |
| Procesador | No | Procesador |
| RAM | No | Memoria RAM |
| Disco | No | Almacenamiento |
| Sistema Operativo | No | SO instalado |
| Ubicación actual | No | Ubicación física |
| Estado | **Sí** | Estado del equipo |
| Observaciones | No | Notas adicionales |
| Email Responsable | **Sí** | Email del responsable (debe existir en profiles) |

### Hoja "Lista de correos" (OPCIONAL)
| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| First Name | **Sí** | Nombre |
| Last Name | **Sí** | Apellido |
| Email Address | **Sí** | Correo electrónico |

## Estados Válidos
El sistema acepta variaciones de los siguientes estados (case-insensitive):
- `ACTIVO` - Equipo en funcionamiento (acepta: "activo", "activa", "en uso", "operativo")
- `EN_MANTENIMIENTO` - Equipo en mantenimiento (acepta: "en_mantenimiento", "en mantenimiento", "mantenimiento")
- `DE_BAJA` - Equipo dado de baja (acepta: "de_baja", "de baja", "baja")

## Requisitos Previos
- Los emails en "Email Responsable" deben existir en la tabla `profiles`
- Los estados deben existir en la tabla `estados_equipo`
- El usuario debe tener permisos de administración (API_ADMIN_TOKEN)

### Mapeo de Estados
El sistema acepta variaciones de los estados:
- **activo**: "activo", "Activo"
- **en_mantenimiento**: "en mantenimiento", "mantenimiento", "En mantenimiento"
- **de_baja**: "de baja", "baja", "Baja"

## Lógica de Join
1. **Por email**: Si la hoja Inventario incluye columna de email
2. **Por nombre**: Si no hay email, se hace join por nombre normalizado (Usuario ↔ First Name + Last Name)

## API Endpoints

### POST /import-inventario
Importa inventario desde archivo Excel a la base de datos.

**Parámetros:**
- `file`: Archivo Excel (multipart/form-data)

**Headers:**
- `Authorization: Bearer <API_ADMIN_TOKEN>`

**Respuesta:**
```json
{
  "ok": true,
  "total_filas_excel": 150,
  "insertados_actualizados_equipos": 145,
  "perfiles_creados": 12,
  "errores": [
    {"fila": 5, "error": "Estado inválido: 'roto'"},
    {"fila": 23, "error": "Falta número de serie"}
  ]
}
```

### GET /import-inventario/template
Obtiene información sobre la estructura esperada del Excel.

## Configuración

### Variables de Entorno
```env
# Supabase Configuration (REQUERIDO)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Token para proteger el endpoint
API_ADMIN_TOKEN=your-secure-token

# Nombres de las hojas (opcional)
SHEET_INVENTARIO=Inventario
SHEET_CORREOS=Lista de correos
```

**IMPORTANTE**: El módulo requiere la **Service Role Key** (no el ANON KEY) para poder crear usuarios y realizar operaciones administrativas.

### Dependencias
```txt
pandas==2.2.0
openpyxl==3.1.2
Unidecode==1.3.8
```

## Seguridad
- Endpoint protegido con token de administración
- Solo usuarios con rol ADMIN pueden acceder
- En producción, usar proxy/middleware para validación de sesión

## Uso en Frontend
1. Acceder como usuario ADMIN
2. Ir a "Importar" en el menú
3. Seleccionar archivo Excel
4. Hacer clic en "Importar"
5. Revisar resultados de la importación

## Validaciones
- Archivo debe ser Excel (.xlsx, .xls)
- Hojas requeridas deben existir
- Campos obligatorios no pueden estar vacíos
- Estados deben ser válidos
- Números de serie únicos

## Manejo de Errores
- Errores por fila se reportan individualmente
- Fila 0 indica errores generales
- Importación continúa con filas válidas
- Reporte detallado de todos los errores
