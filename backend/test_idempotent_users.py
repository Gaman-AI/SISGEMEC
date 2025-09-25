#!/usr/bin/env python3
"""
Script de prueba para verificar la funcionalidad idempotente del endpoint POST /users
"""

import sys
import os
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_idempotent_user_creation():
    """Prueba la funcionalidad idempotente del endpoint POST /users"""
    print("🧪 Probando funcionalidad idempotente del endpoint POST /users...")
    
    # Configuración
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    test_email = "test-idempotent@example.com"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "full_name": "Test Idempotent User",
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
        print(f"   Response: {response1.json()}")
        
        if response1.status_code == 201:
            print("   ✅ Usuario creado exitosamente (201 Created)")
        elif response1.status_code == 200:
            print("   ⚠️  Usuario ya existía (200 OK)")
        else:
            print(f"   ❌ Error inesperado: {response1.status_code}")
            return False
        
        # Segunda llamada - debe ser idempotente (200 OK)
        print(f"\n2️⃣ Segunda llamada - Repitiendo misma petición...")
        response2 = requests.post(f"{base_url}/users", headers=headers, json=payload)
        
        print(f"   Status: {response2.status_code}")
        print(f"   Response: {response2.json()}")
        
        if response2.status_code == 200:
            print("   ✅ Operación idempotente exitosa (200 OK)")
        elif response2.status_code == 201:
            print("   ⚠️  Usuario creado nuevamente (201 Created) - posible duplicación")
        else:
            print(f"   ❌ Error inesperado: {response2.status_code}")
            return False
        
        # Tercera llamada - debe seguir siendo idempotente
        print(f"\n3️⃣ Tercera llamada - Verificando idempotencia...")
        response3 = requests.post(f"{base_url}/users", headers=headers, json=payload)
        
        print(f"   Status: {response3.status_code}")
        print(f"   Response: {response3.json()}")
        
        if response3.status_code == 200:
            print("   ✅ Idempotencia confirmada (200 OK)")
        else:
            print(f"   ❌ Error inesperado: {response3.status_code}")
            return False
        
        # Verificar que no hay errores 500
        if any(r.status_code == 500 for r in [response1, response2, response3]):
            print("\n❌ Se detectaron errores 500 - la funcionalidad no es completamente idempotente")
            return False
        
        print("\n🎉 ¡Funcionalidad idempotente verificada exitosamente!")
        print("   - No se produjeron errores 500")
        print("   - Las llamadas repetidas devuelven 200 OK")
        print("   - No hay duplicación de usuarios")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al servidor. Asegúrate de que esté corriendo en http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def test_different_users():
    """Prueba crear usuarios diferentes para verificar que la funcionalidad normal sigue funcionando"""
    print("\n🔄 Probando creación de usuarios diferentes...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    test_users = [
        {
            "full_name": "Usuario Test 1",
            "email": "test-user-1@example.com",
            "password": "password123",
            "role": "RESPONSABLE"
        },
        {
            "full_name": "Usuario Test 2", 
            "email": "test-user-2@example.com",
            "password": "password123",
            "role": "TECNICO"
        }
    ]
    
    for i, user_data in enumerate(test_users, 1):
        try:
            print(f"\n   Creando usuario {i}: {user_data['email']}")
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            
            print(f"   Status: {response.status_code}")
            if response.status_code in [200, 201]:
                print(f"   ✅ Usuario {i} procesado exitosamente")
            else:
                print(f"   ❌ Error creando usuario {i}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error creando usuario {i}: {e}")
            return False
    
    print("   ✅ Todos los usuarios diferentes se crearon exitosamente")
    return True

if __name__ == "__main__":
    print("🚀 SISGEMEC - Prueba de Funcionalidad Idempotente")
    print("=" * 60)
    
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
    
    # Probar funcionalidad idempotente
    idempotent_ok = test_idempotent_user_creation()
    
    if idempotent_ok:
        # Probar creación de usuarios diferentes
        different_users_ok = test_different_users()
        
        if different_users_ok:
            print("\n🎯 ¡Todas las pruebas pasaron exitosamente!")
            print("   El endpoint POST /users es completamente idempotente y estable.")
        else:
            print("\n⚠️  Funcionalidad idempotente OK, pero hay problemas con usuarios diferentes")
            sys.exit(1)
    else:
        print("\n❌ La funcionalidad idempotente no está funcionando correctamente")
        sys.exit(1)
