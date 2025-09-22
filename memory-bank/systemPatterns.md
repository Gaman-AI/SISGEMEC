# System Patterns - SISGEMEC 2.0

## Architecture Overview
- **Backend**: FastAPI with Supabase integration
- **Frontend**: React with TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens

## Current Import System Patterns

### File Upload Pattern (Current Issues)
```python
# PROBLEMATIC - causes 422 errors
@router.post("")
async def import_inventario(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization")
):
```

### Service Pattern (Current)
```python
class ExcelImportService:
    def __init__(self):
        self.supabase = get_supabase_service_client()
        # Mixed responsibilities: users + equipment
```

### Database Access Pattern
```python
# Service Role client (correct)
def get_supabase_service_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

## Target Patterns for Refactoring

### 1. Separated Service Pattern
```python
class UserImportService:
    """Handles user/profile creation from Excel"""
    
class EquipmentImportService:
    """Handles equipment import from Excel"""
```

### 2. Fixed File Upload Pattern
```python
@router.post("/import-usuarios")
async def import_usuarios(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    # Read bytes directly
    file_content = await file.read()
    # Process with service
```

### 3. Security Pattern
```python
def verify_admin_token(authorization: Optional[str]) -> bool:
    """Verify Bearer token matches API_ADMIN_TOKEN"""
    if not authorization:
        return False
    scheme, token = authorization.split(' ', 1)
    return scheme.lower() == 'bearer' and token == settings.API_ADMIN_TOKEN
```

### 4. Response Pattern
```python
def build_response(ok: bool, metrics: dict, errors: list) -> JSONResponse:
    """Build consistent JSON response"""
    return JSONResponse(
        status_code=200 if ok else 400,
        content={
            "ok": ok,
            **metrics,
            "errores": errors
        }
    )
```

### 5. Frontend FormData Pattern
```typescript
const formData = new FormData();
formData.append('file', selectedFile);

const response = await api.post('/import-usuarios', formData, {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

## Database Patterns

### Upsert Pattern
```python
# Users: upsert by email
existing = supabase.table("profiles").select("user_id").eq("email", email).execute()
if existing.data:
    # Update
else:
    # Insert

# Equipment: upsert by num_serie
existing = supabase.table("equipos").select("equipo_id").eq("num_serie", num_serie).execute()
if existing.data:
    # Update
else:
    # Insert
```

### Foreign Key Resolution
```python
# Get estado_equipo_id
estado_response = supabase.table("estados_equipo").select("estado_equipo_id").eq("nombre", estado).execute()
estado_equipo_id = estado_response.data[0]["estado_equipo_id"]

# Get responsable_id
profile_response = supabase.table("profiles").select("user_id").eq("email", email).execute()
responsable_id = profile_response.data[0]["user_id"]
```

## Error Handling Patterns

### Backend Error Responses
- 400: Invalid template, missing columns, bad data
- 401: Missing authorization header
- 403: Invalid token
- 500: Internal server error

### Frontend Error Display
```typescript
// Show errors as list of strings
{errors.map((error, index) => (
  <Alert key={index} variant="destructive">
    <AlertDescription>
      Fila {error.fila}: {error.mensaje}
    </AlertDescription>
  </Alert>
))}
```

## Configuration Patterns

### Environment Variables
```python
class Settings:
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    API_ADMIN_TOKEN: str
```

### Validation
```python
def validate_import_env() -> bool:
    """Validate required environment variables for import"""
    required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [var for var in required if not getattr(settings, var)]
    if missing:
        raise ValueError(f"Missing: {', '.join(missing)}")
    return True
```
