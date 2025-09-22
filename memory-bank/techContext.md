# Technical Context - SISGEMEC 2.0

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Processing**: pandas, openpyxl
- **Text Processing**: unidecode
- **HTTP Client**: httpx (via Supabase client)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: react-hook-form with zod validation
- **HTTP Client**: Axios
- **State Management**: React hooks

### Database
- **Provider**: Supabase
- **Type**: PostgreSQL
- **Security**: Row Level Security (RLS)
- **Auth**: Supabase Auth with JWT

## Current Dependencies

### Backend (requirements.txt)
```
fastapi
uvicorn
python-dotenv
supabase
pandas
openpyxl
unidecode
```

### Frontend (package.json)
```
react
typescript
vite
tailwindcss
@hookform/resolvers
zod
axios
lucide-react
```

## Development Environment

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables (.env)
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API
API_ADMIN_TOKEN=your_admin_token
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Application
DEBUG=true
ENVIRONMENT=development
```

## Database Schema

### Key Tables
1. **auth.users** (Supabase managed)
2. **public.profiles** (user profiles with roles)
3. **public.equipos** (equipment inventory)
4. **public.estados_equipo** (equipment states)
5. **public.responsables** (responsibles/assignees)

### Relationships
- `profiles.user_id` → `auth.users.id`
- `equipos.responsable_id` → `profiles.user_id`
- `equipos.estado_equipo_id` → `estados_equipo.estado_equipo_id`

## Security Model

### Authentication
- Supabase Auth for user authentication
- JWT tokens for session management
- Service Role Key for admin operations

### Authorization
- Row Level Security (RLS) policies
- Role-based access (ADMIN, RESPONSABLE, USER)
- API Admin Token for import operations

### Data Protection
- Environment variables for secrets
- No hardcoded credentials
- Secure file upload handling

## File Processing

### Excel Support
- Formats: .xlsx, .xls
- Libraries: pandas, openpyxl
- Processing: In-memory with BytesIO

### Data Validation
- Schema validation with pandas
- Custom validation rules
- Error collection and reporting

## API Design

### RESTful Endpoints
- `/api/v1/import-usuarios` - User import
- `/api/v1/import-equipos` - Equipment import
- `/api/v1/import-inventario` - Legacy combined import (to be deprecated)

### Response Format
```json
{
  "ok": boolean,
  "total_filas_excel": number,
  "perfiles_procesados": number,
  "perfiles_creados": number,
  "perfiles_actualizados": number,
  "equipos_procesados": number,
  "equipos_creados": number,
  "equipos_actualizados": number,
  "errores": [
    {
      "fila": number | string,
      "mensaje": string
    }
  ]
}
```

## Error Handling

### Backend
- Structured error responses
- Logging with Python logging
- Graceful degradation

### Frontend
- Error boundaries
- User-friendly error messages
- Toast notifications

## Performance Considerations

### Backend
- In-memory file processing
- Batch database operations
- Connection pooling via Supabase

### Frontend
- Lazy loading
- Error boundaries
- Optimized re-renders

## Deployment

### Backend
- Uvicorn ASGI server
- Environment-based configuration
- Health check endpoints

### Frontend
- Static build with Vite
- CDN deployment ready
- Environment variable injection
