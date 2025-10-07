#!/usr/bin/env python3
"""
Script de verificación rápida para el fix definitivo de emails.
Ejecutar: python verify_email_fix.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_env_loading():
    """Verifica que las variables de entorno se carguen correctamente"""
    print("🔧 Verificando carga de variables de entorno...")
    
    # Simular la carga de .env como lo hace main.py
    try:
        from dotenv import load_dotenv, find_dotenv
        env_path = find_dotenv(filename=".env", usecwd=True) or find_dotenv(filename="env.local", usecwd=True)
        if env_path:
            load_dotenv(env_path, override=True)
            print(f"✅ .env cargado desde: {env_path}")
        else:
            print("⚠️ No se encontró archivo .env")
    except Exception as e:
        print(f"❌ Error cargando .env: {e}")
        return False
    
    # Verificar variables críticas
    required_vars = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "ADMIN_EMAIL", "RESPONSABLE_EMAIL"]
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"❌ Variables faltantes: {missing}")
        return False
    
    print("✅ Todas las variables de entorno están configuradas")
    return True

def test_email_config():
    """Verifica la configuración de EmailSettings"""
    print("⚙️ Verificando EmailSettings...")
    
    try:
        from app.core.email_config import EmailSettings
        settings = EmailSettings()
        
        print(f"✅ Host: {settings.host}:{settings.port}")
        print(f"✅ User: {settings.user}")
        print(f"✅ From: {settings.from_email}")
        print(f"✅ TLS: {settings.use_tls}")
        print(f"✅ Has Password: {bool(settings.password)}")
        print(f"✅ Debug: {settings.email_debug}")
        
        return True
    except Exception as e:
        print(f"❌ Error en EmailSettings: {e}")
        return False

def test_recipient_resolver():
    """Verifica el RecipientResolver"""
    print("👥 Verificando RecipientResolver...")
    
    try:
        from app.services.recipients import RecipientResolver
        
        resolver = RecipientResolver()
        
        # Probar admins activos
        admins = resolver.admins_activos()
        print(f"✅ Admins activos: {admins}")
        
        # Probar responsable por servicio
        responsable = resolver.responsable_por_servicio(1)
        print(f"✅ Responsable por servicio: {responsable}")
        
        return True
    except Exception as e:
        print(f"❌ Error en RecipientResolver: {e}")
        return False

def test_safe_repo():
    """Verifica el SafeNotificationLogsRepo"""
    print("🛡️ Verificando SafeNotificationLogsRepo...")
    
    try:
        from app.repositories.notifications_repo import SafeNotificationLogsRepo
        
        safe_repo = SafeNotificationLogsRepo()
        
        # Probar insert_event (debería usar NoOp)
        log_id = safe_repo.insert_event(
            event_type="TEST",
            solicitud_id=1,
            servicio_id=None,
            to_email="test@example.com",
            subject="Test",
            status="RETRYING",
            error_message=None
        )
        print(f"✅ insert_event (NoOp): {log_id}")
        
        # Probar update_status (debería usar NoOp)
        safe_repo.update_status(log_id, status="SENT", error_message=None)
        print("✅ update_status (NoOp): OK")
        
        return True
    except Exception as e:
        print(f"❌ Error en SafeNotificationLogsRepo: {e}")
        return False

def test_notification_service():
    """Verifica el NotificationService"""
    print("📧 Verificando NotificationService...")
    
    try:
        from app.dependencies import get_notification_service
        
        service = get_notification_service()
        print("✅ NotificationService creado exitosamente")
        
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

def test_server_endpoints():
    """Verifica que el servidor esté corriendo y los endpoints funcionen"""
    print("🌐 Verificando endpoints del servidor...")
    
    base_url = "http://localhost:8000"
    
    # Verificar que el servidor esté corriendo
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servidor corriendo")
        else:
            print(f"❌ Servidor respondió con status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Servidor no disponible: {e}")
        print("💡 Asegúrate de ejecutar: uvicorn app.main:app --reload")
        return False
    
    # Verificar endpoints de debug
    debug_endpoints = [
        "/debug/email-config",
        "/debug/smtp-login",
        "/debug/send-smoke"
    ]
    
    for endpoint in debug_endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if endpoint == "/debug/smtp-login":
                    if data.get("ok"):
                        print(f"✅ {endpoint}: SMTP OK")
                    else:
                        print(f"❌ {endpoint}: {data.get('error')}")
                        return False
                elif endpoint == "/debug/send-smoke":
                    if data.get("ok"):
                        print(f"✅ {endpoint}: Smoke test OK")
                    else:
                        print(f"❌ {endpoint}: {data.get('error')}")
                        return False
                else:
                    print(f"✅ {endpoint}: OK")
            else:
                print(f"❌ {endpoint}: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ {endpoint}: {e}")
            return False
    
    return True

def main():
    """Función principal de verificación"""
    print("🔍 VERIFICACIÓN DEL FIX DEFINITIVO DE EMAILS")
    print("=" * 60)
    
    tests = [
        ("Carga de .env", test_env_loading),
        ("EmailSettings", test_email_config),
        ("RecipientResolver", test_recipient_resolver),
        ("SafeNotificationLogsRepo", test_safe_repo),
        ("NotificationService", test_notification_service),
        ("Endpoints del servidor", test_server_endpoints),
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
        print("🎉 ¡Todas las verificaciones pasaron! El fix está funcionando.")
        print("\n📝 Próximos pasos:")
        print("   1. Crear un servicio como RESPONSABLE")
        print("   2. Completar el servicio como ADMIN")
        print("   3. Verificar que lleguen los correos")
        print("   4. Revisar logs en consola: [EMAIL] ENVIADO...")
    else:
        print("⚠️ Algunas verificaciones fallaron. Revisa la configuración.")
        print("\n🔧 Checklist:")
        print("   - ¿Está corriendo el servidor? (uvicorn app.main:app --reload)")
        print("   - ¿Está configurado SMTP_PASS en env.local?")
        print("   - ¿Existe la tabla notification_logs? (ejecutar migración SQL)")
        print("   - ¿Está configurado ADMIN_EMAIL y RESPONSABLE_EMAIL en env.local?")

if __name__ == "__main__":
    main()
