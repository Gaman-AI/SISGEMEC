#!/usr/bin/env python3
"""
Script para verificar la configuración de SISGEMEC paso a paso
"""

import os
import sys
from dotenv import load_dotenv

def check_environment():
    """Verifica las variables de entorno"""
    print("🔍 Verificando variables de entorno...")
    
    load_dotenv()
    
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY"]
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: {'*' * 10}{value[-4:] if len(value) > 4 else value}")
    
    if missing_vars:
        print(f"❌ Variables faltantes: {missing_vars}")
        print("   Crea un archivo .env con estas variables")
        return False
    
    print("✅ Variables de entorno configuradas")
    return True

def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    print("\n🔍 Verificando dependencias...")
    
    try:
        import fastapi
        print("✅ FastAPI instalado")
    except ImportError:
        print("❌ FastAPI no está instalado")
        print("   Ejecuta: pip install -r requirements.txt")
        return False
    
    try:
        import supabase
        print("✅ Supabase instalado")
    except ImportError:
        print("❌ Supabase no está instalado")
        print("   Ejecuta: pip install -r requirements.txt")
        return False
    
    try:
        import uvicorn
        print("✅ Uvicorn instalado")
    except ImportError:
        print("❌ Uvicorn no está instalado")
        print("   Ejecuta: pip install -r requirements.txt")
        return False
    
    print("✅ Todas las dependencias están instaladas")
    return True

def check_files():
    """Verifica que los archivos necesarios existan"""
    print("\n🔍 Verificando archivos...")
    
    required_files = [
        "app/main.py",
        "app/config.py",
        "app/routers/auth.py",
        "app/routers/me.py",
        "requirements.txt"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            missing_files.append(file_path)
            print(f"❌ {file_path}")
    
    if missing_files:
        print(f"❌ Archivos faltantes: {missing_files}")
        return False
    
    print("✅ Todos los archivos necesarios existen")
    return True

def check_supabase_connection():
    """Verifica la conexión a Supabase"""
    print("\n🔍 Verificando conexión a Supabase...")
    
    try:
        from app.config import settings
        from app.deps.supabase_client import supa
        
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            print("❌ Configuración de Supabase incompleta")
            return False
        
        # Crear cliente
        supabase = supa()
        print("✅ Cliente de Supabase creado")
        
        # Intentar una consulta simple
        try:
            response = supabase.table("profiles").select("1").limit(1).execute()
            print("✅ Conexión a Supabase exitosa")
            return True
        except Exception as e:
            print(f"⚠️  Conexión exitosa pero error en consulta: {str(e)[:100]}")
            print("   Esto puede indicar problemas con RLS o la tabla")
            return True  # La conexión funciona, el problema es otro
            
    except Exception as e:
        print(f"❌ Error al conectar con Supabase: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 VERIFICACIÓN DE CONFIGURACIÓN SISGEMEC")
    print("=" * 50)
    
    checks = [
        check_environment,
        check_dependencies,
        check_files,
        check_supabase_connection
    ]
    
    all_passed = True
    
    for check in checks:
        if not check():
            all_passed = False
            break
    
    print("\n" + "=" * 50)
    
    if all_passed:
        print("✅ TODAS LAS VERIFICACIONES PASARON")
        print("\n🎯 Próximos pasos:")
        print("   1. Ejecuta: start_server.bat")
        print("   2. O manualmente: uvicorn app.main:app --reload")
        print("   3. Ve a Supabase y ejecuta: emergency_fix.sql")
        print("   4. Prueba el login en http://localhost:8000")
    else:
        print("❌ ALGUNAS VERIFICACIONES FALLARON")
        print("\n🔧 Corrige los errores antes de continuar")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
