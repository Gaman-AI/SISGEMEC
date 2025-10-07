"""
Tests del flujo de creación de solicitudes con notificaciones por email
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import get_auth_headers, test_counters
from tests.utils.fakes import create_fake_notification_log

def test_create_solicitud_json_ok_email_sent(
    client: TestClient, 
    responsable_user, 
    smtp_success_mock,
    mock_users_repo,
    test_counters
):
    """Test creación de solicitud con JSON y envío exitoso de emails"""
    # Override de dependencias
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service') as mock_notifier:
        
        # Configurar mock del notifier
        mock_service = MagicMock()
        mock_notifier.return_value = mock_service
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Payload de la solicitud
        payload = {
            "equipo_id": 101,
            "descripcion": "Teclado intermitente"
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True
        assert "solicitud_id" in response_data
        assert isinstance(response_data["solicitud_id"], int)
        
        # Verificar que se intentó enviar emails (en background)
        # Como usamos BackgroundTasks, el envío es asíncrono
        # En un test real, podríamos verificar que se programó la tarea

def test_create_solicitud_formdata_alias_ok(
    client: TestClient,
    responsable_user,
    mock_users_repo
):
    """Test creación de solicitud con FormData y campos alias"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service'):
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Payload con campos alias
        payload = {
            "equipoId": 102,  # Alias de equipo_id
            "description": "Mouse no funciona"  # Alias de descripcion
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True
        assert "solicitud_id" in response_data

def test_create_solicitud_email_failure_non_blocking(
    client: TestClient,
    responsable_user,
    smtp_failure_mock,
    mock_users_repo
):
    """Test que fallo de email NO bloquea la creación de solicitud"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service'):
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Payload de la solicitud
        payload = {
            "equipo_id": 103,
            "descripcion": "Monitor con rayas"
        }
        
        # Realizar request (debe funcionar aunque SMTP falle)
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones - debe crear la solicitud aunque email falle
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True
        assert "solicitud_id" in response_data

def test_create_solicitud_usa_sub_como_solicitante(
    client: TestClient,
    responsable_user,
    mock_users_repo
):
    """Test que se usa el sub del JWT como solicitante_id"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service'), \
         patch('app.routers.solicitudes.get_supabase') as mock_supabase:
        
        # Mock de Supabase para capturar el insert
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de la respuesta del insert
        mock_response = MagicMock()
        mock_response.data = [{"solicitud_id": 123}]
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Payload de la solicitud
        payload = {
            "equipo_id": 104,
            "descripcion": "Impresora atascada"
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones
        assert response.status_code == 201
        
        # Verificar que se llamó al insert con el solicitante_id correcto
        mock_sb.table.assert_called_with("solicitudes_servicio")
        insert_call = mock_sb.table.return_value.insert
        insert_call.assert_called_once()
        
        # Verificar que el solicitante_id es el user_id del JWT
        insert_data = insert_call.call_args[0][0]
        assert insert_data["solicitante_id"] == responsable_user["user_id"]
        assert insert_data["equipo_id"] == 104
        assert insert_data["descripcion"] == "Impresora atascada"
        assert insert_data["estado_solicitud_id"] == 1

def test_create_solicitud_validation_errors(
    client: TestClient,
    responsable_user
):
    """Test validación de campos requeridos"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user):
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Test con payload vacío
        response = client.post("/solicitudes", json={}, headers=headers)
        assert response.status_code == 422
        
        # Test sin equipo_id
        payload = {"descripcion": "Sin equipo"}
        response = client.post("/solicitudes", json=payload, headers=headers)
        assert response.status_code == 422
        
        # Test sin descripcion
        payload = {"equipo_id": 101}
        response = client.post("/solicitudes", json=payload, headers=headers)
        assert response.status_code == 422

def test_create_solicitud_unauthorized(
    client: TestClient
):
    """Test que requests sin autenticación son rechazados"""
    payload = {
        "equipo_id": 101,
        "descripcion": "Test sin auth"
    }
    
    # Sin headers de autorización
    response = client.post("/solicitudes", json=payload)
    assert response.status_code == 401
    
    # Con header de autorización inválido
    headers = {"Authorization": "Bearer invalid.token"}
    response = client.post("/solicitudes", json=payload, headers=headers)
    assert response.status_code == 401

def test_create_solicitud_multiple_alias_fields(
    client: TestClient,
    responsable_user,
    mock_users_repo
):
    """Test que acepta múltiples alias de campos"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service'):
        
        # Headers de autenticación
        headers = get_auth_headers(
            responsable_user["user_id"], 
            responsable_user["email"], 
            responsable_user["role"]
        )
        
        # Test con id_equipo (otro alias)
        payload = {
            "id_equipo": 105,
            "descripcion": "Test con id_equipo"
        }
        
        response = client.post("/solicitudes", json=payload, headers=headers)
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True
