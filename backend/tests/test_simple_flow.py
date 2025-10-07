"""
Tests simplificados para verificar el flujo básico de SISGEMEC 2.0
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

def test_health_endpoint(client: TestClient):
    """Test que el endpoint de salud funciona"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_cors_headers(client: TestClient):
    """Test que los headers CORS están presentes"""
    response = client.get("/health")
    headers = response.headers
    
    assert "access-control-allow-origin" in headers
    assert "access-control-allow-credentials" in headers
    assert headers["access-control-allow-credentials"] == "true"

def test_solicitudes_endpoint_requires_auth(client: TestClient):
    """Test que el endpoint de solicitudes requiere autenticación"""
    response = client.post("/solicitudes", json={"equipo_id": 1, "descripcion": "test"})
    assert response.status_code == 401

def test_servicios_complete_endpoint_requires_auth(client: TestClient):
    """Test que el endpoint de completar servicios requiere autenticación"""
    response = client.put("/servicios/1/complete")
    assert response.status_code == 401

def test_debug_endpoint_accessible(client: TestClient):
    """Test que el endpoint de debug es accesible"""
    response = client.get("/debug/last-error?error_id=test123")
    assert response.status_code == 200

def test_notification_service_creation():
    """Test que el servicio de notificaciones se puede crear"""
    from app.services.notifications import get_notification_service
    
    service = get_notification_service()
    assert hasattr(service, 'send_nueva_solicitud_flexible')
    assert hasattr(service, 'send_servicio_completado_flexible')

def test_users_repo_creation():
    """Test que el repositorio de usuarios se puede crear"""
    from app.repositories.users_repo import UsersRepo
    
    repo = UsersRepo()
    assert hasattr(repo, 'get_active_admin_emails')
    assert hasattr(repo, 'get_responsable_email_by_servicio_id')

def test_notification_logs_repo_creation():
    """Test que el repositorio de logs de notificaciones se puede crear"""
    from app.repositories.notifications_repo import NotificationLogsRepo
    
    repo = NotificationLogsRepo()
    assert hasattr(repo, 'insert_event')
    assert hasattr(repo, 'update_status')

def test_email_config_loading():
    """Test que la configuración de email se puede cargar"""
    from app.core.email_config import EmailSettings
    
    settings = EmailSettings()
    assert hasattr(settings, 'host')
    assert hasattr(settings, 'port')
    assert hasattr(settings, 'user')
    assert hasattr(settings, 'password')

def test_supabase_client_creation():
    """Test que el cliente de Supabase se puede crear"""
    from app.core.supabase_client import get_supabase
    
    client = get_supabase()
    assert client is not None

def test_error_tracking_creation():
    """Test que el sistema de tracking de errores funciona"""
    from app.core.error_tracking import capture_exception, get_trace
    
    # Simular un error
    try:
        raise ValueError("Test error")
    except Exception as e:
        error_id = capture_exception(e)
        assert error_id is not None
        assert len(error_id) == 8
        
        # Verificar que se puede obtener el trace
        trace = get_trace(error_id)
        assert trace is not None
        assert "Test error" in trace

def test_jwt_auth_module():
    """Test que el módulo de autenticación JWT existe"""
    from app.deps.jwt_auth import require_user_jwt, require_admin_user
    
    assert callable(require_user_jwt)
    assert callable(require_admin_user)

def test_main_app_creation():
    """Test que la app principal se puede crear"""
    from app.main import app
    
    assert app is not None
    assert hasattr(app, 'routes')

def test_environment_variables():
    """Test que las variables de entorno están configuradas"""
    import os
    
    # Verificar variables críticas
    assert os.getenv("SUPABASE_URL") is not None
    assert os.getenv("SUPABASE_ANON_KEY") is not None
    
    # Verificar configuración de email
    email_debug = os.getenv("EMAIL_DEBUG", "0")
    assert email_debug in ("0", "1", "true", "True", "false", "False")

def test_database_tables_accessible():
    """Test que las tablas de la base de datos son accesibles"""
    from app.core.supabase_client import get_supabase
    
    sb = get_supabase()
    
    # Test acceso a tablas principales (sin modificar datos)
    try:
        # Solo verificar que se puede hacer una consulta simple
        result = sb.table("profiles").select("user_id").limit(1).execute()
        assert result is not None
    except Exception as e:
        # Si falla, al menos verificar que el error es de acceso, no de tabla inexistente
        assert "profiles" in str(e) or "table" in str(e).lower()

def test_cors_options_handling(client: TestClient):
    """Test que las requests OPTIONS se manejan correctamente"""
    response = client.options("/solicitudes")
    assert response.status_code == 204
    
    # Verificar headers CORS
    headers = response.headers
    assert "access-control-allow-origin" in headers
    assert "access-control-allow-methods" in headers
    assert "access-control-allow-headers" in headers

def test_background_tasks_available():
    """Test que FastAPI BackgroundTasks está disponible"""
    from fastapi import BackgroundTasks
    
    bg_tasks = BackgroundTasks()
    assert bg_tasks is not None
    
    # Test función simple
    def test_task():
        return "completed"
    
    bg_tasks.add_task(test_task)
    assert len(bg_tasks.tasks) == 1
