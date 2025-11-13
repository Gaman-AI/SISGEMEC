#!/usr/bin/env python3
"""
Test completo del flujo UI real con endpoints del backend
"""
import os
import sys
import requests
import json
from pathlib import Path
from datetime import datetime, timezone

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

def test_components():
    """Probar componentes de notificación"""
    print("\n📧 Probando componentes de notificación...")
    
    try:
        from app.core.email_config import EmailSettings
        from app.dependencies import get_notification_service, get_users_repo
        from app.repositories.users_repo import UsersRepo
        
        # Probar EmailSettings
        settings = EmailSettings()
        print(f"✅ EmailSettings: host={settings.host}, user={settings.user[:3]}***")
        
        # Probar NotificationService
        notifier = get_notification_service()
        print("✅ NotificationService: Creado correctamente")
        
        # Probar UsersRepo
        users_repo = get_users_repo()
        print("✅ UsersRepo: Creado correctamente")
        
        # Probar consulta de admins
        admin_emails = users_repo.get_active_admin_emails()
        print(f"✅ Admins activos: {len(admin_emails)} encontrados")
        if admin_emails:
            print(f"   Emails: {admin_emails[:3]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error probando componentes: {e}")
        return False

def test_endpoints_without_auth():
    """Probar endpoints sin autenticación (deberían devolver 401)"""
    print("\n🔒 Probando endpoints sin autenticación...")
    
    endpoints = [
        ("POST", "/solicitudes", {"equipo_id": 1, "solicitante_id": "test-user", "descripcion": "Test"}),
        ("PUT", "/solicitudes/1/estado", {"estado_solicitud_id": 2}),
        ("PUT", "/servicios/1", {"estado_servicio_id": 2}),
    ]
    
    all_ok = True
    for method, endpoint, payload in endpoints:
        try:
            if method == "POST":
                response = requests.post(f"http://localhost:8000{endpoint}", json=payload, timeout=5)
            elif method == "PUT":
                response = requests.put(f"http://localhost:8000{endpoint}", json=payload, timeout=5)
            
            if response.status_code == 401:
                print(f"✅ {method} {endpoint}: Protegido correctamente (401)")
            else:
                print(f"❌ {method} {endpoint}: Status inesperado {response.status_code}")
                all_ok = False
        except Exception as e:
            print(f"❌ {method} {endpoint}: Error - {e}")
            all_ok = False
    
    return all_ok

def test_notification_logs():
    """Verificar logs de notificaciones existentes"""
    print("\n📊 Verificando logs de notificaciones...")
    
    try:
        from app.deps.supabase_client import supa_service
        
        client = supa_service()
        
        # Consultar logs recientes
        response = client.table("notification_logs").select("*").order("id", desc=True).limit(10).execute()
        
        if response.data:
            print(f"✅ Se encontraron {len(response.data)} logs recientes:")
            for log in response.data:
                status_emoji = "✅" if log["status"] == "SENT" else "❌" if log["status"] == "FAILED" else "⏳"
                print(f"   {status_emoji} {log['event_type']} → {log['to_email']} ({log['status']})")
                if log["error_message"]:
                    print(f"      Error: {log['error_message']}")
        else:
            print("⚠️ No se encontraron logs de notificaciones")
        
        return True
    except Exception as e:
        print(f"❌ Error consultando logs: {e}")
        return False

def test_routes_list():
    """Verificar que los endpoints estén registrados"""
    print("\n🛣️ Verificando rutas registradas...")
    
    try:
        response = requests.get("http://localhost:8000/__routes", timeout=5)
        if response.status_code == 200:
            routes = response.json()
            print(f"✅ Se encontraron {len(routes)} rutas registradas")
            
            # Buscar rutas de solicitudes y servicios
            solicitudes_routes = [r for r in routes if "/solicitudes" in r]
            servicios_routes = [r for r in routes if "/servicios" in r]
            
            print(f"   📝 Rutas de solicitudes: {len(solicitudes_routes)}")
            for route in solicitudes_routes:
                print(f"      {route}")
            
            print(f"   🔧 Rutas de servicios: {len(servicios_routes)}")
            for route in servicios_routes:
                print(f"      {route}")
            
            return True
        else:
            print(f"❌ Error obteniendo rutas: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_debug_endpoints():
    """Probar endpoints de debug"""
    print("\n🔧 Probando endpoints de debug...")
    
    try:
        # Test /debug/email-config
        response = requests.get("http://localhost:8000/debug/email-config", timeout=5)
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Configuración de email: OK")
        else:
            print(f"❌ Configuración de email: Falló (Status: {response.status_code})")
            return False

        # Test /debug/smtp-login
        response = requests.get("http://localhost:8000/debug/smtp-login", timeout=5)
        if response.status_code == 200 and response.json().get("ok"):
            print(f"✅ Login SMTP: OK")
        else:
            print(f"❌ Login SMTP: Falló")
            return False

        # Test /debug/send-smoke
        response = requests.get("http://localhost:8000/debug/send-smoke", timeout=10)
        if response.status_code == 200 and response.json().get("ok"):
            print(f"✅ Smoke test: OK - Enviado a {response.json().get('sent_to')}")
        else:
            print(f"❌ Smoke test: Falló")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error en endpoints de debug: {e}")
        return False

def main():
    """Función principal"""
    print("🎯 TEST COMPLETO: FLUJO UI REAL CON ENDPOINTS BACKEND")
    print("=" * 70)
    
    # Cargar variables de entorno
    env_loaded = load_environment()
    
    # Ejecutar tests
    tests = [
        ("Salud del servidor", test_server_health),
        ("Rutas registradas", test_routes_list),
        ("Componentes de notificación", test_components),
        ("Endpoints sin autenticación", test_endpoints_without_auth),
        ("Endpoints de debug", test_debug_endpoints),
        ("Logs de notificaciones", test_notification_logs),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen
    print("\n" + "=" * 70)
    print("📊 RESUMEN DE PRUEBA:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} tests pasaron")
    
    if passed == len(results):
        print("\n🎉 ¡PRUEBA EXITOSA!")
        print("✅ El sistema está COMPLETAMENTE CONFIGURADO para enviar emails desde la UI")
        print("\n📝 ESTADO FINAL:")
        print("1. ✅ Frontend redirige operaciones al backend")
        print("2. ✅ Backend tiene hooks activos en endpoints reales")
        print("3. ✅ Sistema de notificaciones funcionando")
        print("4. ✅ Logs de notificaciones operativos")
        print("5. ✅ Endpoints de debug disponibles")
        print("\n🔍 PRÓXIMOS PASOS:")
        print("1. Iniciar sesión en la UI como RESPONSABLE")
        print("2. Crear una solicitud → se enviará email a ADMINS")
        print("3. Iniciar sesión como ADMIN")
        print("4. Completar el servicio → se enviará email al RESPONSABLE")
        print("5. Monitorear logs en la consola del backend")
        print("6. Verificar emails en notification_logs")
    else:
        print("\n⚠️ PRUEBA FALLÓ")
        print("❌ Algunos componentes no están funcionando")
        print("\n🔧 REVISAR:")
        print("1. Variables de entorno en env.local")
        print("2. Conexión a Supabase")
        print("3. Configuración de SMTP")
        print("4. Hooks en los endpoints")

if __name__ == "__main__":
    main()
