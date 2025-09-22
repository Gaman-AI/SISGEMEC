"""
Router para importación de inventario desde Excel
"""
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Header
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import os
import traceback

from app.config import settings
from app.services.excel_import import ExcelImportService

router = APIRouter(prefix="/import-inventario", tags=["import-inventario"])

def _ok_response(filas_procesadas: int, equipos_procesados: int, perfiles_creados: int, errores: List[Dict[str, Any]] = None) -> JSONResponse:
    """Helper para respuesta exitosa"""
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "filas_procesadas": filas_procesadas,
            "equipos_procesados": equipos_procesados,
            "perfiles_creados": perfiles_creados,
            "errores": errores or []
        }
    )

def _fail_response(status: int, filas_procesadas: int = 0, equipos_procesados: int = 0, perfiles_creados: int = 0, errores: List[Dict[str, Any]] = None) -> JSONResponse:
    """Helper para respuesta de error"""
    return JSONResponse(
        status_code=status,
        content={
            "ok": False,
            "filas_procesadas": filas_procesadas,
            "equipos_procesados": equipos_procesados,
            "perfiles_creados": perfiles_creados,
            "errores": errores or []
        }
    )

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
async def import_inventario(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization")
):
    """
    Importa inventario desde archivo Excel a la base de datos
    
    - **file**: Archivo Excel (.xlsx/.xls) con hojas "Inventario" y "Lista de correos"
    - **authorization**: Header "Bearer <API_ADMIN_TOKEN>"
    
    **Estructura esperada del Excel:**
    
    **Hoja "Inventario":**
    - Activo, Modelo, Número de serie, Procesador, RAM, Disco, Sistema Operativo, Ubicación actual, Estado, Observaciones, Email Responsable
    
    **Hoja "Lista de correos":**
    - First Name, Last Name, Email Address
    
    **Estados válidos:** ACTIVO, EN_MANTENIMIENTO, DE_BAJA (acepta variaciones)
    """
    
    # Verificar autorización
    if not verify_admin_token(authorization):
        return _fail_response(401, errores=[{"fila": "-", "mensaje": "Token de administración requerido"}])
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Validar archivo
        if not file.filename:
            logger.warning("Archivo Excel no enviado")
            return _fail_response(400, errores=[{"fila": "-", "mensaje": "Archivo Excel inválido o no enviado"}])
        
        # Validar content-type
        allowed_content_types = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ]
        
        if file.content_type and file.content_type not in allowed_content_types:
            logger.warning(f"Content-type no soportado: {file.content_type}")
            return _fail_response(400, errores=[{"fila": "-", "mensaje": f"Tipo de contenido no soportado: {file.content_type}"}])
        
        # Validar extensión
        allowed_extensions = ['.xlsx', '.xls']
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in allowed_extensions:
            logger.warning(f"Extensión no soportada: {file_ext}")
            return _fail_response(400, errores=[{"fila": "-", "mensaje": f"Formato de archivo no soportado. Use: {', '.join(allowed_extensions)}"}])
        
        # Validar variables de entorno para importación
        settings.validate_import_env()
        
        # Leer contenido del archivo
        file_content = await file.read()
        logger.info(f"Archivo recibido: {file.filename}, tamaño: {len(file_content)} bytes, content-type: {file.content_type}")
        
        if not file_content:
            return _fail_response(400, errores=[{"fila": "-", "mensaje": "El archivo está vacío"}])
        
        # Procesar importación
        import_service = ExcelImportService()
        result = import_service.process(file_content)
        
        # Extraer datos del resultado
        filas_procesadas = result.get("filas_procesadas", 0)
        equipos_procesados = result.get("equipos_procesados", 0)
        perfiles_creados = result.get("perfiles_creados", 0)
        errores = result.get("errores", [])
        
        logger.info(f"Importación completada: {filas_procesadas} filas, {equipos_procesados} equipos, {perfiles_creados} perfiles, {len(errores)} errores")
        
        # Si hay errores de validación, devolver 422
        if not result.get("ok"):
            return _fail_response(422, filas_procesadas, equipos_procesados, perfiles_creados, errores)
        
        # Éxito
        return _ok_response(filas_procesadas, equipos_procesados, perfiles_creados, errores)
        
    except Exception as e:
        # Log interno del error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en importación de inventario: {e}", exc_info=True)
        
        # Respuesta de error interno
        return _fail_response(500, errores=[{"fila": "-", "mensaje": "Error interno del servidor"}])

@router.get("/template")
async def get_template_info():
    """
    Devuelve información sobre la plantilla de Excel esperada
    """
    return {
        "message": "Plantilla de Excel para importación de inventario",
        "sheets": {
            settings.SHEET_INVENTARIO: {
                "description": "Hoja principal con datos del inventario",
                "required_columns": [
                    "Usuario", "Activo", "Marca", "Modelo", "Número de serie",
                    "Procesador", "RAM", "Disco", "Sistema Operativo",
                    "Ubicación actual", "Estado", "Fecha de compra", "Observaciones"
                ],
                "required_fields": ["Número de serie", "Estado"]
            },
            settings.SHEET_CORREOS: {
                "description": "Hoja con información de usuarios/responsables",
                "required_columns": [
                    "First Name", "Last Name", "Email Address"
                ],
                "required_fields": ["First Name", "Last Name", "Email Address"]
            }
        },
        "valid_states": ["activo", "en_mantenimiento", "de_baja"],
        "state_mapping": {
            "activo": ["activo", "Activo"],
            "en_mantenimiento": ["en mantenimiento", "mantenimiento", "En mantenimiento"],
            "de_baja": ["de baja", "baja", "Baja"]
        },
        "join_logic": {
            "primary": "Por email si está disponible en la hoja Inventario",
            "fallback": "Por nombre normalizado (Usuario ↔ First Name + Last Name)"
        }
    }
