from fastapi import Header, HTTPException, status
from typing import Optional

def get_bearer_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Extrae el token 'Bearer <JWT>' del header Authorization.
    Lanza 401 si no está presente/formato incorrecto.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta header Authorization",
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de Authorization inválido. Usa: Bearer <token>",
        )
    token = parts[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío",
        )
    return token

