#!/usr/bin/env python3
"""
Script de prueba para los importadores separados (Usuarios y Equipos)
"""
import os
import sys
import asyncio
import logging
from pathlib import Path

# Agregar el directorio del proyecto al path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.user_import import UserImportService
from app.services.equipment_import import EquipmentImportService
from app.services.database_seed import ensure_database_seed

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_seed():
    """Prueba el seeding de la base de datos"""
    logger.info("Probando database seeding...")
    try:
        result = ensure_database_seed()
        if result:
            logger.info("✅ Database seeding exitoso")
        else:
            logger.error("❌ Database seeding falló")
        return result
    except Exception as e:
        logger.error(f"❌ Error en database seeding: {e}")
        return False

def test_user_import_service():
    """Prueba el servicio de importación de usuarios"""
    logger.info("Probando UserImportService...")
    try:
        service = UserImportService()
        logger.info("✅ UserImportService inicializado correctamente")
        
        # Probar con datos de prueba (bytes vacíos para validar errores)
        result = service.process(b"")
        logger.info(f"Resultado con datos vacíos: {result}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error en UserImportService: {e}")
        return False

def test_equipment_import_service():
    """Prueba el servicio de importación de equipos"""
    logger.info("Probando EquipmentImportService...")
    try:
        service = EquipmentImportService()
        logger.info("✅ EquipmentImportService inicializado correctamente")
        
        # Probar con datos de prueba (bytes vacíos para validar errores)
        result = service.process(b"")
        logger.info(f"Resultado con datos vacíos: {result}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error en EquipmentImportService: {e}")
        return False

def main():
    """Función principal de pruebas"""
    logger.info("🚀 Iniciando pruebas de importadores separados...")
    
    tests = [
        ("Database Seed", test_database_seed),
        ("User Import Service", test_user_import_service),
        ("Equipment Import Service", test_equipment_import_service),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n--- Probando {test_name} ---")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ Error inesperado en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen de resultados
    logger.info("\n" + "="*50)
    logger.info("📊 RESUMEN DE PRUEBAS")
    logger.info("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nResultado: {passed}/{total} pruebas pasaron")
    
    if passed == total:
        logger.info("🎉 ¡Todas las pruebas pasaron!")
        return 0
    else:
        logger.error("💥 Algunas pruebas fallaron")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
