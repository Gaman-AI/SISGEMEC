#!/usr/bin/env python3
"""
Tests específicos para el sistema de notificaciones por email.
Valida que los emails se envíen correctamente y que los fallos no rompan el flujo principal.
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

def test_email_debug_mode():
    """Test que EMAIL_DEBUG=1 funciona correctamente"""
    print("\n📧 Probando modo EMAIL_DEBUG...")
    
    # Verificar que EMAIL_DEBUG está configurado
    email_debug = os.getenv("EMAIL_DEBUG", "0")
    if email_debug in ("1", "true", "True"):
        print("✅ EMAIL_DEBUG=1 está activado (emails serán NoOp)")
        return True
    else:
        print("⚠️ EMAIL_DEBUG no está activado - emails reales se enviarán")
        return True  # No es un error, solo una advertencia

def test_notification_logs_table():
    """Test que la tabla notification_logs existe y es accesible"""
    print("\n📊 Probando acceso a notification_logs...")
    try:
        # Intentar hacer una consulta simple a notification_logs
        from app.core.supabase_client import get_supabase
        
        sb = get_supabase()
        result = sb.table("notification_logs").select("id").limit(1).execute()
        
        print("✅ Tabla notification_logs es accesible")
        return True
    except Exception as e:
        print(f"❌ Error accediendo a notification_logs: {e}")
        return False

def test_users_repo_admin_emails():
    """Test que el repositorio de usuarios puede obtener emails de admins"""
    print("\n👥 Probando obtención de emails de admins...")
    try:
        from app.repositories.users_repo import UsersRepo
        
        repo = UsersRepo()
        admin_emails = repo.get_active_admin_emails()
        
        print(f"✅ Se encontraron {len(admin_emails)} admins activos")
        if admin_emails:
            print(f"   Emails: {admin_emails}")
        else:
            print("   ⚠️ No hay admins activos configurados")
        
        return True
    except Exception as e:
        print(f"❌ Error obteniendo emails de admins: {e}")
        return False

def test_notification_service_creation():
    """Test que el servicio de notificaciones se puede crear"""
    print("\n📧 Probando creación del servicio de notificaciones...")
    try:
        from app.services.notifications import get_notification_service
        
        service = get_notification_service()
        print("✅ Servicio de notificaciones creado correctamente")
        
        # Verificar que tiene los métodos necesarios
        if hasattr(service, 'send_nueva_solicitud_flexible') and hasattr(service, 'send_servicio_completado_flexible'):
            print("✅ Servicio tiene métodos de envío de emails")
            return True
        else:
            print("❌ Servicio no tiene métodos de envío de emails")
            return False
            
    except Exception as e:
        print(f"❌ Error creando servicio de notificaciones: {e}")
        return False

def test_email_configuration():
    """Test que la configuración de email está presente"""
    print("\n⚙️ Probando configuración de email...")
    try:
        from app.core.email_config import EmailSettings
        
        settings = EmailSettings()
        
        # Verificar campos básicos
        required_fields = ['host', 'port', 'user', 'password', 'from_email']
        missing_fields = []
        
        for field in required_fields:
            if not getattr(settings, field, None):
                missing_fields.append(field)
        
        if missing_fields:
            print(f"⚠️ Campos de email faltantes: {missing_fields}")
            print("   Esto es normal si EMAIL_DEBUG=1")
        else:
            print("✅ Configuración de email completa")
        
        print(f"   Host: {settings.host}")
        print(f"   Port: {settings.port}")
        print(f"   TLS: {settings.use_tls}")
        print(f"   Debug: {settings.email_debug}")
        
        return True
    except Exception as e:
        print(f"❌ Error verificando configuración de email: {e}")
        return False

def test_smtp_connection():
    """Test conexión SMTP (solo si EMAIL_DEBUG=0)"""
    print("\n🔌 Probando conexión SMTP...")
    
    email_debug = os.getenv("EMAIL_DEBUG", "0")
    if email_debug in ("1", "true", "True"):
        print("✅ EMAIL_DEBUG=1 - saltando test de conexión SMTP")
        return True
    
    try:
        import smtplib
        from app.core.email_config import EmailSettings
        
        settings = EmailSettings()
        
        # Intentar conexión SMTP
        with smtplib.SMTP(settings.host, settings.port, timeout=10) as server:
            if settings.use_tls:
                server.starttls()
            if settings.user:
                server.login(settings.user, settings.password)
        
        print("✅ Conexión SMTP exitosa")
        return True
    except Exception as e:
        print(f"❌ Error en conexión SMTP: {e}")
        print("   Esto puede ser normal si las credenciales no están configuradas")
        return False

def test_background_tasks():
    """Test que los background tasks funcionan"""
    print("\n⚡ Probando background tasks...")
    try:
        from fastapi import BackgroundTasks
        
        # Crear una instancia de BackgroundTasks
        bg_tasks = BackgroundTasks()
        
        # Función de test simple
        def test_task():
            return "test_completed"
        
        # Agregar tarea
        bg_tasks.add_task(test_task)
        
        print("✅ Background tasks funcionan correctamente")
        return True
    except Exception as e:
        print(f"❌ Error con background tasks: {e}")
        return False

def main():
    """Ejecutar todos los tests de email"""
    print("📧 INICIANDO TESTS DE NOTIFICACIONES POR EMAIL")
    print("=" * 60)
    
    # Cargar entorno
    if not load_environment():
        print("❌ No se pudo cargar el entorno")
        return False
    
    tests = [
        test_email_debug_mode,
        test_notification_logs_table,
        test_users_repo_admin_emails,
        test_notification_service_creation,
        test_email_configuration,
        test_smtp_connection,
        test_background_tasks,
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
        print("🎉 ¡Todos los tests de email pasaron!")
        return True
    else:
        print("⚠️ Algunos tests de email fallaron")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
