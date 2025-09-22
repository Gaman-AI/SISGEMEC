# Excel Import Refactoring - SISGEMEC 2.0

## Overview

The Excel import module has been completely refactored to separate the functionality into two independent importers: **Users** and **Equipment**. This refactoring fixes the 422 errors and implements proper security while maintaining backward compatibility.

## New Architecture

### Backend Components

#### 1. Service Classes
- **`UserImportService`** (`backend/app/services/user_import.py`)
  - Handles user/profile creation from Excel
  - Creates users in `auth.users` using Admin API
  - Upserts profiles in `public.profiles` with role='RESPONSABLE'

- **`EquipmentImportService`** (`backend/app/services/equipment_import.py`)
  - Handles equipment import from Excel
  - Links equipment to existing users by email
  - Validates and maps equipment states

#### 2. API Endpoints
- **`POST /import-usuarios`** (`backend/app/routers/import_usuarios.py`)
  - Dedicated endpoint for user import
  - Accepts Excel files with "Usuarios" sheet
  - Returns detailed metrics and error information

- **`POST /import-equipos`** (`backend/app/routers/import_equipos.py`)
  - Dedicated endpoint for equipment import
  - Accepts Excel files with "Equipos" sheet
  - Validates equipment states and user relationships

#### 3. Database Seeding
- **`DatabaseSeed`** (`backend/app/services/database_seed.py`)
  - Ensures required equipment states exist
  - Seeds `estados_equipo` table with: ACTIVO, EN_MANTENIMIENTO, DE_BAJA

### Frontend Components

#### 1. New Import Pages
- **`ImportUsuariosPage`** (`frontend/src/pages/import-usuarios/ImportUsuariosPage.tsx`)
  - Dedicated page for user import
  - Clean UI with proper error handling
  - Shows detailed import metrics

- **`ImportEquiposPage`** (`frontend/src/pages/import-equipos/ImportEquiposPage.tsx`)
  - Dedicated page for equipment import
  - Validates equipment data
  - Links to existing users

#### 2. Updated Legacy Page
- **`ImportInventarioPage`** (updated)
  - Now serves as a navigation hub
  - Provides links to new separate importers
  - Maintains legacy combined import functionality

## Excel Templates

### User Import Template
**Sheet Name:** "Usuarios"

| Column | Required | Description |
|--------|----------|-------------|
| First Name | ✅ | User's first name |
| Last Name | ✅ | User's last name |
| Email Address | ✅ | Unique email address |
| Department | ❌ | User's department |
| Phone | ❌ | User's phone number |
| Location | ❌ | User's location |

**Sample Data:**
```
First Name,Last Name,Email Address,Department,Phone,Location
John,Doe,john.doe@company.com,IT,555-0123,Office A
Jane,Smith,jane.smith@company.com,HR,555-0124,Office B
```

### Equipment Import Template
**Sheet Name:** "Equipos"

| Column | Required | Description |
|--------|----------|-------------|
| Número de serie | ✅ | Unique serial number |
| Estado | ✅ | Equipment state (ACTIVO/EN_MANTENIMIENTO/DE_BAJA) |
| Responsable email | ✅ | Email of responsible user (must exist) |
| Tipo | ❌ | Equipment type |
| Marca | ❌ | Equipment brand |
| Modelo | ❌ | Equipment model |
| Procesador | ❌ | Processor information |
| RAM | ❌ | RAM information |
| Disco | ❌ | Storage information |
| Sistema Operativo | ❌ | Operating system |
| Ubicación actual | ❌ | Current location |
| Fecha de ingreso | ❌ | Entry date (YYYY-MM-DD) |
| Fecha de salida | ❌ | Exit date (YYYY-MM-DD) |
| Observaciones | ❌ | Additional notes |

**Sample Data:**
```
Número de serie,Estado,Responsable email,Tipo,Marca,Modelo,Procesador,RAM,Disco,Sistema Operativo,Ubicación actual,Fecha de ingreso,Observaciones
SN123456789,ACTIVO,john.doe@company.com,Computadora,Dell,OptiPlex 7090,Intel i7,16GB,512GB SSD,Windows 11,Office A,2024-01-15,Equipo principal
SN987654321,EN_MANTENIMIENTO,jane.smith@company.com,Laptop,HP,EliteBook 850,Intel i5,8GB,256GB SSD,Windows 10,Office B,2024-02-01,Requiere actualización
```

## API Response Formats

### User Import Response
```json
{
  "ok": true,
  "total_filas_excel": 25,
  "perfiles_procesados": 25,
  "perfiles_creados": 18,
  "perfiles_actualizados": 7,
  "errores": []
}
```

### Equipment Import Response
```json
{
  "ok": true,
  "total_filas_excel": 40,
  "equipos_procesados": 40,
  "equipos_creados": 28,
  "equipos_actualizados": 12,
  "errores": []
}
```

## Security Implementation

### Authentication
- All import endpoints require `Authorization: Bearer <API_ADMIN_TOKEN>`
- Token validation with proper error responses (401/403)
- No key exposure in frontend

### Database Access
- Uses Supabase Service Role for admin operations
- Clean singleton pattern without proxy configurations
- Proper error handling and logging

## Error Handling

### Backend Errors
- **400**: Invalid template, missing columns, bad data
- **401**: Missing authorization header
- **403**: Invalid token
- **500**: Internal server error

### Frontend Errors
- Proper error display with detailed messages
- Toast notifications for user feedback
- Error boundaries for crash prevention

## Migration Guide

### For Existing Users
1. **New Import Flow**: Use the new separate importers for better UX
2. **Legacy Support**: Old combined import still works
3. **Template Updates**: Use new Excel templates for better results

### For Developers
1. **New Endpoints**: Use `/import-usuarios` and `/import-equipos`
2. **Service Classes**: Import and use `UserImportService` and `EquipmentImportService`
3. **Database**: Ensure `estados_equipo` table is seeded

## Testing

### Manual Testing
1. **User Import**: Test with sample Excel file containing "Usuarios" sheet
2. **Equipment Import**: Test with sample Excel file containing "Equipos" sheet
3. **Error Handling**: Test with invalid files and missing data
4. **Security**: Test with invalid/missing tokens

### Automated Testing
- Run `python test_importers.py` for basic functionality tests
- All services initialize correctly
- Database seeding works properly

## Dependencies

### Backend
- `supabase==2.6.0` (fixed proxy bug)
- `gotrue==2.9.0`
- `httpx==0.27.2`
- `pandas==2.2.0`
- `openpyxl==3.1.2`

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Hook Form with Zod validation
- Axios for HTTP requests

## Performance Considerations

### Backend
- In-memory file processing
- Batch database operations
- Connection pooling via Supabase

### Frontend
- Lazy loading of import pages
- Error boundaries for stability
- Optimized re-renders

## Future Enhancements

1. **Progress Tracking**: Real-time import progress
2. **Batch Processing**: Large file handling
3. **Validation Rules**: Custom validation rules
4. **Audit Logging**: Import history tracking
5. **Template Generation**: Dynamic template creation

## Troubleshooting

### Common Issues
1. **422 Errors**: Fixed with proper FastAPI file upload patterns
2. **Proxy Errors**: Resolved with correct Supabase version
3. **Missing States**: Auto-seeded with database seeding
4. **User Not Found**: Import users first before equipment

### Debug Tools
- `test_importers.py`: Basic functionality tests
- Logging: Detailed error information
- Template validation: Clear error messages
