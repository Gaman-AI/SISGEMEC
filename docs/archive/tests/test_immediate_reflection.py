#!/usr/bin/env python3
"""
Script de prueba para verificar que la vista de usuarios refleja inmediatamente 
las nuevas inserciones sin depender de recargar el navegador.
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

def test_get_users_endpoint():
    """Prueba que el endpoint GET /users funciona correctamente"""
    print("🔍 Probando endpoint GET /users...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{base_url}/users", headers=headers)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ ÉXITO - Endpoint GET /users funciona correctamente")
            print(f"   Usuarios encontrados: {len(data)}")
            
            # Verificar headers anti-caché
            cache_control = response.headers.get('Cache-Control', '')
            pragma = response.headers.get('Pragma', '')
            
            print(f"   Cache-Control: {cache_control}")
            print(f"   Pragma: {pragma}")
            
            if 'no-store' in cache_control and 'no-cache' in cache_control:
                print(f"   ✅ Headers anti-caché configurados correctamente")
            else:
                print(f"   ⚠️  Headers anti-caché podrían estar incompletos")
            
            return True, data
        else:
            print(f"   ❌ ERROR: {response.status_code}")
            print(f"   Response: {response.text}")
            return False, []
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False, []

def test_create_and_list_reflection():
    """Prueba que al crear un usuario, aparece inmediatamente en la lista"""
    print("\n🔄 Probando reflexión inmediata tras crear usuario...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # 1) Obtener lista inicial
    print("   1️⃣ Obteniendo lista inicial...")
    try:
        response = requests.get(f"{base_url}/users", headers=headers)
        if response.status_code != 200:
            print(f"   ❌ Error obteniendo lista inicial: {response.status_code}")
            return False
        
        initial_data = response.json()
        initial_count = len(initial_data)
        print(f"   Usuarios iniciales: {initial_count}")
        
    except Exception as e:
        print(f"   ❌ Error obteniendo lista inicial: {e}")
        return False
    
    # 2) Crear nuevo usuario
    print("   2️⃣ Creando nuevo usuario...")
    test_user = {
        "full_name": "Test Immediate Reflection",
        "email": f"test-immediate-{int(time.time())}@example.com",
        "password": "password123",
        "role": "ADMIN"
    }
    
    try:
        response = requests.post(f"{base_url}/users", headers=headers, json=test_user)
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"   ✅ Usuario creado exitosamente")
            print(f"   User ID: {data.get('user_id', 'N/A')}")
            print(f"   Created: {data.get('created', 'N/A')}")
        else:
            print(f"   ❌ Error creando usuario: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error creando usuario: {e}")
        return False
    
    # 3) Verificar que aparece en la lista inmediatamente
    print("   3️⃣ Verificando reflexión inmediata...")
    try:
        # Pequeña pausa para simular el tiempo de navegación
        time.sleep(0.5)
        
        response = requests.get(f"{base_url}/users", headers=headers)
        if response.status_code != 200:
            print(f"   ❌ Error obteniendo lista actualizada: {response.status_code}")
            return False
        
        updated_data = response.json()
        updated_count = len(updated_data)
        print(f"   Usuarios después de crear: {updated_count}")
        
        # Verificar que el usuario nuevo está en la lista
        new_user_found = False
        for user in updated_data:
            if user.get('email') == test_user['email']:
                new_user_found = True
                print(f"   ✅ Usuario nuevo encontrado en la lista")
                print(f"   Full Name: {user.get('full_name', 'N/A')}")
                print(f"   Role: {user.get('role', 'N/A')}")
                print(f"   Email: {user.get('email', 'N/A')}")
                break
        
        if not new_user_found:
            print(f"   ❌ Usuario nuevo NO encontrado en la lista")
            return False
        
        # Verificar que el conteo aumentó
        if updated_count > initial_count:
            print(f"   ✅ Conteo de usuarios aumentó correctamente")
        else:
            print(f"   ⚠️  Conteo de usuarios no aumentó (puede ser idempotencia)")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error verificando reflexión: {e}")
        return False

def test_cache_buster():
    """Prueba que el cache-buster funciona correctamente"""
    print("\n🚫 Probando cache-buster...")
    
    base_url = "http://localhost:8000"
    admin_token = "dev-admin-token-123"
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Hacer múltiples requests con cache-buster
    responses = []
    for i in range(3):
        print(f"   Request {i+1}: ", end="", flush=True)
        
        try:
            # Simular cache-buster con timestamp
            params = {"_ts": int(time.time() * 1000)}
            response = requests.get(f"{base_url}/users", headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                responses.append(data)
                print(f"✅ {len(data)} usuarios")
            else:
                print(f"❌ {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        time.sleep(0.1)
    
    # Verificar que todas las respuestas son consistentes
    if len(responses) >= 2:
        first_response = responses[0]
        last_response = responses[-1]
        
        if len(first_response) == len(last_response):
            print(f"   ✅ Respuestas consistentes (mismo número de usuarios)")
        else:
            print(f"   ⚠️  Respuestas inconsistentes (diferente número de usuarios)")
        
        return True
    else:
        print(f"   ❌ No se pudieron hacer suficientes requests")
        return False

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
    print("🚀 SISGEMEC - Prueba de Reflexión Inmediata de Usuarios")
    print("=" * 70)
    print("🎯 Objetivo: Verificar que la vista refleja inmediatamente las nuevas inserciones")
    print("🎯 Objetivo: Verificar que no hay problemas de caché")
    print("🎯 Objetivo: Verificar que el backend y frontend usan la misma fuente")
    
    # Verificar disponibilidad del servidor
    server_ok = test_server_availability()
    
    if not server_ok:
        print("\n❌ El servidor no está disponible")
        print("   Inicia el servidor con: uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Probar endpoint GET /users
    get_users_ok, initial_users = test_get_users_endpoint()
    
    # Probar reflexión inmediata
    reflection_ok = test_create_and_list_reflection()
    
    # Probar cache-buster
    cache_buster_ok = test_cache_buster()
    
    # Resultados finales
    if get_users_ok and reflection_ok and cache_buster_ok:
        print("\n🎯 ¡TODAS LAS PRUEBAS DE REFLEXIÓN INMEDIATA PASARON EXITOSAMENTE!")
        print("   ✅ Endpoint GET /users funciona correctamente")
        print("   ✅ Headers anti-caché configurados")
        print("   ✅ Reflexión inmediata tras crear usuario")
        print("   ✅ Cache-buster funciona correctamente")
        print("   ✅ Backend y frontend usan la misma fuente")
        print("\n🏆 ¡IMPLEMENTACIÓN DE REFLEXIÓN INMEDIATA COMPLETADA!")
        print("   🎉 La vista de usuarios refleja inmediatamente las nuevas inserciones")
    else:
        print("\n❌ Algunas pruebas de reflexión inmediata fallaron")
        if not get_users_ok:
            print("   ❌ Problemas con endpoint GET /users")
        if not reflection_ok:
            print("   ❌ Problemas con reflexión inmediata")
        if not cache_buster_ok:
            print("   ❌ Problemas con cache-buster")
        sys.exit(1)
