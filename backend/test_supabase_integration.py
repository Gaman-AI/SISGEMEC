#!/usr/bin/env python3
"""
Script para verificar la integración con Supabase para notificaciones por correo.
Ejecutar: python test_supabase_integration.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_supabase_connection():
    """Verifica la conexión a Supabase"""
    print("🔌 Probando conexión a Supabase...")
    
    try:
        from app.deps.supabase_client import supa_service
        
        client = supa_service()
        print("✅ Cliente Supabase creado exitosamente")
        
        # Probar una consulta simple
        response = client.table("profiles").select("id").limit(1).execute()
        print(f"✅ Consulta a tabla 'profiles' exitosa: {len(response.data)} registros")
        
        return True, client
    except Exception as e:
        print(f"❌ Error conectando a Supabase: {e}")
        return False, None

def test_notification_logs_repo():
    """Verifica el NotificationLogsRepo"""
    print("\n📝 Probando NotificationLogsRepo...")
    
    try:
        from app.deps.supabase_client import supa_service
        from app.repositories.notifications_repo import NotificationLogsRepo
        
        client = supa_service()
        repo = NotificationLogsRepo(client)
        
        # Probar insert_event
        log_id = repo.insert_event(
            event_type="TEST",
            solicitud_id=999,
            servicio_id=None,
            to_email="test@example.com",
            subject="Test Integration",
            status="RETRYING",
            error_message=None
        )
        print(f"✅ insert_event exitoso: log_id={log_id}")
        
        # Probar update_status si tenemos log_id
        if log_id:
            repo.update_status(log_id, status="SENT", error_message=None)
            print(f"✅ update_status exitoso para log_id={log_id}")
        else:
            print("⚠️ insert_event no devolvió ID (normal con algunas políticas RLS)")
        
        return True
    except Exception as e:
        print(f"❌ Error en NotificationLogsRepo: {e}")
        return False

def test_users_repo():
    """Verifica el UsersRepo"""
    print("\n👥 Probando UsersRepo...")
    
    try:
        from app.deps.supabase_client import supa_service
        from app.repositories.users_repo import UsersRepo
        
        client = supa_service()
        repo = UsersRepo(client)
        
        # Probar get_active_admin_emails
        admin_emails = repo.get_active_admin_emails()
        print(f"✅ get_active_admin_emails: {len(admin_emails)} admins encontrados")
        for email in admin_emails:
            print(f"   📧 {email}")
        
        # Probar get_responsable_email_by_servicio_id
        responsable_email = repo.get_responsable_email_by_servicio_id(1)
        print(f"✅ get_responsable_email_by_servicio_id(1): {responsable_email or 'No encontrado'}")
        
        return True
    except Exception as e:
        print(f"❌ Error en UsersRepo: {e}")
        return False

def test_notification_service():
    """Verifica el NotificationService con repos reales"""
    print("\n📧 Probando NotificationService...")
    
    try:
        from app.dependencies import get_notification_service
        
        service = get_notification_service()
        print("✅ NotificationService creado con repos reales")
        
        # Verificar que tiene los métodos necesarios
        if hasattr(service, 'send_nueva_solicitud') and hasattr(service, 'send_servicio_completado'):
            print("✅ Métodos de envío disponibles")
        else:
            print("❌ Métodos de envío faltantes")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error en NotificationService: {e}")
        return False

def test_recipient_resolver():
    """Verifica el RecipientResolver con UsersRepo real"""
    print("\n🎯 Probando RecipientResolver...")
    
    try:
        from app.dependencies import get_users_repo
        from app.services.recipients import RecipientResolver
        
        users_repo = get_users_repo()
        resolver = RecipientResolver(users_repo=users_repo)
        
        # Probar admins activos
        admins = resolver.admins_activos()
        print(f"✅ admins_activos: {len(admins)} admins")
        for admin in admins:
            print(f"   📧 {admin}")
        
        # Probar responsable por servicio
        responsable = resolver.responsable_por_servicio(1)
        print(f"✅ responsable_por_servicio(1): {responsable or 'No encontrado'}")
        
        return True
    except Exception as e:
        print(f"❌ Error en RecipientResolver: {e}")
        return False

def test_debug_endpoints():
    """Verifica que los endpoints de debug funcionen con la integración real"""
    print("\n🔧 Probando endpoints de debug...")
    
    try:
        # Probar email-config
        response = requests.get("http://localhost:8000/debug/email-config", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ /debug/email-config: has_password={data.get('has_password')}")
        else:
            print(f"❌ /debug/email-config: HTTP {response.status_code}")
            return False
        
        # Probar smtp-login
        response = requests.get("http://localhost:8000/debug/smtp-login", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                print(f"✅ /debug/smtp-login: OK - Modo: {data.get('mode')}")
            else:
                print(f"❌ /debug/smtp-login: {data.get('error')}")
                return False
        else:
            print(f"❌ /debug/smtp-login: HTTP {response.status_code}")
            return False
        
        # Probar send-smoke
        response = requests.get("http://localhost:8000/debug/send-smoke", timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                print(f"✅ /debug/send-smoke: OK - Enviado a: {data.get('sent_to')}")
            else:
                print(f"❌ /debug/send-smoke: {data.get('error')}")
                return False
        else:
            print(f"❌ /debug/send-smoke: HTTP {response.status_code}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error en endpoints de debug: {e}")
        return False

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
    print("🧪 VERIFICACIÓN DE INTEGRACIÓN CON SUPABASE")
    print("=" * 60)
    
    # Verificar que el servidor esté corriendo
    if not test_server_running():
        return
    
    tests = [
        ("Conexión a Supabase", test_supabase_connection),
        ("NotificationLogsRepo", test_notification_logs_repo),
        ("UsersRepo", test_users_repo),
        ("NotificationService", test_notification_service),
        ("RecipientResolver", test_recipient_resolver),
        ("Endpoints de debug", test_debug_endpoints),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error inesperado en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE VERIFICACIÓN:")
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} verificaciones pasaron")
    
    if passed == len(results):
        print("🎉 ¡Todas las verificaciones pasaron! La integración con Supabase está funcionando.")
        print("\n📝 Próximos pasos:")
        print("   1. Crear un servicio como RESPONSABLE")
        print("   2. Completar el servicio como ADMIN")
        print("   3. Verificar que lleguen los correos")
        print("   4. Revisar logs en consola: [EMAIL] ENVIADO...")
        print("   5. Verificar logs en BD: select * from notification_logs order by id desc limit 10;")
    else:
        print("⚠️ Algunas verificaciones fallaron. Revisa la configuración.")
        print("\n🔧 Checklist:")
        print("   - ¿Está configurado SUPABASE_SERVICE_ROLE_KEY en env.local?")
        print("   - ¿Existe la tabla notification_logs? (ejecutar migración SQL)")
        print("   - ¿Existe la tabla profiles con columnas role, is_active?")
        print("   - ¿Existe la tabla servicios con columnas responsable_id, responsable_email?")
        print("   - ¿Están configuradas las políticas RLS correctamente?")

if __name__ == "__main__":
    main()
