#!/usr/bin/env python3
"""
Script de validación final para confirmar que el envío de correos está activado en la UI.
Ejecutar: python validate_ui_email_activation.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_server_health():
    """Verifica que el servidor esté corriendo"""
    print("🚀 Verificando salud del servidor...")
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
        print("💡 Asegúrate de ejecutar: uvicorn app.main:app --reload")
        return False

def test_debug_endpoints():
    """Verifica que los endpoints de debug funcionen"""
    print("\n🔧 Verificando endpoints de debug...")
    
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

def test_create_service_endpoint():
    """Prueba el endpoint de creación de servicio"""
    print("\n📝 Probando endpoint de creación de servicio...")
    
    try:
        # Payload mínimo para crear un servicio
        payload = {
            "equipo_id": 1,
            "descripcion": "Test de validación de email desde UI"
        }
        
        response = requests.post("http://localhost:8000/servicios", 
                               json=payload, 
                               timeout=15)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code in (200, 201):
            data = response.json()
            service_id = data.get("id")
            print(f"✅ Servicio creado exitosamente: ID {service_id}")
            print("   📧 Revisa la consola del servidor para ver traces de email:")
            print("      [EMAIL_HOOK] CREATION_HOOK_START ...")
            print("      [EMAIL_HOOK] CREATION_HOOK_ENQUEUED ...")
            return True, service_id
        else:
            print(f"❌ Error creando servicio: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False, None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def test_complete_service_endpoint(service_id):
    """Prueba el endpoint de completar servicio"""
    print(f"\n🔧 Probando endpoint de completar servicio {service_id}...")
    
    try:
        payload = {
            "observaciones": "Completado desde test de validación"
        }
        
        response = requests.put(f"http://localhost:8000/servicios/{service_id}/complete",
                              json=payload,
                              timeout=15)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code in (200, 201):
            data = response.json()
            print(f"✅ Servicio completado exitosamente")
            print("   📧 Revisa la consola del servidor para ver traces de email:")
            print("      [EMAIL_HOOK] COMPLETE_HOOK_START ...")
            print("      [EMAIL_HOOK] COMPLETE_HOOK_ENQUEUED ...")
            return True
        else:
            print(f"❌ Error completando servicio: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_environment_variables():
    """Verifica variables de entorno críticas"""
    print("\n⚙️ Verificando variables de entorno...")
    
    required_vars = [
        "SMTP_HOST", "SMTP_USER", "SMTP_PASS", 
        "ADMIN_EMAIL", "RESPONSABLE_EMAIL", "EMAIL_DEBUG"
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if var in ["SMTP_PASS"]:
                print(f"✅ {var}: {'*' * len(value)}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: No configurado")
            missing.append(var)
    
    return len(missing) == 0

def check_notification_logs():
    """Verifica logs de notificaciones en la BD"""
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

def main():
    """Función principal de validación"""
    print("🎯 VALIDACIÓN FINAL: ACTIVACIÓN DE CORREOS EN LA UI")
    print("=" * 70)
    
    # Cargar variables de entorno desde env.local
    try:
        from dotenv import load_dotenv, find_dotenv
        env_path = find_dotenv(filename="env.local", usecwd=True)
        if env_path:
            load_dotenv(env_path, override=True)
            print(f"✅ Variables de entorno cargadas desde: {env_path}")
        else:
            print("⚠️ No se encontró env.local, usando variables del sistema")
    except Exception as e:
        print(f"⚠️ Error cargando env.local: {e}")
    
    # Configurar variables de entorno para pruebas
    os.environ.setdefault("ADMIN_EMAIL", "sisgemecad10@gmail.com")
    os.environ.setdefault("RESPONSABLE_EMAIL", "sisgemecresp10@gmail.com")
    
    # Ejecutar validaciones
    checks = [
        ("Salud del servidor", test_server_health),
        ("Variables de entorno", check_environment_variables),
        ("Endpoints de debug", test_debug_endpoints),
        ("Logs de notificaciones", check_notification_logs),
    ]
    
    results = []
    for check_name, check_func in checks:
        print(f"\n{'='*20} {check_name} {'='*20}")
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ Error en {check_name}: {e}")
            results.append((check_name, False))
    
    # Test de endpoints principales
    print(f"\n{'='*20} Test de Endpoints {'='*20}")
    
    # Test creación
    create_success, service_id = test_create_service_endpoint()
    results.append(("Creación de servicio", create_success))
    
    # Test completado (si la creación fue exitosa)
    if create_success and service_id:
        complete_success = test_complete_service_endpoint(service_id)
        results.append(("Completado de servicio", complete_success))
    else:
        print("\n⚠️ Test de completado omitido (creación falló)")
        results.append(("Completado de servicio", False))
    
    # Resumen final
    print("\n" + "=" * 70)
    print("📊 RESUMEN DE VALIDACIÓN:")
    
    passed = 0
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {check_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} validaciones pasaron")
    
    if passed == len(results):
        print("\n🎉 ¡VALIDACIÓN EXITOSA!")
        print("✅ El envío de correos está ACTIVADO en la UI")
        print("\n📝 PRÓXIMOS PASOS:")
        print("1. Inicia sesión como RESPONSABLE en la UI")
        print("2. Crea una solicitud/servicio")
        print("3. Verifica que llegue el correo a los ADMINS")
        print("4. Inicia sesión como ADMIN")
        print("5. Completa el servicio")
        print("6. Verifica que llegue el correo al RESPONSABLE")
        print("\n🔍 Para monitorear:")
        print("- Consola del servidor: [EMAIL_HOOK] traces")
        print("- Base de datos: select * from notification_logs order by id desc limit 10;")
    else:
        print("\n⚠️ VALIDACIÓN FALLÓ")
        print("❌ Algunos componentes no están funcionando correctamente")
        print("\n🔧 REVISAR:")
        print("1. Variables de entorno en env.local")
        print("2. Configuración de SMTP")
        print("3. Conexión a Supabase")
        print("4. Tabla notification_logs")
        print("5. Endpoints /debug/*")

if __name__ == "__main__":
    main()
