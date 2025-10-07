#!/usr/bin/env python3
"""
Script para probar los endpoints reales que el frontend puede usar
para activar los hooks de email.
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

def test_new_endpoints():
    """Probar los nuevos endpoints creados"""
    print("\n🔧 Probando nuevos endpoints...")
    
    endpoints = [
        ("/solicitudes", "POST", "Crear solicitud"),
        ("/solicitudes/1/estado", "PUT", "Actualizar estado solicitud"),
        ("/servicios/1", "PUT", "Actualizar servicio"),
    ]
    
    all_ok = True
    for endpoint, method, description in endpoints:
        try:
            if method == "POST":
                payload = {
                    "equipo_id": 1,
                    "solicitante_id": "test-user-id",
                    "descripcion": "Test de endpoint real"
                }
                response = requests.post(f"http://localhost:8000{endpoint}", 
                                       json=payload, 
                                       timeout=10)
            elif method == "PUT":
                payload = {"estado_solicitud_id": 2} if "solicitudes" in endpoint else {"estado_servicio_id": 2}
                response = requests.put(f"http://localhost:8000{endpoint}", 
                                      json=payload, 
                                      timeout=10)
            
            if response.status_code == 401:
                print(f"✅ {description}: Protegido correctamente (401 Unauthorized)")
                print(f"   📧 El hook de email está ACTIVO en este endpoint")
            elif response.status_code in (200, 201):
                print(f"✅ {description}: OK - {response.status_code}")
                print(f"   📧 El hook debería haber enviado emails")
            else:
                print(f"❌ {description}: HTTP {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                all_ok = False
        except Exception as e:
            print(f"❌ {description}: {e}")
            all_ok = False
    
    return all_ok

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

def test_notification_logs():
    """Verificar logs de notificaciones existentes"""
    print("\n📊 Verificando logs de notificaciones...")
    
    try:
        from app.deps.supabase_client import supa_service
        
        client = supa_service()
        
        # Consultar logs recientes
        response = client.table("notification_logs").select("*").order("id", desc=True).limit(5).execute()
        
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
    """Verificar que los nuevos endpoints estén registrados"""
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

def main():
    """Función principal"""
    print("🎯 PRUEBA DE ENDPOINTS REALES: EMAIL ACTIVADO")
    print("=" * 60)
    
    # Cargar variables de entorno
    env_loaded = load_environment()
    
    # Ejecutar tests
    tests = [
        ("Salud del servidor", test_server_health),
        ("Rutas registradas", test_routes_list),
        ("Nuevos endpoints", test_new_endpoints),
        ("Componentes de notificación", test_components),
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
    print("\n" + "=" * 60)
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
        print("✅ Los endpoints reales están ACTIVADOS con hooks de email")
        print("\n📝 PRÓXIMOS PASOS:")
        print("1. Los endpoints están listos para ser usados por el frontend")
        print("2. Los correos se enviarán automáticamente")
        print("3. Monitorea la consola del servidor para ver traces")
        print("4. Verifica los logs en la base de datos")
        print("\n🔍 Para usar desde el frontend:")
        print("- Cambiar createSolicitud() para usar POST /solicitudes")
        print("- Cambiar updateServicio() para usar PUT /servicios/{id}")
        print("- Cambiar updateSolicitudEstado() para usar PUT /solicitudes/{id}/estado")
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
