#!/usr/bin/env python3
"""
Test que simula la UI para verificar que los hooks de email se disparen correctamente.
Ejecutar: python test_ui_email_hooks.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_create_service_with_auth():
    """Simula crear un servicio con autenticación real"""
    print("🔐 Probando creación de servicio con autenticación...")
    
    # 1) Login como RESPONSABLE
    login_payload = {
        "email": "sisgemecresp10@gmail.com",
        "password": "test123"  # Ajusta la contraseña real
    }
    
    try:
        login_response = requests.post("http://localhost:8000/auth/login", json=login_payload, timeout=10)
        if login_response.status_code != 200:
            print(f"❌ Login falló: {login_response.status_code} - {login_response.text}")
            return False
        
        login_data = login_response.json()
        token = login_data.get("access_token")
        if not token:
            print("❌ No se obtuvo access_token del login")
            return False
        
        print("✅ Login exitoso como RESPONSABLE")
        
        # 2) Crear servicio
        headers = {"Authorization": f"Bearer {token}"}
        service_payload = {
            "equipo_id": 1,  # Ajusta según tu BD
            "descripcion": "Test de hook desde UI simulada"
        }
        
        create_response = requests.post("http://localhost:8000/servicios", 
                                      json=service_payload, 
                                      headers=headers, 
                                      timeout=15)
        
        if create_response.status_code not in (200, 201):
            print(f"❌ Creación de servicio falló: {create_response.status_code} - {create_response.text}")
            return False
        
        service_data = create_response.json()
        service_id = service_data.get("id")
        print(f"✅ Servicio creado exitosamente: ID {service_id}")
        
        return True, service_id, token
        
    except Exception as e:
        print(f"❌ Error en test de creación: {e}")
        return False, None, None

def test_complete_service_with_auth(service_id, token):
    """Simula completar un servicio con autenticación real"""
    print(f"\n🔧 Probando completar servicio {service_id}...")
    
    # 1) Login como ADMIN
    login_payload = {
        "email": "sisgemecad10@gmail.com",
        "password": "test123"  # Ajusta la contraseña real
    }
    
    try:
        login_response = requests.post("http://localhost:8000/auth/login", json=login_payload, timeout=10)
        if login_response.status_code != 200:
            print(f"❌ Login ADMIN falló: {login_response.status_code} - {login_response.text}")
            return False
        
        login_data = login_response.json()
        admin_token = login_data.get("access_token")
        if not admin_token:
            print("❌ No se obtuvo access_token del login ADMIN")
            return False
        
        print("✅ Login exitoso como ADMIN")
        
        # 2) Completar servicio
        headers = {"Authorization": f"Bearer {admin_token}"}
        complete_payload = {
            "observaciones": "Completado desde test de UI"
        }
        
        complete_response = requests.put(f"http://localhost:8000/servicios/{service_id}/complete",
                                       json=complete_payload,
                                       headers=headers,
                                       timeout=15)
        
        if complete_response.status_code not in (200, 201):
            print(f"❌ Completar servicio falló: {complete_response.status_code} - {complete_response.text}")
            return False
        
        complete_data = complete_response.json()
        print(f"✅ Servicio completado exitosamente")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de completado: {e}")
        return False

def test_create_service_without_auth():
    """Simula crear un servicio sin autenticación (para casos donde no se requiere)"""
    print("\n🔓 Probando creación de servicio sin autenticación...")
    
    try:
        service_payload = {
            "equipo_id": 1,
            "descripcion": "Test de hook sin auth"
        }
        
        create_response = requests.post("http://localhost:8000/servicios", 
                                      json=service_payload, 
                                      timeout=15)
        
        if create_response.status_code not in (200, 201):
            print(f"❌ Creación sin auth falló: {create_response.status_code} - {create_response.text}")
            return False
        
        service_data = create_response.json()
        service_id = service_data.get("id")
        print(f"✅ Servicio creado sin auth: ID {service_id}")
        
        return True, service_id
        
    except Exception as e:
        print(f"❌ Error en test sin auth: {e}")
        return False, None

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
    print("🧪 TEST DE HOOKS DE EMAIL DESDE UI SIMULADA")
    print("=" * 60)
    
    # Verificar que el servidor esté corriendo
    if not test_server_running():
        return
    
    # Configurar fallback para pruebas
    os.environ.setdefault("ADMIN_EMAIL", "sisgemecad10@gmail.com")
    os.environ.setdefault("RESPONSABLE_EMAIL", "sisgemecresp10@gmail.com")
    
    print("\n📝 INSTRUCCIONES:")
    print("1. Observa la consola del servidor para ver los traces:")
    print("   [EMAIL_HOOK] CREATION_HOOK_START ...")
    print("   [EMAIL_HOOK] CREATION_HOOK_ENQUEUED ...")
    print("2. Si no ves estos logs, el hook no se está ejecutando")
    print("3. Si ves los logs pero no llegan correos, revisa SMTP")
    print()
    
    # Test 1: Crear servicio sin autenticación
    success, service_id = test_create_service_without_auth()
    if success and service_id:
        print(f"\n✅ Test 1 PASÓ: Servicio {service_id} creado sin auth")
        print("   Revisa la consola del servidor para ver traces de email")
    else:
        print("\n❌ Test 1 FALLÓ: No se pudo crear servicio sin auth")
    
    # Test 2: Crear servicio con autenticación (si funciona)
    print("\n" + "="*40)
    print("Test 2: Crear servicio con autenticación")
    print("(Este test puede fallar si las credenciales no son correctas)")
    
    success, service_id, token = test_create_service_with_auth()
    if success and service_id:
        print(f"\n✅ Test 2 PASÓ: Servicio {service_id} creado con auth")
        print("   Revisa la consola del servidor para ver traces de email")
        
        # Test 3: Completar servicio
        print("\n" + "="*40)
        print("Test 3: Completar servicio")
        
        complete_success = test_complete_service_with_auth(service_id, token)
        if complete_success:
            print(f"\n✅ Test 3 PASÓ: Servicio {service_id} completado")
            print("   Revisa la consola del servidor para ver traces de email")
        else:
            print(f"\n❌ Test 3 FALLÓ: No se pudo completar servicio {service_id}")
    else:
        print("\n⚠️ Test 2 OMITIDO: No se pudo crear servicio con auth")
        print("   (Esto es normal si las credenciales no son correctas)")
    
    print("\n" + "=" * 60)
    print("📊 RESUMEN:")
    print("✅ Si ves [EMAIL_HOOK] en la consola del servidor, los hooks funcionan")
    print("❌ Si NO ves [EMAIL_HOOK], el problema está en la UI o en otro endpoint")
    print("\n🔍 PRÓXIMOS PASOS:")
    print("1. Revisa la consola del servidor durante estos tests")
    print("2. Si no ves traces, verifica que la UI use POST /servicios")
    print("3. Si ves traces pero no llegan correos, revisa SMTP y destinatarios")
    print("4. Verifica que ADMIN_EMAIL y RESPONSABLE_EMAIL estén configurados")

if __name__ == "__main__":
    main()
