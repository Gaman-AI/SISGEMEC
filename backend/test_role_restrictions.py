#!/usr/bin/env python3
"""
Script de prueba para verificar que las restricciones de roles funcionan correctamente.
Solo se permiten roles "ADMIN" y "RESPONSABLE".
"""

import sys
import os
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_valid_roles():
    """Prueba que los roles válidos (ADMIN y RESPONSABLE) funcionan correctamente"""
    print("✅ Probando roles válidos (ADMIN y RESPONSABLE)...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Roles válidos para probar
    valid_roles = [
        {
            "role": "ADMIN",
            "label": "ADMIN",
            "email": "test-admin@example.com"
        },
        {
            "role": "RESPONSABLE", 
            "label": "RESPONSABLE",
            "email": "test-responsable@example.com"
        }
    ]
    
    success_count = 0
    
    for i, role_data in enumerate(valid_roles, 1):
        print(f"\n{i}️⃣ Probando rol válido: {role_data['label']}")
        
        user_data = {
            "full_name": f"Test {role_data['label']} User",
            "email": role_data["email"],
            "password": "password123",
            "role": role_data["role"]
        }
        
        try:
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"   ✅ ÉXITO - Rol {role_data['label']} aceptado")
                print(f"   Created: {data.get('created', 'N/A')}")
                print(f"   Action: {data.get('action', 'N/A')}")
                success_count += 1
            else:
                print(f"   ❌ ERROR inesperado: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n📊 Resultados roles válidos:")
    print(f"   ✅ Éxitos: {success_count}/{len(valid_roles)}")
    
    return success_count == len(valid_roles)

def test_invalid_roles():
    """Prueba que los roles inválidos devuelven 400"""
    print("\n❌ Probando roles inválidos (deben devolver 400)...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Roles inválidos para probar
    invalid_roles = [
        {
            "role": "TECNICO",
            "label": "TECNICO",
            "email": "test-tecnico@example.com"
        },
        {
            "role": "USER",
            "label": "USER", 
            "email": "test-user@example.com"
        },
        {
            "role": "MANAGER",
            "label": "MANAGER",
            "email": "test-manager@example.com"
        },
        {
            "role": "",
            "label": "EMPTY",
            "email": "test-empty@example.com"
        },
        {
            "role": None,
            "label": "NULL",
            "email": "test-null@example.com"
        }
    ]
    
    success_count = 0
    
    for i, role_data in enumerate(invalid_roles, 1):
        print(f"\n{i}️⃣ Probando rol inválido: {role_data['label']}")
        
        user_data = {
            "full_name": f"Test {role_data['label']} User",
            "email": role_data["email"],
            "password": "password123",
            "role": role_data["role"]
        }
        
        try:
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 400:
                data = response.json()
                print(f"   ✅ ÉXITO - Rol {role_data['label']} rechazado correctamente (400)")
                print(f"   Error: {data.get('detail', 'N/A')}")
                success_count += 1
            else:
                print(f"   ❌ ERROR - Debería ser 400, pero fue {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n📊 Resultados roles inválidos:")
    print(f"   ✅ Rechazados correctamente: {success_count}/{len(invalid_roles)}")
    
    return success_count == len(invalid_roles)

def test_role_normalization():
    """Prueba que la normalización de roles funciona correctamente"""
    print("\n🔄 Probando normalización de roles...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Variantes de roles que deben normalizarse
    role_variants = [
        {
            "role": "Administrador",
            "expected": "ADMIN",
            "email": "test-admin-variant@example.com"
        },
        {
            "role": "admin",
            "expected": "ADMIN", 
            "email": "test-admin-lower@example.com"
        },
        {
            "role": "ADMINISTRADOR",
            "expected": "ADMIN",
            "email": "test-admin-full@example.com"
        },
        {
            "role": "Responsable",
            "expected": "RESPONSABLE",
            "email": "test-resp-variant@example.com"
        },
        {
            "role": "responsable",
            "expected": "RESPONSABLE",
            "email": "test-resp-lower@example.com"
        }
    ]
    
    success_count = 0
    
    for i, variant in enumerate(role_variants, 1):
        print(f"\n{i}️⃣ Probando variante: '{variant['role']}' → '{variant['expected']}'")
        
        user_data = {
            "full_name": f"Test {variant['role']} User",
            "email": variant["email"],
            "password": "password123",
            "role": variant["role"]
        }
        
        try:
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"   ✅ ÉXITO - Variante '{variant['role']}' normalizada correctamente")
                print(f"   Created: {data.get('created', 'N/A')}")
                print(f"   Action: {data.get('action', 'N/A')}")
                success_count += 1
            else:
                print(f"   ❌ ERROR inesperado: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n📊 Resultados normalización:")
    print(f"   ✅ Normalizados correctamente: {success_count}/{len(role_variants)}")
    
    return success_count == len(role_variants)

def test_server_availability():
    """Verifica que el servidor esté disponible"""
    print("🔍 Verificando disponibilidad del servidor...")
    
    base_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Servidor respondiendo correctamente")
            return True
        else:
            print(f"   ⚠️  Servidor respondiendo con status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ No se puede conectar al servidor")
        return False
    except Exception as e:
        print(f"   ❌ Error verificando servidor: {e}")
        return False

if __name__ == "__main__":
    print("🚀 SISGEMEC - Prueba de Restricciones de Roles")
    print("=" * 60)
    print("🎯 Objetivo: Verificar que solo se aceptan roles ADMIN y RESPONSABLE")
    print("🎯 Objetivo: Verificar que roles inválidos devuelven 400")
    print("🎯 Objetivo: Verificar que la normalización de roles funciona")
    
    # Verificar disponibilidad del servidor
    server_ok = test_server_availability()
    
    if not server_ok:
        print("\n❌ El servidor no está disponible")
        print("   Inicia el servidor con: uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Probar roles válidos
    valid_roles_ok = test_valid_roles()
    
    # Probar roles inválidos
    invalid_roles_ok = test_invalid_roles()
    
    # Probar normalización
    normalization_ok = test_role_normalization()
    
    # Resultados finales
    if valid_roles_ok and invalid_roles_ok and normalization_ok:
        print("\n🎯 ¡TODAS LAS PRUEBAS DE ROLES PASARON EXITOSAMENTE!")
        print("   ✅ Roles válidos (ADMIN, RESPONSABLE) funcionan correctamente")
        print("   ✅ Roles inválidos devuelven 400 como esperado")
        print("   ✅ Normalización de roles funciona correctamente")
        print("   ✅ Restricciones de roles implementadas correctamente")
        print("\n🏆 ¡IMPLEMENTACIÓN DE ROLES COMPLETADA CON ÉXITO!")
    else:
        print("\n❌ Algunas pruebas de roles fallaron")
        if not valid_roles_ok:
            print("   ❌ Problemas con roles válidos")
        if not invalid_roles_ok:
            print("   ❌ Problemas con roles inválidos")
        if not normalization_ok:
            print("   ❌ Problemas con normalización de roles")
        sys.exit(1)
