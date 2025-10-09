# Plantillas Excel Actualizadas - Módulo de Importación

## Usuarios (Hoja "Usuarios")

### Columnas Requeridas
| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| First Name | Texto | ✅ | Nombre del usuario |
| Last Name | Texto | ✅ | Apellido del usuario |
| Email Address | Email | ✅ | Email único globalmente |

### Columnas Opcionales
| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| Password | Texto | ❌ | **NUEVO** - Para crear login en auth.users |
| Department | Texto | ❌ | Departamento del usuario |
| Phone | Texto | ❌ | Teléfono del usuario |
| Location | Texto | ❌ | Ubicación del usuario |

### Ejemplo de Datos
```
First Name | Last Name | Email Address | Password | Department | Phone | Location
Juan | Pérez | juan@aosenuma.com | sisgemec_test | Soporte | 5532112233 | CDMX
María | García | maria@aosenuma.com | password123 | IT | 5544332211 | Guadalajara
Carlos | López | carlos@aosenuma.com | | Finanzas | 5566778899 | Monterrey
```

### Reglas de Password
- **Opcional**: Si está vacío, se genera automáticamente
- **Mínimo**: 8 caracteres (si se proporciona)
- **Comportamiento**:
  - Usuario nuevo + Password → Crea en auth.users y profiles
  - Usuario nuevo + Sin Password → Error (requiere password o service role key)
  - Usuario existente + Password → Actualiza profiles (ignora password)
  - Usuario existente + Sin Password → Actualiza profiles

## Equipos (Hoja "Equipos")

### Columnas Requeridas
| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| Número de serie | Texto | ✅ | Identificador único del equipo |
| Estado | Texto | ✅ | Estado del equipo |
| Responsable email | Email | ✅ | Email del responsable (debe existir en profiles) |

### Columnas Opcionales
| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| Tipo | Texto | ❌ | Tipo de equipo (default: "Computadora") |
| Marca | Texto | ❌ | Marca del equipo |
| Modelo | Texto | ❌ | Modelo del equipo |
| Procesador | Texto | ❌ | Procesador del equipo |
| RAM | Texto | ❌ | Memoria RAM |
| Disco | Texto | ❌ | Almacenamiento |
| Sistema Operativo | Texto | ❌ | Sistema operativo |
| Ubicación actual | Texto | ❌ | Ubicación del equipo |
| Fecha de ingreso | Fecha | ❌ | Fecha de ingreso (YYYY-MM-DD) |
| Fecha de salida | Fecha | ❌ | Fecha de salida (YYYY-MM-DD) |
| Observaciones | Texto | ❌ | Observaciones adicionales |

### Ejemplo de Datos
```
Tipo | Marca | Modelo | Número de serie | Procesador | RAM | Disco | Sistema Operativo | Ubicación actual | Estado | Fecha de ingreso | Fecha de salida | Responsable email | Observaciones
Computadora | Dell | OptiPlex 7090 | SN123456789 | Intel i7 | 16GB | 512GB SSD | Windows 11 | Office A | ACTIVO | 2024-01-15 | | juan@aosenuma.com | Equipo principal
Laptop | HP | EliteBook 850 | SN987654321 | Intel i5 | 8GB | 256GB SSD | Windows 10 | Office B | EN_MANTENIMIENTO | 2024-02-01 | | maria@aosenuma.com | Requiere actualización
```

### Estados Válidos
- `ACTIVO` (acepta: "activo", "Activo")
- `EN_MANTENIMIENTO` (acepta: "en mantenimiento", "mantenimiento", "En mantenimiento", "en_mantenimiento")
- `DE_BAJA` (acepta: "de baja", "baja", "Baja", "de_baja")

## Orden de Importación

1. **Primero**: Importar usuarios (para que existan en profiles)
2. **Segundo**: Importar equipos (para que puedan referenciar responsables)

## Validaciones

### Usuarios
- Email debe ser único globalmente
- Password mínimo 8 caracteres (si se proporciona)
- First Name y Last Name no pueden estar vacíos

### Equipos
- Número de serie debe ser único
- Estado debe ser válido
- Responsable email debe existir en profiles
- Fechas en formato YYYY-MM-DD
