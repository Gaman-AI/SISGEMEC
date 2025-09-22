"""
Router para importación de equipos desde Excel
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Header
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import os
import traceback

from app.config import settings
from app.services.equipment_import import EquipmentImportService

router = APIRouter(prefix="/import-equipos", tags=["import-equipos"])

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
async def import_equipos(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Importa equipos desde archivo Excel a la base de datos
    
    - **file**: Archivo Excel (.xlsx/.xls) con hoja "Equipos"
    - **authorization**: Header "Bearer <API_ADMIN_TOKEN>"
    
    **Estructura esperada del Excel:**
    
    **Hoja "Equipos":**
    - Tipo, Marca, Modelo
    - Número de serie (obligatorio, UNIQUE)
    - Procesador, RAM, Disco, Sistema Operativo
    - Ubicación actual
    - Estado (obligatorio; normalizar)
    - Fecha de ingreso (YYYY-MM-DD) (opcional)
    - Fecha de salida (YYYY-MM-DD) (opcional)
    - Responsable email (obligatorio; debe existir en profiles)
    - Observaciones
    
    **Normalizaciones:**
    - Estado: unidecode + upper() + espacios→_, mapeando alias comunes
    - Fechas: aceptar Timestamp, serial Excel, string; si falla → None
    - Email: lower().strip()
    
    **Estados válidos:** ACTIVO, EN_MANTENIMIENTO, DE_BAJA
    """
    
    # Verificar autorización
    if not verify_admin_token(authorization):
        return JSONResponse(
            status_code=401,
            content={
                "ok": False,
                "total_filas_excel": 0,
                "equipos_procesados": 0,
                "equipos_creados": 0,
                "equipos_actualizados": 0,
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
                    "equipos_procesados": 0,
                    "equipos_creados": 0,
                    "equipos_actualizados": 0,
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
                    "equipos_procesados": 0,
                    "equipos_creados": 0,
                    "equipos_actualizados": 0,
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
                    "equipos_procesados": 0,
                    "equipos_creados": 0,
                    "equipos_actualizados": 0,
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
                    "equipos_procesados": 0,
                    "equipos_creados": 0,
                    "equipos_actualizados": 0,
                    "errores": [{"fila": "-", "mensaje": "El archivo está vacío"}]
                }
            )
        
        # Procesar importación
        import_service = EquipmentImportService()
        result = import_service.process(file_content)
        
        # Extraer datos del resultado
        total_filas_excel = result.get("total_filas_excel", 0)
        equipos_procesados = result.get("equipos_procesados", 0)
        equipos_creados = result.get("equipos_creados", 0)
        equipos_actualizados = result.get("equipos_actualizados", 0)
        errores = result.get("errores", [])
        
        logger.info(f"Importación completada: {total_filas_excel} filas, {equipos_procesados} equipos, {equipos_creados} creados, {equipos_actualizados} actualizados, {len(errores)} errores")
        
        # Respuesta exitosa
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "total_filas_excel": total_filas_excel,
                "equipos_procesados": equipos_procesados,
                "equipos_creados": equipos_creados,
                "equipos_actualizados": equipos_actualizados,
                "errores": errores
            }
        )
        
    except Exception as e:
        # Log interno del error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en importación de equipos: {e}", exc_info=True)
        
        # Respuesta de error interno
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "total_filas_excel": 0,
                "equipos_procesados": 0,
                "equipos_creados": 0,
                "equipos_actualizados": 0,
                "errores": [{"fila": "-", "mensaje": "Error interno del servidor"}]
            }
        )

@router.get("/template")
async def get_template_info():
    """
    Devuelve información sobre la plantilla de Excel esperada
    """
    return {
        "message": "Plantilla de Excel para importación de equipos",
        "sheet": {
            "name": "Equipos",
            "description": "Hoja principal con datos de equipos",
            "required_columns": [
                "Número de serie", "Estado", "Responsable email"
            ],
            "optional_columns": [
                "Tipo", "Marca", "Modelo", "Procesador", "RAM", "Disco",
                "Sistema Operativo", "Ubicación actual", "Fecha de ingreso",
                "Fecha de salida", "Observaciones"
            ],
            "required_fields": ["Número de serie", "Estado", "Responsable email"]
        },
        "valid_states": ["ACTIVO", "EN_MANTENIMIENTO", "DE_BAJA"],
        "state_mapping": {
            "activo": ["activo", "Activo"],
            "en_mantenimiento": ["en mantenimiento", "mantenimiento", "En mantenimiento", "en_mantenimiento"],
            "de_baja": ["de baja", "baja", "Baja", "de_baja"]
        },
        "date_formats": ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"],
        "rules": {
            "estado_normalization": "unidecode + upper() + espacios→_",
            "date_parsing": "aceptar Timestamp, serial Excel, string; si falla → None",
            "email_normalization": "lower().strip()",
            "responsable_validation": "debe existir en profiles (importar usuarios primero)"
        }
    }
