# Auth de Endpoints Admin

## Header Esperado

Los endpoints administrativos requieren el header:
```
Authorization: Bearer <API_ADMIN_TOKEN>
```

## Variables de Entorno

- **Backend:** `API_ADMIN_TOKEN=dev-admin-token-123`
- **Frontend:** `VITE_API_ADMIN_TOKEN=dev-admin-token-123`

## Ejemplo cURL

```bash
curl -X POST http://localhost:8000/users \
  -H "Authorization: Bearer dev-admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "RESPONSABLE"
  }'
```

## Códigos de Respuesta

- **200/201:** Usuario creado exitosamente
- **401:** Missing or invalid Authorization header
- **403:** Forbidden (token no coincide)
- **500:** API_ADMIN_TOKEN not configured

## Endpoints Protegidos

- `POST /users` - Crear usuario
- `POST /import-usuarios` - Importar usuarios desde Excel
- `POST /import-equipos` - Importar equipos desde Excel

## Implementación

### Backend (FastAPI)
```python
def _check_admin_token(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    if not settings.API_ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="API_ADMIN_TOKEN not configured")
    if token != settings.API_ADMIN_TOKEN.strip():
        raise HTTPException(status_code=403, detail="Forbidden")
```

### Frontend (Axios Interceptor)
```typescript
const isAdminPath = (pathname: string) =>
  pathname === "/users" || pathname === "/users/" ||
  pathname === "/import-usuarios" || pathname === "/import-usuarios/" ||
  pathname === "/import-equipos" || pathname === "/import-equipos/";

// Inyecta automáticamente: Authorization: Bearer ${token}
```
