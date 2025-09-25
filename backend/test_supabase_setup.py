#!/usr/bin/env python3
"""
Script de prueba para verificar la configuración de Supabase
Ejecutar después de configurar las claves reales en env.local
"""

import sys
import os
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_supabase_config():
    """Prueba la configuración de Supabase"""
    print("🔍 Verificando configuración de Supabase...")
    
    try:
        # 1. Verificar que se puede importar el cliente
        from app.core.supabase_client import get_supabase
        print("✅ Cliente Supabase importado correctamente")
        
        # 2. Verificar que se puede crear el cliente
        client = get_supabase()
        print("✅ Cliente Supabase creado correctamente")
        
        # 3. Verificar que se puede hacer una llamada admin
        users = client.auth.admin.list_users(page=1, per_page=1)
        users_count = len(users) if users else 0
        print(f"✅ Llamada admin exitosa - usuarios encontrados: {users_count}")
        
        # 4. Verificar que se puede acceder a la tabla profiles
        profiles = client.table("profiles").select("*").limit(1).execute()
        print(f"✅ Acceso a tabla profiles exitoso - perfiles encontrados: {len(profiles.data or [])}")
        
        print("\n🎉 ¡Configuración de Supabase correcta!")
        print("   El backend está listo para crear usuarios.")
        
        return True
        
    except ValueError as e:
        print(f"❌ Error de configuración: {e}")
        print("\n💡 Solución:")
        print("   1. Ve a Supabase Dashboard → Settings → API")
        print("   2. Copia la SERVICE_ROLE_KEY real")
        print("   3. Reemplaza en backend/env.local")
        print("   4. Ejecuta este script nuevamente")
        return False
        
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        print(f"   Tipo: {type(e).__name__}")
        return False

def test_user_creation():
    """Prueba la creación de un usuario de prueba"""
    print("\n🧪 Probando creación de usuario...")
    
    try:
        from app.core.supabase_client import get_supabase
        
        client = get_supabase()
        test_email = "test-setup@example.com"
        
        # Verificar si ya existe
        existing_users = client.auth.admin.list_users(page=1, per_page=200)
        if any(u.email == test_email for u in existing_users):
            print(f"⚠️  Usuario de prueba {test_email} ya existe")
            return True
        
        # Crear usuario de prueba
        user_data = {
            "email": test_email,
            "password": "testpassword123",
            "email_confirm": True,
            "user_metadata": {
                "full_name": "Test Setup User",
                "role": "RESPONSABLE",
                "source": "setup_test"
            }
        }
        
        auth_response = client.auth.admin.create_user(user_data)
        
        if auth_response.user:
            print(f"✅ Usuario de prueba creado: {auth_response.user.id}")
            
            # Crear perfil
            profile_data = {
                "user_id": auth_response.user.id,
                "full_name": "Test Setup User",
                "email": test_email,
                "role": "RESPONSABLE",
                "active": True,
            }
            
            profile_response = client.table("profiles").insert(profile_data).execute()
            print("✅ Perfil de usuario creado")
            
            return True
        else:
            print("❌ No se pudo crear el usuario de prueba")
            return False
            
    except Exception as e:
        print(f"❌ Error creando usuario de prueba: {e}")
        return False

if __name__ == "__main__":
    print("🚀 SISGEMEC - Prueba de Configuración de Supabase")
    print("=" * 50)
    
    # Verificar configuración
    config_ok = test_supabase_config()
    
    if config_ok:
        # Probar creación de usuario
        user_ok = test_user_creation()
        
        if user_ok:
            print("\n🎯 ¡Todo listo!")
            print("   Puedes iniciar el servidor con:")
            print("   uvicorn app.main:app --reload --port 8000")
        else:
            print("\n⚠️  Configuración OK, pero hay problemas con la creación de usuarios")
    else:
        print("\n❌ Configuración incorrecta - revisa las claves de Supabase")
        sys.exit(1)
