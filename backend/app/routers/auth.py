from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from app.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Supabase client
def get_supabase_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration not found"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str
    role: str

class SessionResponse(BaseModel):
    user_id: str
    email: str
    role: str
    is_valid: bool

# Endpoints
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    Autentica al usuario usando Supabase Auth
    """
    try:
        supabase = get_supabase_client()
        
        # Autenticar con Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Obtener el perfil del usuario - probamos diferentes nombres de columna
        try:
            profile_response = supabase.table("profiles").select("*").eq("user_id", auth_response.user.id).execute()
            
            # Si no funciona con user_id, probamos con id
            if not profile_response.data:
                profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
            
            if not profile_response.data:
                # Si no hay perfil, crear uno básico
                try:
                    basic_profile = {
                        "user_id": auth_response.user.id,
                        "email": auth_response.user.email,
                        "role": "USER",
                        "nombre": "Usuario"
                    }
                    supabase.table("profiles").insert(basic_profile).execute()
                    role = "USER"
                except Exception as profile_error:
                    print(f"Warning: No se pudo crear perfil automático: {profile_error}")
                    role = "USER"
            else:
                profile = profile_response.data[0]
                role = profile.get("role", "USER")
                
        except Exception as e:
            print(f"Warning: Error al consultar/crear perfil: {e}")
            # Continuar con rol por defecto
            role = "USER"
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            user_id=auth_response.user.id,
            email=auth_response.user.email,
            role=role
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en autenticación: {str(e)}"
        )

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Cierra la sesión del usuario
    """
    try:
        supabase = get_supabase_client()
        token = credentials.credentials
        
        # Cerrar sesión en Supabase
        supabase.auth.sign_out()
        
        return {"message": "Sesión cerrada exitosamente"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cerrar sesión: {str(e)}"
        )

@router.get("/session", response_model=SessionResponse)
async def verify_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifica si la sesión del usuario es válida
    """
    try:
        supabase = get_supabase_client()
        token = credentials.credentials
        
        # Verificar token con Supabase
        user_response = supabase.auth.get_user(token)
        
        if user_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        # Obtener perfil del usuario - probamos diferentes nombres de columna
        try:
            profile_response = supabase.table("profiles").select("*").eq("user_id", user_response.user.id).execute()
            
            # Si no funciona con user_id, probamos con id
            if not profile_response.data:
                profile_response = supabase.table("profiles").select("*").eq("id", user_response.user.id).execute()
            
            if not profile_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Perfil de usuario no encontrado. Verifica que la tabla profiles tenga datos."
                )
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al consultar perfil: {str(e)}"
            )
        
        profile = profile_response.data[0]
        
        return SessionResponse(
            user_id=user_response.user.id,
            email=user_response.user.email,
            role=profile.get("role", "user"),
            is_valid=True
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error en verificación de sesión: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Refresca el token de acceso usando el refresh token
    """
    try:
        supabase = get_supabase_client()
        token = credentials.credentials
        
        # Refrescar token con Supabase
        session_response = supabase.auth.refresh_session(token)
        
        if session_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo refrescar el token"
            )
        
        return {
            "access_token": session_response.session.access_token,
            "refresh_token": session_response.session.refresh_token
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al refrescar token: {str(e)}"
        )

@router.get("/debug/profiles")
async def debug_profiles():
    """
    Endpoint temporal para debuggear la estructura de la tabla profiles
    """
    try:
        supabase = get_supabase_client()
        
        # Intentar obtener información de la tabla
        try:
            response = supabase.table("profiles").select("*").limit(5).execute()
            
            # Si no hay datos, intentar obtener la estructura
            if not response.data:
                # Intentar con una consulta más simple
                try:
                    simple_response = supabase.table("profiles").select("1").limit(1).execute()
                    return {
                        "message": "Tabla profiles existe pero no tiene datos",
                        "simple_query_result": "OK",
                        "columns": "No se pueden determinar las columnas sin datos"
                    }
                except Exception as e:
                    return {
                        "message": "Tabla profiles existe pero no tiene datos",
                        "simple_query_result": f"Error en consulta simple: {str(e)}",
                        "columns": "No se pueden determinar las columnas sin datos"
                    }
                    
        except Exception as e:
            return {
                "error": str(e),
                "message": "Error al consultar la tabla profiles"
            }
        
        # Si hay datos, mostrar la estructura
        sample_row = response.data[0]
        columns = list(sample_row.keys())
        
        return {
            "message": "Estructura de la tabla profiles",
            "columns": columns,
            "sample_data": sample_row,
            "total_rows": len(response.data)
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "message": "Error inesperado al debuggear profiles"
        }

@router.get("/debug/table-info")
async def debug_table_info():
    """
    Endpoint para obtener información básica de la tabla sin consultas complejas
    """
    try:
        supabase = get_supabase_client()
        
        # Intentar una consulta muy simple
        try:
            # Solo contar filas
            count_response = supabase.table("profiles").select("*", count="exact").execute()
            
            return {
                "message": "Consulta básica exitosa",
                "table_exists": True,
                "row_count": count_response.count if hasattr(count_response, 'count') else "No disponible",
                "status": "OK"
            }
            
        except Exception as e:
            return {
                "message": "Error en consulta básica",
                "table_exists": True,
                "error": str(e),
                "status": "ERROR"
            }
            
    except Exception as e:
        return {
            "error": str(e),
            "message": "Error al conectar con Supabase",
            "table_exists": False,
            "status": "CONNECTION_ERROR"
        }

@router.get("/debug/connection")
async def debug_connection():
    """
    Endpoint para verificar la conexión básica a Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Verificar que podemos crear el cliente
        return {
            "message": "Conexión a Supabase establecida correctamente",
            "url": settings.SUPABASE_URL,
            "has_anon_key": bool(settings.SUPABASE_ANON_KEY),
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "message": "Error al conectar con Supabase"
        }
