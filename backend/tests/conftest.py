"""
Configuración base para tests de SISGEMEC 2.0
Fixtures y overrides de dependencias para testing
"""
import os
import pytest
import uuid
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from typing import Dict, Any, List

# Importar la app principal
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.deps.jwt_auth import UserContext
from app.repositories.users_repo import UsersRepo
from app.services.notifications import get_notification_service

# ===== FIXTURES DE USUARIOS =====

@pytest.fixture
def responsable_user() -> UserContext:
    """Usuario RESPONSABLE para testing"""
    return UserContext(
        user_id=str(uuid.uuid4()),
        email="responsable@test.com",
        full_name="Test Responsable",
        role="RESPONSABLE"
    )

@pytest.fixture
def admin_user() -> UserContext:
    """Usuario ADMIN para testing"""
    return UserContext(
        user_id=str(uuid.uuid4()),
        email="admin@test.com",
        full_name="Test Admin",
        role="ADMIN"
    )

# ===== FIXTURES DE CLIENTE =====

@pytest.fixture
def client():
    """Cliente de test de FastAPI"""
    return TestClient(app)

# ===== OVERRIDES DE DEPENDENCIAS =====

@pytest.fixture
def override_responsable_auth(responsable_user):
    """Override de autenticación para usuario RESPONSABLE"""
    def _override():
        return responsable_user
    return _override

@pytest.fixture
def override_admin_auth(admin_user):
    """Override de autenticación para usuario ADMIN"""
    def _override():
        return admin_user
    return _override

# ===== FIXTURES DE SMTP FAKE =====

@pytest.fixture
def smtp_success_mock():
    """Mock de SMTP que simula envío exitoso"""
    with patch('smtplib.SMTP') as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        mock_smtp.return_value.__exit__.return_value = None
        yield mock_server

@pytest.fixture
def smtp_failure_mock():
    """Mock de SMTP que simula fallo"""
    with patch('smtplib.SMTP') as mock_smtp:
        mock_smtp.side_effect = Exception("SMTP Connection Failed")
        yield mock_smtp

# ===== FIXTURES DE REPOSITORIOS =====

@pytest.fixture
def mock_users_repo():
    """Mock del repositorio de usuarios"""
    mock_repo = MagicMock(spec=UsersRepo)
    mock_repo.get_active_admin_emails.return_value = [
        "admin1@test.com",
        "admin2@test.com"
    ]
    mock_repo.get_responsable_email_by_servicio_id.return_value = "responsable@test.com"
    return mock_repo

@pytest.fixture
def mock_notification_service():
    """Mock del servicio de notificaciones"""
    mock_service = MagicMock()
    mock_service.send_nueva_solicitud_flexible = MagicMock()
    mock_service.send_servicio_completado_flexible = MagicMock()
    return mock_service

# ===== FIXTURES DE ENTORNO =====

@pytest.fixture
def test_env():
    """Variables de entorno para testing"""
    return {
        "EMAIL_DEBUG": "0",  # Activar emails para testing
        "SMTP_HOST": "smtp.test.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "test@test.com",
        "SMTP_PASS": "testpass",
        "SMTP_FROM": "Test Notifier <test@test.com>",
        "APP_BASE_URL": "http://localhost:5173"
    }

# ===== HELPERS =====

def create_fake_jwt(user_id: str, email: str, role: str) -> str:
    """Crear JWT fake para testing (no se valida, solo se usa para override)"""
    # JWT debe tener 3 partes: header.payload.signature
    import base64
    import json
    
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": user_id, "email": email, "role": role}
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    signature = "fake_signature"
    
    return f"{header_b64}.{payload_b64}.{signature}"

def get_auth_headers(user_id: str, email: str, role: str) -> Dict[str, str]:
    """Crear headers de autorización para testing"""
    return {
        "Authorization": f"Bearer {create_fake_jwt(user_id, email, role)}",
        "Content-Type": "application/json"
    }

# ===== CONTADORES DE TESTING =====

class TestCounters:
    """Contadores para tracking de notificaciones en tests"""
    def __init__(self):
        self.email_attempts = 0
        self.email_success = 0
        self.email_failures = 0
        self.notification_logs = []
    
    def reset(self):
        self.email_attempts = 0
        self.email_success = 0
        self.email_failures = 0
        self.notification_logs = []
    
    def add_attempt(self):
        self.email_attempts += 1
    
    def add_success(self):
        self.email_success += 1
    
    def add_failure(self):
        self.email_failures += 1
    
    def add_log(self, log_entry: Dict[str, Any]):
        self.notification_logs.append(log_entry)

@pytest.fixture
def test_counters():
    """Contadores globales para tests"""
    return TestCounters()
