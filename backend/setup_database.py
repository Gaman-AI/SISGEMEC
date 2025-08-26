#!/usr/bin/env python3
"""
Script para configurar la base de datos de SISGEMEC en Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

def get_supabase_client() -> Client:
    """Obtiene el cliente de Supabase"""
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not anon_key:
        raise ValueError("SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en .env")
    
    return create_client(url, anon_key)

def check_table_structure():
    """Verifica la estructura de la tabla profiles"""
    print("🔍 Verificando estructura de la tabla 'profiles'...")
    
    try:
        supabase = get_supabase_client()
        
        # Intentar consultar la tabla
        try:
            response = supabase.table("profiles").select("*").limit(1).execute()
        except Exception as e:
            print(f"❌ Error al consultar la tabla: {e}")
            return False
        
        if not response.data:
            print("⚠️  La tabla 'profiles' existe pero no tiene datos")
            print("   Esto puede causar problemas en el login")
            return False
        
        # Mostrar estructura
        sample_row = response.data[0]
        columns = list(sample_row.keys())
        
        print(f"✅ Tabla 'profiles' encontrada con {len(columns)} columnas:")
        for col in columns:
            print(f"   - {col}")
        
        # Verificar columnas requeridas
        required_columns = ["role", "email"]
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            print(f"⚠️  Columnas faltantes: {missing_columns}")
            return False
        
        print("✅ Estructura de tabla correcta")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_sample_profile():
    """Crea un perfil de ejemplo si la tabla está vacía"""
    print("\n🔧 Creando perfil de ejemplo...")
    
    try:
        supabase = get_supabase_client()
        
        # Verificar si hay datos
        try:
            response = supabase.table("profiles").select("*").limit(1).execute()
            
            if response.data:
                print("✅ La tabla ya tiene datos, no es necesario crear perfil de ejemplo")
                return True
            
            # Crear perfil de ejemplo
            sample_profile = {
                "email": "admin@sisgemec.com",
                "role": "ADMIN",
                "nombre": "Administrador del Sistema"
            }
            
            # Intentar insertar
            insert_response = supabase.table("profiles").insert(sample_profile).execute()
            print("✅ Perfil de ejemplo creado exitosamente")
            print("   Email: admin@sisgemec.com")
            print("   Role: ADMIN")
            return True
            
        except Exception as e:
            print(f"❌ Error al crear perfil: {e}")
            return False
        
        print("✅ Perfil de ejemplo creado exitosamente")
        print("   Email: admin@sisgemec.com")
        print("   Role: ADMIN")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def show_sql_setup():
    """Muestra el SQL para configurar la tabla manualmente"""
    print("\n📋 SQL para configurar la tabla 'profiles' manualmente:")
    print("=" * 60)
    print("""
-- Crear la tabla profiles si no existe
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'RESPONSABLE', 'USER')),
    nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean solo su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios actualicen solo su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los admins vean todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Insertar perfil de administrador por defecto
INSERT INTO profiles (user_id, email, role, nombre) 
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@sisgemec.com' LIMIT 1),
    'admin@sisgemec.com',
    'ADMIN',
    'Administrador del Sistema'
) ON CONFLICT (email) DO NOTHING;
""")
    print("=" * 60)

def main():
    """Función principal"""
    print("🚀 Configuración de Base de Datos SISGEMEC")
    print("=" * 50)
    
    # Verificar configuración
    try:
        supabase = get_supabase_client()
        print("✅ Conexión a Supabase establecida")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("\n💡 Asegúrate de que:")
        print("   1. El archivo .env existe y tiene las credenciales correctas")
        print("   2. Las credenciales de Supabase son válidas")
        print("   3. El proyecto de Supabase está activo")
        return
    
    # Verificar estructura de tabla
    if not check_table_structure():
        print("\n🔧 La tabla 'profiles' necesita ser configurada")
        show_sql_setup()
        
        # Intentar crear perfil de ejemplo
        if create_sample_profile():
            print("\n✅ Configuración completada")
        else:
            print("\n❌ No se pudo completar la configuración automática")
            print("   Ejecuta el SQL manualmente en Supabase")
    else:
        print("\n✅ Base de datos configurada correctamente")
    
    print("\n🎯 Próximos pasos:")
    print("   1. Ejecuta el servidor: uvicorn app.main:app --reload")
    print("   2. Accede a http://localhost:8000")
    print("   3. Usa el endpoint /auth/debug/profiles para verificar la estructura")

if __name__ == "__main__":
    main()
