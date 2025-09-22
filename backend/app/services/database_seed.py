"""
Servicio para seeding de datos básicos en la base de datos
"""
import logging
from app.deps.supabase_client import supa_service

logger = logging.getLogger(__name__)

def seed_estados_equipo():
    """Asegura que existan los estados de equipo requeridos"""
    try:
        supabase = supa_service()
        
        # Estados requeridos
        estados_requeridos = [
            {"nombre": "ACTIVO"},
            {"nombre": "EN_MANTENIMIENTO"},
            {"nombre": "DE_BAJA"}
        ]
        
        # Verificar qué estados ya existen
        response = supabase.table("estados_equipo").select("nombre").execute()
        estados_existentes = {estado["nombre"] for estado in response.data or []}
        
        # Insertar estados faltantes
        estados_a_insertar = []
        for estado in estados_requeridos:
            if estado["nombre"] not in estados_existentes:
                estados_a_insertar.append(estado)
        
        if estados_a_insertar:
            supabase.table("estados_equipo").insert(estados_a_insertar).execute()
            logger.info(f"Estados de equipo insertados: {[e['nombre'] for e in estados_a_insertar]}")
        else:
            logger.info("Todos los estados de equipo ya existen")
        
        return True
        
    except Exception as e:
        logger.error(f"Error seeding estados_equipo: {e}")
        return False

def ensure_database_seed():
    """Ejecuta todos los seeds necesarios"""
    try:
        seed_estados_equipo()
        logger.info("Database seeding completado")
        return True
    except Exception as e:
        logger.error(f"Error en database seeding: {e}")
        return False
