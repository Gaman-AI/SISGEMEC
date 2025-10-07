#!/usr/bin/env python3
"""
Script para verificar que las rutas /debug/* funcionen correctamente.
Ejecutar: python test_debug_routes.py
"""
import requests
import json
import time

def test_routes_endpoint():
    """Verifica el endpoint /__routes"""
    print("🔍 Probando /__routes...")
    try:
        response = requests.get("http://localhost:8000/__routes", timeout=10)
        if response.status_code == 200:
            routes = response.json()
            debug_routes = [r for r in routes if "/debug/" in r]
            print(f"✅ /__routes OK - {len(routes)} rutas totales")
            print(f"✅ Rutas /debug encontradas: {len(debug_routes)}")
            for route in debug_routes:
                print(f"   📍 {route}")
            return True, debug_routes
        else:
            print(f"❌ /__routes HTTP {response.status_code}")
            return False, []
    except Exception as e:
        print(f"❌ /__routes Error: {e}")
        return False, []

def test_debug_endpoints():
    """Verifica los endpoints /debug/*"""
    print("\n🔧 Probando endpoints /debug/*...")
    
    endpoints = [
        ("/debug/email-config", "Configuración de email"),
        ("/debug/smtp-login", "Login SMTP"),
        ("/debug/send-smoke", "Smoke test")
    ]
    
    results = []
    
    for endpoint, description in endpoints:
        print(f"\n📋 {description} ({endpoint}):")
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=15)
            if response.status_code == 200:
                data = response.json()
                if endpoint == "/debug/email-config":
                    print(f"   ✅ Host: {data.get('host')}:{data.get('port')}")
                    print(f"   ✅ User: {data.get('user')}")
                    print(f"   ✅ Has Password: {data.get('has_password')}")
                    print(f"   ✅ Debug: {data.get('email_debug')}")
                elif endpoint == "/debug/smtp-login":
                    if data.get("ok"):
                        print(f"   ✅ SMTP OK - Modo: {data.get('mode')}")
                    else:
                        print(f"   ❌ SMTP Error: {data.get('error')}")
                elif endpoint == "/debug/send-smoke":
                    if data.get("ok"):
                        print(f"   ✅ Smoke test OK - Enviado a: {data.get('sent_to')}")
                    else:
                        print(f"   ❌ Smoke test Error: {data.get('error')}")
                results.append((endpoint, True, data))
            else:
                print(f"   ❌ HTTP {response.status_code}")
                results.append((endpoint, False, None))
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results.append((endpoint, False, None))
    
    return results

def test_server_running():
    """Verifica que el servidor esté corriendo"""
    print("🚀 Verificando que el servidor esté corriendo...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servidor corriendo en http://localhost:8000")
            return True
        else:
            print(f"❌ Servidor respondió con status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Servidor no disponible: {e}")
        print("💡 Asegúrate de ejecutar: uvicorn app.main:app --reload")
        return False

def main():
    """Función principal de verificación"""
    print("🧪 VERIFICACIÓN DE RUTAS /debug/*")
    print("=" * 50)
    
    # Verificar que el servidor esté corriendo
    if not test_server_running():
        return
    
    # Verificar /__routes
    routes_ok, debug_routes = test_routes_endpoint()
    
    if not routes_ok:
        print("❌ No se pudo verificar /__routes")
        return
    
    # Verificar endpoints /debug/*
    results = test_debug_endpoints()
    
    # Resumen
    print("\n" + "=" * 50)
    print("📊 RESUMEN:")
    
    passed = 0
    total = len(results)
    
    for endpoint, success, data in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} {endpoint}")
        if success:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{total} endpoints funcionan")
    
    if passed == total:
        print("🎉 ¡Todas las rutas /debug/* funcionan correctamente!")
        print("\n📝 Próximos pasos:")
        print("   1. Verificar que llegue el correo del smoke test")
        print("   2. Probar crear/completar servicios para ver notificaciones")
        print("   3. Revisar logs en consola: [EMAIL] ENVIADO...")
    else:
        print("⚠️ Algunas rutas /debug/* no funcionan.")
        print("\n🔧 Checklist:")
        print("   - ¿Está configurado EMAIL_DEBUG=1 en env.local?")
        print("   - ¿Está configurado SMTP_PASS correctamente?")
        print("   - ¿Existe la tabla notification_logs?")
        print("   - ¿Está configurado ADMIN_EMAIL en env.local?")

if __name__ == "__main__":
    main()
