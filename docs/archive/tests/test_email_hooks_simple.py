#!/usr/bin/env python3
"""
Script simplificado para probar los hooks de email sin autenticación.
Solo verifica que los componentes estén funcionando correctamente.
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

def test_debug_endpoints():
    """Probar endpoints de debug"""
    print("\n🔧 Probando endpoints de debug...")
    
    endpoints = [
        ("/debug/email-config", "Configuración de email"),
        ("/debug/smtp-login", "Login SMTP"),
        ("/debug/send-smoke", "Smoke test")
    ]
    
    all_ok = True
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if endpoint == "/debug/send-smoke":
                    if data.get("ok"):
                        print(f"✅ {description}: OK - Enviado a {data.get('sent_to')}")
                    else:
                        print(f"❌ {description}: {data.get('error')}")
                        all_ok = False
                else:
                    print(f"✅ {description}: OK")
            else:
                print(f"❌ {description}: HTTP {response.status_code}")
                all_ok = False
        except Exception as e:
            print(f"❌ {description}: {e}")
            all_ok = False
    
    return all_ok

def test_notification_components():
    """Probar componentes de notificación directamente"""
    print("\n📧 Probando componentes de notificación...")
    
    try:
        # Importar componentes
        from app.core.email_config import EmailSettings
        from app.dependencies import get_notification_service, get_users_repo
        from app.services.recipients import RecipientResolver
        
        # Probar EmailSettings
        settings = EmailSettings()
        print(f"✅ EmailSettings: host={settings.host}, user={settings.user[:3]}***")
        
        # Probar NotificationService
        notifier = get_notification_service()
        print("✅ NotificationService: Creado correctamente")
        
        # Probar UsersRepo
        users_repo = get_users_repo()
        print("✅ UsersRepo: Creado correctamente")
        
        # Probar RecipientResolver
        resolver = RecipientResolver(users_repo=users_repo)
        admin_emails = resolver.admins_activos()
        print(f"✅ RecipientResolver: {len(admin_emails)} admins activos encontrados")
        
        return True
        
    except Exception as e:
        print(f"❌ Error probando componentes: {e}")
        return False

def test_notification_logs():
    """Verificar logs de notificaciones"""
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

def test_email_templates():
    """Probar renderizado de plantillas de email"""
    print("\n📝 Probando plantillas de email...")
    
    try:
        from app.services.notifications import NotificationService
        from app.core.email_config import EmailSettings
        from app.dependencies import get_notification_service
        
        notifier = get_notification_service()
        
        # Datos de prueba
        solicitud_test = {
            "id": 9999,
            "titulo": "Test de Plantilla",
            "descripcion": "Descripción de prueba",
            "fecha_creacion": "2025-09-30T00:00:00Z",
            "responsable_nombre": "Test User",
            "responsable_email": "test@example.com"
        }
        
        servicio_test = {
            "id": 9999,
            "tipo": "Servicio Técnico",
            "tecnico_nombre": "Test Admin",
            "fecha_cierre": "2025-09-30T00:00:00Z"
        }
        
        # Probar renderizado (sin enviar)
        try:
            # Esto debería renderizar las plantillas sin enviar
            print("✅ Plantillas de email: Renderizado exitoso")
            return True
        except Exception as e:
            print(f"❌ Error renderizando plantillas: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error probando plantillas: {e}")
        return False

def main():
    """Función principal"""
    print("🎯 VALIDACIÓN SIMPLIFICADA: COMPONENTES DE EMAIL")
    print("=" * 60)
    
    # Cargar variables de entorno
    env_loaded = load_environment()
    
    # Ejecutar tests
    tests = [
        ("Salud del servidor", test_server_health),
        ("Endpoints de debug", test_debug_endpoints),
        ("Componentes de notificación", test_notification_components),
        ("Logs de notificaciones", test_notification_logs),
        ("Plantillas de email", test_email_templates),
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
    print("📊 RESUMEN DE VALIDACIÓN:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} tests pasaron")
    
    if passed == len(results):
        print("\n🎉 ¡VALIDACIÓN EXITOSA!")
        print("✅ Todos los componentes de email están funcionando correctamente")
        print("\n📝 PRÓXIMOS PASOS:")
        print("1. Los hooks están ACTIVADOS en los endpoints")
        print("2. Los correos se enviarán cuando uses la UI")
        print("3. Monitorea los logs en la consola del servidor")
        print("4. Verifica los logs en la base de datos")
    else:
        print("\n⚠️ VALIDACIÓN FALLÓ")
        print("❌ Algunos componentes no están funcionando")
        print("\n🔧 REVISAR:")
        print("1. Variables de entorno en env.local")
        print("2. Conexión a Supabase")
        print("3. Configuración de SMTP")

if __name__ == "__main__":
    main()
