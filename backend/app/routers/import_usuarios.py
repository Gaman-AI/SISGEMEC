"""
Router para importación de usuarios desde Excel
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Header
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import os
import traceback

from app.config import settings
from app.services.user_import import UserImportService

router = APIRouter(prefix="/import-usuarios", tags=["import-usuarios"])

def verify_admin_token(authorization: Optional[str] = Header(None)) -> bool:
    """Verifica el token de administración"""
    if not authorization:
        return False
    
    try:
        # Extraer token del header "Bearer <token>"
        scheme, token = authorization.split(' ', 1)
        if scheme.lower() != 'bearer':
            return False
        
        # Verificar token
        if not settings.API_ADMIN_TOKEN:
            # En desarrollo, permitir cualquier token si no está configurado
            return True
            
        return token == settings.API_ADMIN_TOKEN
    except (ValueError, AttributeError):
        return False

@router.post("")
async def import_usuarios(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Importa usuarios desde archivo Excel a la base de datos
    
    - **file**: Archivo Excel (.xlsx/.xls) con hoja "Usuarios"
    - **authorization**: Header "Bearer <API_ADMIN_TOKEN>"
    
    **Estructura esperada del Excel:**
    
    **Hoja "Usuarios":**
    - First Name (obligatorio)
    - Last Name (obligatorio)
    - Email Address (obligatorio, UNIQUE global)
    - Department (opcional)
    - Phone (opcional)
    - Location (opcional)
    
    **Reglas:**
    - email = lower().strip()
    - full_name = First Name + ' ' + Last Name
    - Si no existe en auth.users: crear con Admin API (email_confirm=True)
    - Upsert en profiles por email con role='RESPONSABLE', active=true
    """
    
    # Verificar autorización
    if not verify_admin_token(authorization):
        return JSONResponse(
            status_code=401,
            content={
                "ok": False,
                "total_filas_excel": 0,
                "perfiles_procesados": 0,
                "perfiles_creados": 0,
                "perfiles_actualizados": 0,
                "errores": [{"fila": "-", "mensaje": "Token de administración requerido"}]
            }
        )
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Validar archivo
        if not file.filename:
            logger.warning("Archivo Excel no enviado")
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "total_filas_excel": 0,
                    "perfiles_procesados": 0,
                    "perfiles_creados": 0,
                    "perfiles_actualizados": 0,
                    "errores": [{"fila": "-", "mensaje": "Archivo Excel inválido o no enviado"}]
                }
            )
        
        # Validar content-type
        allowed_content_types = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ]
        
        if file.content_type and file.content_type not in allowed_content_types:
            logger.warning(f"Content-type no soportado: {file.content_type}")
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "total_filas_excel": 0,
                    "perfiles_procesados": 0,
                    "perfiles_creados": 0,
                    "perfiles_actualizados": 0,
                    "errores": [{"fila": "-", "mensaje": f"Tipo de contenido no soportado: {file.content_type}"}]
                }
            )
        
        # Validar extensión
        allowed_extensions = ['.xlsx', '.xls']
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in allowed_extensions:
            logger.warning(f"Extensión no soportada: {file_ext}")
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "total_filas_excel": 0,
                    "perfiles_procesados": 0,
                    "perfiles_creados": 0,
                    "perfiles_actualizados": 0,
                    "errores": [{"fila": "-", "mensaje": f"Formato de archivo no soportado. Use: {', '.join(allowed_extensions)}"}]
                }
            )
        
        # Validar variables de entorno para importación
        settings.validate_import_env()
        
        # Leer contenido del archivo
        file_content = await file.read()
        logger.info(f"Archivo recibido: {file.filename}, tamaño: {len(file_content)} bytes, content-type: {file.content_type}")
        
        if not file_content:
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "total_filas_excel": 0,
                    "perfiles_procesados": 0,
                    "perfiles_creados": 0,
                    "perfiles_actualizados": 0,
                    "errores": [{"fila": "-", "mensaje": "El archivo está vacío"}]
                }
            )
        
        # Procesar importación
        import_service = UserImportService()
        result = import_service.process(file_content)
        
        # Extraer datos del resultado
        total_filas_excel = result.get("total_filas_excel", 0)
        perfiles_procesados = result.get("perfiles_procesados", 0)
        perfiles_creados = result.get("perfiles_creados", 0)
        perfiles_actualizados = result.get("perfiles_actualizados", 0)
        errores = result.get("errores", [])
        
        logger.info(f"Importación completada: {total_filas_excel} filas, {perfiles_procesados} perfiles, {perfiles_creados} creados, {perfiles_actualizados} actualizados, {len(errores)} errores")
        
        # Respuesta exitosa
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "total_filas_excel": total_filas_excel,
                "perfiles_procesados": perfiles_procesados,
                "perfiles_creados": perfiles_creados,
                "perfiles_actualizados": perfiles_actualizados,
                "errores": errores
            }
        )
        
    except Exception as e:
        # Log interno del error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en importación de usuarios: {e}", exc_info=True)
        
        # Respuesta de error interno
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "total_filas_excel": 0,
                "perfiles_procesados": 0,
                "perfiles_creados": 0,
                "perfiles_actualizados": 0,
                "errores": [{"fila": "-", "mensaje": "Error interno del servidor"}]
            }
        )

@router.get("/template")
async def get_template_info():
    """
    Devuelve información sobre la plantilla de Excel esperada
    """
    return {
        "message": "Plantilla de Excel para importación de usuarios",
        "sheet": {
            "name": "Usuarios",
            "description": "Hoja con información de usuarios/responsables",
            "required_columns": [
                "First Name", "Last Name", "Email Address"
            ],
            "optional_columns": [
                "Department", "Phone", "Location"
            ],
            "required_fields": ["First Name", "Last Name", "Email Address"]
        },
        "rules": {
            "email_normalization": "lower().strip()",
            "full_name": "First Name + ' ' + Last Name",
            "auth_creation": "Si no existe en auth.users: crear con Admin API (email_confirm=True)",
            "profile_upsert": "Upsert en profiles por email con role='RESPONSABLE', active=true"
        }
    }
