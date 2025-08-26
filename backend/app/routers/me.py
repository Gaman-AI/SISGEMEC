from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.deps.supabase_client import client_with_token

router = APIRouter(tags=["me"])
security = HTTPBearer()

@router.get("/me")
def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Devuelve { user_id, email, role } leyendo de 'profiles' bajo RLS.
    Esquema-agnóstico: acepta PK llamada 'id', 'user_id' o 'profile_id'.
    RLS debe devolver exactamente UNA fila del usuario autenticado.
    """
    token = credentials.credentials
    sb = client_with_token(token)

    # Pedimos * (todas las columnas) y dejamos que RLS limite a 1 fila.
    # Usamos .limit(1) + .execute() y validamos que regresó 1.
    try:
        resp = sb.table("profiles").select("*").limit(1).execute()
        rows = resp.data or []
        
        if len(rows) != 1:
            # Si RLS no devuelve 1 fila, puede ser que falte la fila de profile
            # o la policy no deja ver su propio perfil.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil no encontrado o sin permisos (RLS)."
            )
        row = rows[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar perfil: {str(e)}"
        )

    # Detectamos la PK real
    pk = row.get("id") or row.get("user_id") or row.get("profile_id")
    return {
        "user_id": pk,
        "email": row.get("email"),
        "role": row.get("role"),
    }


