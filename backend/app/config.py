# FILE: backend/app/config.py
# fix: asegurar carga de .env y/o env.local con python-dotenv; no cambies nombres de variables
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar primero .env si existe; si no, intentar env.local
_root = Path(__file__).resolve().parents[2]
_dotenv = _root / ".env"
_envlocal = _root / "env.local"
if _dotenv.exists():
    load_dotenv(_dotenv)
elif _envlocal.exists():
    load_dotenv(_envlocal)
else:
    # Fallback a load_dotenv() sin path específico
    load_dotenv()

class Settings:
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION: int = int(os.getenv("JWT_EXPIRATION", "3600"))
    
    # Application Configuration
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SISGEMEC 2.0"
    
    # Import Configuration
    API_ADMIN_TOKEN: str = os.getenv("API_ADMIN_TOKEN", "")
    SHEET_INVENTARIO: str = os.getenv("SHEET_INVENTARIO", "Inventario")
    SHEET_CORREOS: str = os.getenv("SHEET_CORREOS", "Lista de correos")
    
    def validate(self) -> bool:
        """Valida que las configuraciones requeridas estén presentes"""
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY"
        ]
        
        # API_ADMIN_TOKEN es opcional para desarrollo
        if not self.API_ADMIN_TOKEN and self.ENVIRONMENT == "production":
            print("Warning: API_ADMIN_TOKEN not set for production environment")
        
        missing_vars = [var for var in required_vars if not getattr(self, var)]
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True
    
    def validate_import_env(self) -> bool:
        """Valida que las configuraciones requeridas para importación estén presentes"""
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY"
        ]
        
        missing_vars = [var for var in required_vars if not getattr(self, var)]
        
        if missing_vars:
            raise ValueError(
                f"SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en backend/.env. "
                f"Para importación admin se requiere la Service Role Key (no el ANON KEY). "
                f"Variables faltantes: {', '.join(missing_vars)}"
            )
        
        return True

# Instancia global de configuración
settings = Settings()

# Validar configuración al importar
try:
    settings.validate()
except ValueError as e:
    print(f"Configuration error: {e}")
    print("Please check your .env file")
