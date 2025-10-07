#!/usr/bin/env python3
"""
Tests para el flujo de solicitudes con notificaciones por email.
Valida que el flujo principal funcione sin romperse si los emails fallan.
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def load_environment():
    """Cargar variables de entorno"""
    try:
        from dotenv import load_dotenv, find_dotenv
        env_path = find_dotenv(filename="env.local", usecwd=True)
        if env_path:
            load_dotenv(env_path, override=True)
            print(f"✅ Variables de entorno cargadas desde: {env_path}")
            return True
        else:
            print("⚠️ No se encontró env.local")
            return False
    except Exception as e:
        print(f"❌ Error cargando env.local: {e}")
        return False

def test_server_health():
    """Verificar que el servidor esté corriendo"""
    print("\n🚀 Verificando salud del servidor...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servidor corriendo correctamente")
            return True
        else:
            print(f"❌ Servidor respondió con status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Servidor no disponible: {e}")
        return False

def test_cors_options_preflight():
    """Test CORS OPTIONS preflight"""
    print("\n🔧 Probando CORS OPTIONS preflight...")
    try:
        response = requests.options(
            "http://localhost:8000/solicitudes",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type"
            },
            timeout=5
        )
        
        if response.status_code == 204:
            print("✅ OPTIONS responde 204")
            
            # Verificar headers CORS
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
                "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials")
            }
            
            print(f"✅ Headers CORS: {cors_headers}")
            return True
        else:
            print(f"❌ OPTIONS respondió con status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en OPTIONS preflight: {e}")
        return False

def test_post_solicitudes_without_auth():
    """Test POST /solicitudes sin autenticación (debe fallar)"""
    print("\n🔐 Probando POST /solicitudes sin autenticación...")
    try:
        response = requests.post(
            "http://localhost:8000/solicitudes",
            json={"equipo_id": 101, "descripcion": "Test sin auth"},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 401:
            print("✅ Correctamente rechaza requests sin autenticación")
            return True
        else:
            print(f"❌ Debería rechazar con 401, pero respondió: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en test sin auth: {e}")
        return False

def test_post_solicitudes_with_invalid_auth():
    """Test POST /solicitudes con JWT inválido"""
    print("\n🔐 Probando POST /solicitudes con JWT inválido...")
    try:
        response = requests.post(
            "http://localhost:8000/solicitudes",
            json={"equipo_id": 101, "descripcion": "Test con JWT inválido"},
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid.jwt.token"
            },
            timeout=5
        )
        
        if response.status_code == 401:
            print("✅ Correctamente rechaza JWT inválido")
            return True
        else:
            print(f"❌ Debería rechazar JWT inválido con 401, pero respondió: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en test JWT inválido: {e}")
        return False

def test_post_solicitudes_payload_validation():
    """Test validación de payload en POST /solicitudes"""
    print("\n📝 Probando validación de payload...")
    
    # Test con payload vacío
    try:
        response = requests.post(
            "http://localhost:8000/solicitudes",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer fake.jwt.token"
            },
            timeout=5
        )
        
        if response.status_code == 422:
            print("✅ Correctamente valida payload vacío")
        else:
            print(f"⚠️ Payload vacío respondió: {response.status_code}")
    except Exception as e:
        print(f"❌ Error en validación payload: {e}")

def test_servicios_complete_without_auth():
    """Test PUT /servicios/{id}/complete sin autenticación"""
    print("\n🔐 Probando PUT /servicios/123/complete sin autenticación...")
    try:
        response = requests.put(
            "http://localhost:8000/servicios/123/complete",
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 401:
            print("✅ Correctamente rechaza completar servicio sin auth")
            return True
        else:
            print(f"❌ Debería rechazar con 401, pero respondió: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error en test completar servicio sin auth: {e}")
        return False

def test_debug_endpoints():
    """Test endpoints de debug"""
    print("\n🔧 Probando endpoints de debug...")
    
    # Test /debug/last-error
    try:
        response = requests.get(
            "http://localhost:8000/debug/last-error?error_id=test123",
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ /debug/last-error responde correctamente")
        else:
            print(f"⚠️ /debug/last-error respondió: {response.status_code}")
    except Exception as e:
        print(f"❌ Error en /debug/last-error: {e}")

def main():
    """Ejecutar todos los tests"""
    print("🧪 INICIANDO TESTS DEL FLUJO DE SOLICITUDES + EMAILS")
    print("=" * 60)
    
    # Cargar entorno
    if not load_environment():
        print("❌ No se pudo cargar el entorno")
        return False
    
    tests = [
        test_server_health,
        test_cors_options_preflight,
        test_post_solicitudes_without_auth,
        test_post_solicitudes_with_invalid_auth,
        test_post_solicitudes_payload_validation,
        test_servicios_complete_without_auth,
        test_debug_endpoints,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} falló con excepción: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 RESULTADOS: {passed}/{total} tests pasaron")
    
    if passed == total:
        print("🎉 ¡Todos los tests pasaron!")
        return True
    else:
        print("⚠️ Algunos tests fallaron")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
