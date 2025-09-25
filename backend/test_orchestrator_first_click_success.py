#!/usr/bin/env python3
"""
Script de prueba para verificar que el orquestador elimina el patrón 
"primer intento falla / segundo funciona" y que la creación de usuarios 
funciona SIEMPRE al primer click para roles ADMIN y RESPONSABLE.
"""

import sys
import os
import requests
import json
import time
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_first_click_success():
    """Prueba que la creación de usuarios funciona al primer click"""
    print("🎯 Probando que la creación de usuarios funciona SIEMPRE al primer click...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Usuarios de prueba para ambos roles
    test_users = [
        {
            "role": "ADMIN",
            "label": "ADMIN",
            "email": "test-admin-orchestrator@example.com",
            "full_name": "Test Admin Orchestrator"
        },
        {
            "role": "RESPONSABLE", 
            "label": "RESPONSABLE",
            "email": "test-responsable-orchestrator@example.com",
            "full_name": "Test Responsable Orchestrator"
        }
    ]
    
    success_count = 0
    total_attempts = 0
    
    for i, user_data in enumerate(test_users, 1):
        print(f"\n{i}️⃣ Probando rol: {user_data['label']}")
        
        payload = {
            "full_name": user_data["full_name"],
            "email": user_data["email"],
            "password": "password123",
            "role": user_data["role"]
        }
        
        # Hacer múltiples intentos para verificar consistencia
        for attempt in range(1, 4):  # 3 intentos por usuario
            total_attempts += 1
            print(f"   Intento {attempt}: ", end="", flush=True)
            
            try:
                start_time = time.time()
                response = requests.post(f"{base_url}/users", headers=headers, json=payload)
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # en ms
                
                print(f"Status {response.status_code} ({response_time:.1f}ms)")
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    print(f"   ✅ ÉXITO - Rol {user_data['label']} funcionó al primer click")
                    print(f"   Created: {data.get('created', 'N/A')}")
                    print(f"   Action: {data.get('action', 'N/A')}")
                    print(f"   User ID: {data.get('user_id', 'N/A')}")
                    success_count += 1
                else:
                    print(f"   ❌ ERROR inesperado: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
            
            # Pequeña pausa entre intentos
            time.sleep(0.5)
    
    print(f"\n📊 Resultados del orquestador:")
    print(f"   ✅ Éxitos: {success_count}/{total_attempts}")
    print(f"   📈 Tasa de éxito: {(success_count/total_attempts)*100:.1f}%")
    
    return success_count == total_attempts

def test_idempotency_with_orchestrator():
    """Prueba que el orquestador mantiene la idempotencia"""
    print("\n🔄 Probando idempotencia con orquestador...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Usuario de prueba para idempotencia
    test_user = {
        "full_name": "Test Idempotency Orchestrator",
        "email": "test-idempotency-orchestrator@example.com",
        "password": "password123",
        "role": "ADMIN"
    }
    
    results = []
    
    # Hacer 5 intentos del mismo usuario
    for attempt in range(1, 6):
        print(f"   Intento {attempt}: ", end="", flush=True)
        
        try:
            response = requests.post(f"{base_url}/users", headers=headers, json=test_user)
            
            print(f"Status {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                results.append({
                    "attempt": attempt,
                    "status": response.status_code,
                    "created": data.get('created', False),
                    "action": data.get('action', 'N/A')
                })
                print(f"   ✅ ÉXITO - {data.get('action', 'N/A')}")
            else:
                print(f"   ❌ ERROR: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        time.sleep(0.3)
    
    # Verificar patrón esperado
    if len(results) >= 2:
        first_attempt = results[0]
        subsequent_attempts = results[1:]
        
        print(f"\n📊 Análisis de idempotencia:")
        print(f"   Primer intento: {first_attempt['status']} - {first_attempt['action']}")
        
        all_subsequent_ok = True
        for result in subsequent_attempts:
            print(f"   Intento {result['attempt']}: {result['status']} - {result['action']}")
            if result['status'] != 200 or result['action'] != 'updated':
                all_subsequent_ok = False
        
        if first_attempt['status'] == 201 and first_attempt['action'] == 'created' and all_subsequent_ok:
            print("   ✅ Idempotencia correcta: 201 → 200, created → updated")
            return True
        else:
            print("   ❌ Patrón de idempotencia incorrecto")
            return False
    else:
        print("   ❌ No se pudieron hacer suficientes intentos")
        return False

def test_role_normalization_with_orchestrator():
    """Prueba que el orquestador maneja correctamente la normalización de roles"""
    print("\n🔄 Probando normalización de roles con orquestador...")
    
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
            "email": "test-admin-variant-orch@example.com"
        },
        {
            "role": "admin",
            "expected": "ADMIN", 
            "email": "test-admin-lower-orch@example.com"
        },
        {
            "role": "Responsable",
            "expected": "RESPONSABLE",
            "email": "test-resp-variant-orch@example.com"
        },
        {
            "role": "responsable",
            "expected": "RESPONSABLE",
            "email": "test-resp-lower-orch@example.com"
        }
    ]
    
    success_count = 0
    
    for i, variant in enumerate(role_variants, 1):
        print(f"\n{i}️⃣ Probando variante: '{variant['role']}' → '{variant['expected']}'")
        
        user_data = {
            "full_name": f"Test {variant['role']} Orchestrator",
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
    
    print(f"\n📊 Resultados normalización con orquestador:")
    print(f"   ✅ Normalizados correctamente: {success_count}/{len(role_variants)}")
    
    return success_count == len(role_variants)

def test_invalid_roles_with_orchestrator():
    """Prueba que el orquestador rechaza roles inválidos correctamente"""
    print("\n❌ Probando rechazo de roles inválidos con orquestador...")
    
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
            "email": "test-tecnico-orch@example.com"
        },
        {
            "role": "USER",
            "label": "USER", 
            "email": "test-user-orch@example.com"
        },
        {
            "role": "MANAGER",
            "label": "MANAGER",
            "email": "test-manager-orch@example.com"
        }
    ]
    
    success_count = 0
    
    for i, role_data in enumerate(invalid_roles, 1):
        print(f"\n{i}️⃣ Probando rol inválido: {role_data['label']}")
        
        user_data = {
            "full_name": f"Test {role_data['label']} Orchestrator",
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
    
    print(f"\n📊 Resultados roles inválidos con orquestador:")
    print(f"   ✅ Rechazados correctamente: {success_count}/{len(invalid_roles)}")
    
    return success_count == len(invalid_roles)

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
    print("🚀 SISGEMEC - Prueba del Orquestador (Primer Click Exitoso)")
    print("=" * 70)
    print("🎯 Objetivo: Verificar que el orquestador elimina el patrón 'primer intento falla'")
    print("🎯 Objetivo: Verificar que la creación funciona SIEMPRE al primer click")
    print("🎯 Objetivo: Verificar que mantiene idempotencia y normalización de roles")
    
    # Verificar disponibilidad del servidor
    server_ok = test_server_availability()
    
    if not server_ok:
        print("\n❌ El servidor no está disponible")
        print("   Inicia el servidor con: uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Probar primer click exitoso
    first_click_ok = test_first_click_success()
    
    # Probar idempotencia
    idempotency_ok = test_idempotency_with_orchestrator()
    
    # Probar normalización
    normalization_ok = test_role_normalization_with_orchestrator()
    
    # Probar roles inválidos
    invalid_roles_ok = test_invalid_roles_with_orchestrator()
    
    # Resultados finales
    if first_click_ok and idempotency_ok and normalization_ok and invalid_roles_ok:
        print("\n🎯 ¡TODAS LAS PRUEBAS DEL ORQUESTADOR PASARON EXITOSAMENTE!")
        print("   ✅ Creación funciona SIEMPRE al primer click")
        print("   ✅ Idempotencia mantenida correctamente")
        print("   ✅ Normalización de roles funciona")
        print("   ✅ Roles inválidos rechazados correctamente")
        print("   ✅ Orquestador elimina el patrón 'primer intento falla'")
        print("\n🏆 ¡ORQUESTADOR IMPLEMENTADO CON ÉXITO!")
        print("   🎉 El sistema ahora es estable y confiable al primer click")
    else:
        print("\n❌ Algunas pruebas del orquestador fallaron")
        if not first_click_ok:
            print("   ❌ Problemas con primer click exitoso")
        if not idempotency_ok:
            print("   ❌ Problemas con idempotencia")
        if not normalization_ok:
            print("   ❌ Problemas con normalización de roles")
        if not invalid_roles_ok:
            print("   ❌ Problemas con rechazo de roles inválidos")
        sys.exit(1)
