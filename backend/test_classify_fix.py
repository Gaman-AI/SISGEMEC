#!/usr/bin/env python3
"""
Script de prueba para verificar el fix del endpoint PUT /tickets/{id}/clasificar
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuración
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "josemariaesquivel978@gmail.com"

def test_classify_with_email():
    """Probar clasificación con email en solicitante_id"""
    
    print("🧪 Probando fix de clasificación con email...")
    
    # 1. Crear un ticket de prueba
    print("\n1. Creando ticket de prueba...")
    ticket_data = {
        "solicitante_email": TEST_EMAIL,
        "solicitante_nombre": "José María Esquivel",
        "descripcion": "Problema de prueba para clasificación",
        "fuente": "manual",
        "requires_classification": True
    }
    
    try:
        create_resp = requests.post(f"{BASE_URL}/tickets", json=ticket_data)
        if create_resp.status_code != 201:
            print(f"❌ Error creando ticket: {create_resp.status_code} - {create_resp.text}")
            return False
            
        ticket = create_resp.json()
        ticket_id = ticket["ticket_id"]
        print(f"✅ Ticket creado: ID {ticket_id}")
        
    except Exception as e:
        print(f"❌ Error en creación: {e}")
        return False
    
    # 2. Probar clasificación con email
    print(f"\n2. Probando clasificación con email '{TEST_EMAIL}'...")
    classify_data = {
        "solicitante_id": TEST_EMAIL,  # Email en lugar de UUID
        "equipo_id": 1,  # Asumiendo que existe
        "tipo_servicio_id": 1,  # Asumiendo que existe
        "priority": "Important",
        "observaciones": "Clasificación de prueba con email"
    }
    
    try:
        classify_resp = requests.put(f"{BASE_URL}/tickets/{ticket_id}/clasificar", json=classify_data)
        
        if classify_resp.status_code == 200:
            print("✅ Clasificación exitosa!")
            result = classify_resp.json()
            print(f"   - requires_classification: {result.get('requires_classification')}")
            print(f"   - solicitante_id: {result.get('solicitante_id')}")
            print(f"   - priority: {result.get('priority')}")
            return True
        else:
            print(f"❌ Error en clasificación: {classify_resp.status_code}")
            print(f"   Response: {classify_resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error en clasificación: {e}")
        return False

def test_classify_with_uuid():
    """Probar clasificación con UUID válido"""
    
    print("\n🧪 Probando clasificación con UUID...")
    
    # 1. Obtener UUID del usuario
    print(f"\n1. Buscando UUID para email '{TEST_EMAIL}'...")
    try:
        # Esto requeriría un endpoint para buscar usuarios, pero por ahora asumimos que sabemos el UUID
        # En un caso real, esto vendría de la base de datos
        test_uuid = "550e8400-e29b-41d4-a716-446655440000"  # UUID de ejemplo
        print(f"✅ Usando UUID de prueba: {test_uuid}")
        
    except Exception as e:
        print(f"❌ Error obteniendo UUID: {e}")
        return False
    
    # 2. Crear ticket de prueba
    print("\n2. Creando ticket de prueba...")
    ticket_data = {
        "solicitante_email": TEST_EMAIL,
        "solicitante_nombre": "José María Esquivel",
        "descripcion": "Problema de prueba para clasificación con UUID",
        "fuente": "manual",
        "requires_classification": True
    }
    
    try:
        create_resp = requests.post(f"{BASE_URL}/tickets", json=ticket_data)
        if create_resp.status_code != 201:
            print(f"❌ Error creando ticket: {create_resp.status_code} - {create_resp.text}")
            return False
            
        ticket = create_resp.json()
        ticket_id = ticket["ticket_id"]
        print(f"✅ Ticket creado: ID {ticket_id}")
        
    except Exception as e:
        print(f"❌ Error en creación: {e}")
        return False
    
    # 3. Probar clasificación con UUID
    print(f"\n3. Probando clasificación con UUID...")
    classify_data = {
        "solicitante_id": test_uuid,  # UUID directo
        "equipo_id": 1,
        "tipo_servicio_id": 1,
        "priority": "Medium",
        "observaciones": "Clasificación de prueba con UUID"
    }
    
    try:
        classify_resp = requests.put(f"{BASE_URL}/tickets/{ticket_id}/clasificar", json=classify_data)
        
        if classify_resp.status_code == 200:
            print("✅ Clasificación con UUID exitosa!")
            result = classify_resp.json()
            print(f"   - requires_classification: {result.get('requires_classification')}")
            print(f"   - solicitante_id: {result.get('solicitante_id')}")
            print(f"   - priority: {result.get('priority')}")
            return True
        else:
            print(f"❌ Error en clasificación: {classify_resp.status_code}")
            print(f"   Response: {classify_resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error en clasificación: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas del fix de clasificación...")
    print(f"   URL base: {BASE_URL}")
    print(f"   Email de prueba: {TEST_EMAIL}")
    
    # Verificar que el servidor esté corriendo
    try:
        health_resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if health_resp.status_code != 200:
            print("❌ El servidor no está respondiendo correctamente")
            return 1
    except Exception as e:
        print(f"❌ No se puede conectar al servidor: {e}")
        print("   Asegúrate de que el backend esté corriendo en http://localhost:8000")
        return 1
    
    print("✅ Servidor respondiendo correctamente")
    
    # Ejecutar pruebas
    success_count = 0
    total_tests = 2
    
    if test_classify_with_email():
        success_count += 1
    
    if test_classify_with_uuid():
        success_count += 1
    
    # Resultados
    print(f"\n📊 Resultados: {success_count}/{total_tests} pruebas exitosas")
    
    if success_count == total_tests:
        print("🎉 ¡Todas las pruebas pasaron! El fix está funcionando correctamente.")
        return 0
    else:
        print("❌ Algunas pruebas fallaron. Revisa los logs arriba.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
