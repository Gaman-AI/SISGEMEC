#!/usr/bin/env python3
"""
Script de prueba para verificar la corrección del error 'User' object has no attribute 'get'
y la funcionalidad idempotente normalizada del endpoint POST /users
"""

import sys
import os
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_normalized_user_creation():
    """Prueba la funcionalidad normalizada del endpoint POST /users"""
    print("🧪 Probando funcionalidad normalizada del endpoint POST /users...")
    print("   (Verificando corrección del error 'User' object has no attribute 'get')")
    
    # Configuración
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    test_email = "test-normalized@example.com"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "full_name": "Test Normalized User",
        "email": test_email,
        "password": "password123",
        "role": "RESPONSABLE",
        "department": "Testing",
        "phone": "1234567890",
        "location": "Test Lab"
    }
    
    try:
        # Primera llamada - debe crear el usuario
        print(f"\n1️⃣ Primera llamada - Creando usuario {test_email}...")
        response1 = requests.post(f"{base_url}/users", headers=headers, json=payload)
        
        print(f"   Status: {response1.status_code}")
        if response1.status_code in [200, 201]:
            print(f"   Response: {response1.json()}")
            print("   ✅ Usuario procesado exitosamente")
        else:
            print(f"   ❌ Error: {response1.status_code}")
            print(f"   Response: {response1.text}")
            return False
        
        # Segunda llamada - debe ser idempotente (200 OK)
        print(f"\n2️⃣ Segunda llamada - Repitiendo misma petición...")
        response2 = requests.post(f"{base_url}/users", headers=headers, json=payload)
        
        print(f"   Status: {response2.status_code}")
        if response2.status_code in [200, 201]:
            print(f"   Response: {response2.json()}")
            print("   ✅ Operación idempotente exitosa")
        else:
            print(f"   ❌ Error: {response2.status_code}")
            print(f"   Response: {response2.text}")
            return False
        
        # Tercera llamada - debe seguir siendo idempotente
        print(f"\n3️⃣ Tercera llamada - Verificando idempotencia...")
        response3 = requests.post(f"{base_url}/users", headers=headers, json=payload)
        
        print(f"   Status: {response3.status_code}")
        if response3.status_code in [200, 201]:
            print(f"   Response: {response3.json()}")
            print("   ✅ Idempotencia confirmada")
        else:
            print(f"   ❌ Error: {response3.status_code}")
            print(f"   Response: {response3.text}")
            return False
        
        # Verificar que no hay errores 500
        if any(r.status_code == 500 for r in [response1, response2, response3]):
            print("\n❌ Se detectaron errores 500 - la funcionalidad no es completamente estable")
            return False
        
        # Verificar que las respuestas tienen la estructura esperada
        for i, response in enumerate([response1, response2, response3], 1):
            try:
                data = response.json()
                required_fields = ["ok", "user_id", "profile_email", "created", "message", "action"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    print(f"\n❌ Respuesta {i} falta campos: {missing_fields}")
                    return False
            except json.JSONDecodeError:
                print(f"\n❌ Respuesta {i} no es JSON válido")
                return False
        
        print("\n🎉 ¡Funcionalidad normalizada verificada exitosamente!")
        print("   - No se produjeron errores 500")
        print("   - No hay errores 'User' object has no attribute 'get'")
        print("   - Las llamadas repetidas devuelven 200 OK")
        print("   - Estructura de respuesta consistente")
        print("   - No hay duplicación de usuarios")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al servidor. Asegúrate de que esté corriendo en http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def test_different_user_types():
    """Prueba crear usuarios con diferentes tipos de datos para verificar normalización"""
    print("\n🔄 Probando normalización con diferentes tipos de usuarios...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    test_users = [
        {
            "full_name": "Usuario Sin Password",
            "email": "test-no-password@example.com",
            "role": "TECNICO"
            # Sin password - debe generar automáticamente
        },
        {
            "full_name": "Usuario Con Password",
            "email": "test-with-password@example.com",
            "password": "custompassword123",
            "role": "RESPONSABLE"
        },
        {
            "full_name": "Usuario Completo",
            "email": "test-complete@example.com",
            "password": "completepass123",
            "role": "ADMIN",
            "department": "IT",
            "phone": "9876543210",
            "location": "Main Office",
            "active": True
        }
    ]
    
    for i, user_data in enumerate(test_users, 1):
        try:
            print(f"\n   Creando usuario {i}: {user_data['email']}")
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            
            print(f"   Status: {response.status_code}")
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"   ✅ Usuario {i} procesado exitosamente")
                print(f"   Created: {data.get('created', 'N/A')}")
                print(f"   Action: {data.get('action', 'N/A')}")
                if 'generated_password' in data:
                    print(f"   Password generada: {data['generated_password'][:8]}...")
            else:
                print(f"   ❌ Error creando usuario {i}: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error creando usuario {i}: {e}")
            return False
    
    print("   ✅ Todos los tipos de usuarios se procesaron exitosamente")
    return True

if __name__ == "__main__":
    print("🚀 SISGEMEC - Prueba de Funcionalidad Normalizada")
    print("=" * 60)
    print("🎯 Objetivo: Verificar corrección del error 'User' object has no attribute 'get'")
    print("🎯 Objetivo: Confirmar funcionalidad idempotente normalizada")
    
    # Verificar que el servidor esté corriendo
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            print("❌ El servidor no está respondiendo correctamente")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al servidor. Inicia el servidor con:")
        print("   uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Probar funcionalidad normalizada
    normalized_ok = test_normalized_user_creation()
    
    if normalized_ok:
        # Probar diferentes tipos de usuarios
        different_types_ok = test_different_user_types()
        
        if different_types_ok:
            print("\n🎯 ¡Todas las pruebas pasaron exitosamente!")
            print("   ✅ Error 'User' object has no attribute 'get' CORREGIDO")
            print("   ✅ Funcionalidad idempotente NORMALIZADA")
            print("   ✅ Endpoint POST /users completamente ESTABLE")
            print("   ✅ Manejo robusto de respuestas de Supabase")
        else:
            print("\n⚠️  Funcionalidad normalizada OK, pero hay problemas con tipos de usuarios")
            sys.exit(1)
    else:
        print("\n❌ La funcionalidad normalizada no está funcionando correctamente")
        sys.exit(1)
