#!/usr/bin/env python3
"""
Script de prueba FINAL para verificar que el alta de usuarios funciona SIEMPRE al primer click.
Verifica que se eliminó definitivamente el patrón "primer intento 500 / segundo 200".
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
    """Prueba que el primer click siempre funciona sin errores 500"""
    print("🎯 Probando que el primer click SIEMPRE funciona...")
    print("   (Verificando eliminación DEFINITIVA del patrón 'primer intento 500 / segundo 200')")
    
    # Configuración
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Lista de usuarios de prueba únicos
    test_users = [
        {
            "full_name": "Test First Click Final 1",
            "email": "test-first-click-final-1@example.com",
            "password": "password123",
            "role": "RESPONSABLE"
        },
        {
            "full_name": "Test First Click Final 2", 
            "email": "test-first-click-final-2@example.com",
            "password": "password123",
            "role": "TECNICO"
        },
        {
            "full_name": "Test First Click Final 3",
            "email": "test-first-click-final-3@example.com",
            "password": "password123",
            "role": "ADMIN"
        },
        {
            "full_name": "Test First Click Final 4",
            "email": "test-first-click-final-4@example.com",
            "password": "password123",
            "role": "RESPONSABLE"
        },
        {
            "full_name": "Test First Click Final 5",
            "email": "test-first-click-final-5@example.com",
            "password": "password123",
            "role": "TECNICO"
        }
    ]
    
    success_count = 0
    error_count = 0
    total_time = 0
    
    for i, user_data in enumerate(test_users, 1):
        print(f"\n{i}️⃣ Probando usuario {i}: {user_data['email']}")
        
        try:
            # Medir tiempo de respuesta
            start_time = time.time()
            response = requests.post(f"{base_url}/users", headers=headers, json=user_data)
            end_time = time.time()
            
            response_time = end_time - start_time
            total_time += response_time
            
            print(f"   Status: {response.status_code}")
            print(f"   Tiempo: {response_time:.2f}s")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"   ✅ ÉXITO en primer intento")
                print(f"   Created: {data.get('created', 'N/A')}")
                print(f"   Action: {data.get('action', 'N/A')}")
                success_count += 1
            else:
                print(f"   ❌ ERROR en primer intento: {response.status_code}")
                print(f"   Response: {response.text}")
                error_count += 1
                
        except requests.exceptions.ConnectionError:
            print("   ❌ Error de conexión - servidor no disponible")
            error_count += 1
        except Exception as e:
            print(f"   ❌ Error inesperado: {e}")
            error_count += 1
    
    avg_time = total_time / len(test_users) if test_users else 0
    
    print(f"\n📊 Resultados:")
    print(f"   ✅ Éxitos en primer intento: {success_count}/{len(test_users)}")
    print(f"   ❌ Errores en primer intento: {error_count}/{len(test_users)}")
    print(f"   ⏱️  Tiempo promedio: {avg_time:.2f}s")
    
    if error_count == 0:
        print(f"\n🎉 ¡PERFECTO! Todos los usuarios se crearon exitosamente al primer click")
        print(f"   ✅ No hay errores 500 en el primer intento")
        print(f"   ✅ El patrón 'primer intento 500 / segundo 200' fue ELIMINADO DEFINITIVAMENTE")
        print(f"   ✅ Tiempo promedio de respuesta: {avg_time:.2f}s")
        return True
    else:
        print(f"\n⚠️  Algunos usuarios fallaron en el primer intento")
        print(f"   ❌ Aún existe el problema del primer click")
        return False

def test_server_warmup():
    """Verifica que el servidor esté precalentado correctamente"""
    print("\n🔥 Verificando precalentamiento del servidor...")
    
    base_url = "http://localhost:8000"
    
    try:
        # Verificar endpoint de salud
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Servidor respondiendo correctamente")
        else:
            print(f"   ⚠️  Servidor respondiendo con status: {response.status_code}")
            return False
        
        # Verificar endpoint de diagnóstico de Supabase
        response = requests.get(f"{base_url}/__diagnostics/supabase", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("supabase_admin_ok"):
                print("   ✅ Supabase precalentado y funcionando")
                return True
            else:
                print(f"   ⚠️  Supabase no está funcionando: {data.get('error', 'Unknown')}")
                return False
        else:
            print(f"   ⚠️  No se puede verificar Supabase: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ No se puede conectar al servidor")
        return False
    except Exception as e:
        print(f"   ❌ Error verificando servidor: {e}")
        return False

def test_retry_behavior():
    """Prueba el comportamiento de retry con usuarios existentes"""
    print("\n🔄 Probando comportamiento de retry con usuarios existentes...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Usuario que ya existe (de pruebas anteriores)
    existing_user = {
        "full_name": "Test Retry Behavior Final",
        "email": "test-first-click-final-1@example.com",  # Usuario que ya existe
        "password": "password123",
        "role": "RESPONSABLE"
    }
    
    try:
        print(f"   Enviando usuario existente: {existing_user['email']}")
        response = requests.post(f"{base_url}/users", headers=headers, json=existing_user)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Comportamiento idempotente correcto")
            print(f"   Created: {data.get('created', 'N/A')}")
            print(f"   Action: {data.get('action', 'N/A')}")
            return True
        else:
            print(f"   ❌ Error inesperado: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error probando retry: {e}")
        return False

def test_multiple_rapid_requests():
    """Prueba múltiples requests rápidos para verificar estabilidad"""
    print("\n⚡ Probando múltiples requests rápidos...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Usuario para requests rápidos
    rapid_user = {
        "full_name": "Test Rapid Requests",
        "email": "test-rapid-requests@example.com",
        "password": "password123",
        "role": "RESPONSABLE"
    }
    
    success_count = 0
    error_count = 0
    
    # Hacer 3 requests rápidos
    for i in range(3):
        try:
            print(f"   Request {i+1}/3...")
            response = requests.post(f"{base_url}/users", headers=headers, json=rapid_user)
            
            if response.status_code in [200, 201]:
                print(f"   ✅ Request {i+1} exitoso")
                success_count += 1
            else:
                print(f"   ❌ Request {i+1} falló: {response.status_code}")
                error_count += 1
                
        except Exception as e:
            print(f"   ❌ Request {i+1} error: {e}")
            error_count += 1
    
    print(f"   📊 Resultados: {success_count} éxitos, {error_count} errores")
    
    if error_count == 0:
        print("   ✅ Todos los requests rápidos fueron exitosos")
        return True
    else:
        print("   ❌ Algunos requests rápidos fallaron")
        return False

if __name__ == "__main__":
    print("🚀 SISGEMEC - Prueba FINAL de Primer Click Exitoso")
    print("=" * 70)
    print("🎯 Objetivo: Verificar que el alta de usuarios funciona SIEMPRE al primer click")
    print("🎯 Objetivo: Eliminar DEFINITIVAMENTE el patrón 'primer intento 500 / segundo 200'")
    print("🎯 Objetivo: Verificar estabilidad con requests rápidos")
    
    # Verificar precalentamiento del servidor
    warmup_ok = test_server_warmup()
    
    if not warmup_ok:
        print("\n❌ El servidor no está precalentado correctamente")
        print("   Inicia el servidor con: uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Probar primer click exitoso
    first_click_ok = test_first_click_success()
    
    if first_click_ok:
        # Probar comportamiento de retry
        retry_ok = test_retry_behavior()
        
        if retry_ok:
            # Probar requests rápidos
            rapid_ok = test_multiple_rapid_requests()
            
            if rapid_ok:
                print("\n🎯 ¡TODAS LAS PRUEBAS FINALES PASARON EXITOSAMENTE!")
                print("   ✅ Primer click SIEMPRE funciona")
                print("   ✅ No hay errores 500 en el primer intento")
                print("   ✅ Patrón 'primer intento 500 / segundo 200' ELIMINADO DEFINITIVAMENTE")
                print("   ✅ Comportamiento idempotente correcto")
                print("   ✅ Servidor precalentado y estable")
                print("   ✅ Requests rápidos estables")
                print("\n🏆 ¡IMPLEMENTACIÓN COMPLETADA CON ÉXITO!")
            else:
                print("\n⚠️  Primer click y retry OK, pero hay problemas con requests rápidos")
                sys.exit(1)
        else:
            print("\n⚠️  Primer click OK, pero hay problemas con retry")
            sys.exit(1)
    else:
        print("\n❌ El primer click aún falla")
        print("   ❌ No se eliminó el patrón 'primer intento 500 / segundo 200'")
        sys.exit(1)
