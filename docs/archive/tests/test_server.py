#!/usr/bin/env python3
"""
Script simple para probar el servidor SISGEMEC
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Prueba el endpoint de health"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error en health check: {e}")
        return False

def test_root():
    """Prueba el endpoint raíz"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Root check: {response.status_code}")
        return response.status_code in [200, 404, 405]  # Cualquier respuesta válida
    except Exception as e:
        print(f"Error en root check: {e}")
        return False

def test_debug_endpoints():
    """Prueba los endpoints de debug"""
    print("\n--- Probando endpoints de debug ---")
    
    # Probar conexión a Supabase
    try:
        response = requests.get(f"{BASE_URL}/auth/debug/connection")
        print(f"Debug connection: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Conexión: {response.json()}")
        else:
            print(f"❌ Error: {response.json()}")
    except Exception as e:
        print(f"Error en debug connection: {e}")
    
    # Probar debug de profiles
    try:
        response = requests.get(f"{BASE_URL}/auth/debug/profiles")
        print(f"Debug profiles: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Profiles: {data.get('message', 'OK')}")
            if 'columns' in data:
                print(f"   Columnas: {data['columns']}")
        else:
            print(f"❌ Error: {response.json()}")
    except Exception as e:
        print(f"Error en debug profiles: {e}")
    
    # Probar debug de table-info
    try:
        response = requests.get(f"{BASE_URL}/auth/debug/table-info")
        print(f"Debug table-info: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Table Info: {data.get('message', 'OK')}")
            if 'row_count' in data:
                print(f"   Filas: {data['row_count']}")
        else:
            print(f"❌ Error: {response.json()}")
    except Exception as e:
        print(f"Error en debug table-info: {e}")

def test_auth_endpoints():
    """Prueba los endpoints de autenticación"""
    print("\n--- Probando endpoints de autenticación ---")
    
    # Probar login con credenciales inválidas
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        print(f"Login con credenciales inválidas: {response.status_code}")
        if response.status_code != 200:
            print(f"Error esperado: {response.json()}")
    except Exception as e:
        print(f"Error en login test: {e}")

def main():
    """Función principal"""
    print("=== SISGEMEC Backend Test ===")
    
    # Probar health check o root
    if not test_health() and not test_root():
        print("❌ El servidor no está respondiendo")
        return
    
    print("✅ Servidor respondiendo correctamente")
    
    # Probar endpoints de debug
    test_debug_endpoints()
    
    # Probar endpoints de autenticación
    test_auth_endpoints()
    
    print("\n=== Test completado ===")

if __name__ == "__main__":
    main()
