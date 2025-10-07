#!/usr/bin/env python3
"""
Script de diagnóstico para investigar por qué no se envían correos desde la UI.
Ejecutar: python diagnose_ui_email_issue.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def check_endpoints():
    """Verifica qué endpoints están disponibles"""
    print("🔍 Verificando endpoints disponibles...")
    
    try:
        response = requests.get("http://localhost:8000/__routes", timeout=10)
        if response.status_code == 200:
            routes = response.json()
            print(f"✅ Se encontraron {len(routes)} rutas")
            
            # Buscar rutas relacionadas con servicios
            service_routes = [r for r in routes if "servicio" in r.lower()]
            print(f"\n📋 Rutas relacionadas con servicios:")
            for route in service_routes:
                print(f"   {route}")
            
            return service_routes
        else:
            print(f"❌ Error obteniendo rutas: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def test_debug_endpoints():
    """Verifica que los endpoints de debug funcionen"""
    print("\n🔧 Verificando endpoints de debug...")
    
    endpoints = [
        ("/debug/email-config", "Configuración de email"),
        ("/debug/smtp-login", "Login SMTP"),
        ("/debug/send-smoke", "Smoke test")
    ]
    
    results = []
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if endpoint == "/debug/send-smoke":
                    if data.get("ok"):
                        print(f"✅ {description}: OK - Enviado a {data.get('sent_to')}")
                        results.append(True)
                    else:
                        print(f"❌ {description}: {data.get('error')}")
                        results.append(False)
                else:
                    print(f"✅ {description}: OK")
                    results.append(True)
            else:
                print(f"❌ {description}: HTTP {response.status_code}")
                results.append(False)
        except Exception as e:
            print(f"❌ {description}: {e}")
            results.append(False)
    
    return all(results)

def test_create_service_direct():
    """Prueba crear servicio directamente"""
    print("\n📝 Probando creación directa de servicio...")
    
    try:
        # Payload mínimo
        payload = {
            "equipo_id": 1,
            "descripcion": "Test de diagnóstico"
        }
        
        response = requests.post("http://localhost:8000/servicios", 
                               json=payload, 
                               timeout=15)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.status_code in (200, 201):
            data = response.json()
            service_id = data.get("id")
            print(f"✅ Servicio creado: ID {service_id}")
            return True, service_id
        else:
            print(f"❌ Error creando servicio: {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def check_environment():
    """Verifica variables de entorno"""
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

def check_database_connection():
    """Verifica conexión a la base de datos"""
    print("\n🗄️ Verificando conexión a base de datos...")
    
    try:
        from app.deps.supabase_client import supa_service
        
        client = supa_service()
        
        # Probar consulta a profiles
        response = client.table("profiles").select("id, email, role").limit(1).execute()
        print(f"✅ Conexión a BD OK - {len(response.data)} registros en profiles")
        
        # Probar consulta a servicios
        response = client.table("servicios").select("id").limit(1).execute()
        print(f"✅ Tabla servicios accesible - {len(response.data)} registros")
        
        return True
    except Exception as e:
        print(f"❌ Error conectando a BD: {e}")
        return False

def check_notification_logs():
    """Verifica logs de notificaciones en la BD"""
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
        else:
            print("⚠️ No se encontraron logs de notificaciones")
        
        return True
    except Exception as e:
        print(f"❌ Error consultando logs: {e}")
        return False

def main():
    """Función principal de diagnóstico"""
    print("🔍 DIAGNÓSTICO: ¿Por qué no se envían correos desde la UI?")
    print("=" * 70)
    
    # Verificar que el servidor esté corriendo
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            print("❌ Servidor no disponible")
            return
    except:
        print("❌ Servidor no disponible")
        print("💡 Asegúrate de ejecutar: uvicorn app.main:app --reload")
        return
    
    print("✅ Servidor corriendo")
    
    # Ejecutar diagnósticos
    checks = [
        ("Variables de entorno", check_environment),
        ("Conexión a BD", check_database_connection),
        ("Endpoints disponibles", lambda: len(check_endpoints()) > 0),
        ("Endpoints de debug", test_debug_endpoints),
        ("Logs de notificaciones", check_notification_logs),
        ("Creación directa de servicio", lambda: test_create_service_direct()[0]),
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
    
    # Resumen
    print("\n" + "=" * 70)
    print("📊 RESUMEN DE DIAGNÓSTICO:")
    
    passed = 0
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {check_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} verificaciones pasaron")
    
    # Recomendaciones
    print("\n🔧 RECOMENDACIONES:")
    
    if not results[0][1]:  # Variables de entorno
        print("1. Configura las variables de entorno faltantes en env.local")
    
    if not results[1][1]:  # Conexión a BD
        print("2. Verifica la configuración de Supabase")
    
    if not results[3][1]:  # Endpoints de debug
        print("3. Verifica que EMAIL_DEBUG=1 y que los endpoints /debug/* funcionen")
    
    if not results[4][1]:  # Logs de notificaciones
        print("4. Ejecuta la migración SQL para crear la tabla notification_logs")
    
    if not results[5][1]:  # Creación directa
        print("5. Verifica que el endpoint POST /servicios funcione correctamente")
    
    print("\n📝 PRÓXIMOS PASOS:")
    print("1. Ejecuta: python test_ui_email_hooks.py")
    print("2. Observa la consola del servidor para ver traces [EMAIL_HOOK]")
    print("3. Si no ves traces, la UI no está usando POST /servicios")
    print("4. Si ves traces pero no llegan correos, revisa SMTP y destinatarios")

if __name__ == "__main__":
    main()
