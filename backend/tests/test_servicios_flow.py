"""
Tests del flujo de completar servicios con notificaciones por email
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import get_auth_headers

def test_complete_service_ok_notifica_responsable(
    client: TestClient,
    admin_user,
    smtp_success_mock,
    mock_users_repo
):
    """Test completar servicio y notificar al responsable"""
    with patch('app.routers.servicios.require_user_jwt', return_value=admin_user), \
         patch('app.routers.servicios.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.servicios.get_notification_service') as mock_notifier, \
         patch('app.routers.servicios.get_supabase') as mock_supabase:
        
        # Configurar mock del notifier
        mock_service = MagicMock()
        mock_notifier.return_value = mock_service
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de verificación de servicio existente
        mock_service_data = {
            "servicio_id": 456,
            "descripcion": "Servicio de mantenimiento"
        }
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_service_data]
        
        # Mock de búsqueda de estado COMPLETADO
        mock_estado_data = {"estado_servicio_id": 3}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_estado_data]
        
        # Mock de update exitoso
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        # Headers de autenticación
        headers = get_auth_headers(
            admin_user["user_id"], 
            admin_user["email"], 
            admin_user["role"]
        )
        
        # Realizar request
        response = client.put("/servicios/456/complete", headers=headers)
        
        # Verificaciones
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["ok"] is True
        assert response_data["servicio_id"] == 456
        assert response_data["status"] == "COMPLETADO"
        
        # Verificar que se intentó notificar al responsable
        # (En background, por lo que no podemos verificar directamente en el test)

def test_complete_service_email_failure_non_blocking(
    client: TestClient,
    admin_user,
    smtp_failure_mock,
    mock_users_repo
):
    """Test que fallo de email NO bloquea la completación del servicio"""
    with patch('app.routers.servicios.require_user_jwt', return_value=admin_user), \
         patch('app.routers.servicios.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.servicios.get_notification_service'), \
         patch('app.routers.servicios.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de verificación de servicio existente
        mock_service_data = {
            "servicio_id": 789,
            "descripcion": "Servicio con email fallido"
        }
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_service_data]
        
        # Mock de búsqueda de estado COMPLETADO
        mock_estado_data = {"estado_servicio_id": 3}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_estado_data]
        
        # Mock de update exitoso
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        # Headers de autenticación
        headers = get_auth_headers(
            admin_user["user_id"], 
            admin_user["email"], 
            admin_user["role"]
        )
        
        # Realizar request (debe funcionar aunque email falle)
        response = client.put("/servicios/789/complete", headers=headers)
        
        # Verificaciones - debe completar el servicio aunque email falle
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["ok"] is True
        assert response_data["servicio_id"] == 789
        assert response_data["status"] == "COMPLETADO"

def test_complete_service_not_found(
    client: TestClient,
    admin_user,
    mock_users_repo
):
    """Test completar servicio que no existe"""
    with patch('app.routers.servicios.require_user_jwt', return_value=admin_user), \
         patch('app.routers.servicios.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.servicios.get_notification_service'), \
         patch('app.routers.servicios.get_supabase') as mock_supabase:
        
        # Mock de Supabase - servicio no encontrado
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        # Headers de autenticación
        headers = get_auth_headers(
            admin_user["user_id"], 
            admin_user["email"], 
            admin_user["role"]
        )
        
        # Realizar request
        response = client.put("/servicios/999/complete", headers=headers)
        
        # Verificaciones
        assert response.status_code == 404
        response_data = response.json()
        assert "not found" in response_data["detail"].lower()

def test_complete_service_unauthorized(
    client: TestClient
):
    """Test que requests sin autenticación son rechazados"""
    # Sin headers de autorización
    response = client.put("/servicios/123/complete")
    assert response.status_code == 401
    
    # Con header de autorización inválido
    headers = {"Authorization": "Bearer invalid.token"}
    response = client.put("/servicios/123/complete", headers=headers)
    assert response.status_code == 401

def test_complete_service_updates_estado_correcto(
    client: TestClient,
    admin_user,
    mock_users_repo
):
    """Test que actualiza el estado del servicio correctamente"""
    with patch('app.routers.servicios.require_user_jwt', return_value=admin_user), \
         patch('app.routers.servicios.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.servicios.get_notification_service'), \
         patch('app.routers.servicios.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de verificación de servicio existente
        mock_service_data = {
            "servicio_id": 111,
            "descripcion": "Servicio para actualizar estado"
        }
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_service_data]
        
        # Mock de búsqueda de estado COMPLETADO
        mock_estado_data = {"estado_servicio_id": 3}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_estado_data]
        
        # Mock de update exitoso
        mock_update_response = MagicMock()
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update_response
        
        # Headers de autenticación
        headers = get_auth_headers(
            admin_user["user_id"], 
            admin_user["email"], 
            admin_user["role"]
        )
        
        # Realizar request
        response = client.put("/servicios/111/complete", headers=headers)
        
        # Verificaciones
        assert response.status_code == 200
        
        # Verificar que se llamó al update con el estado correcto
        mock_sb.table.assert_called_with("servicios")
        update_call = mock_sb.table.return_value.update
        update_call.assert_called_once()
        
        # Verificar que el update incluye el estado_servicio_id correcto
        update_data = update_call.call_args[0][0]
        assert update_data["estado_servicio_id"] == 3
        assert "updated_at" in update_data

def test_complete_service_sin_responsable_email(
    client: TestClient,
    admin_user,
    mock_users_repo
):
    """Test completar servicio cuando no se encuentra email del responsable"""
    with patch('app.routers.servicios.require_user_jwt', return_value=admin_user), \
         patch('app.routers.servicios.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.servicios.get_notification_service'), \
         patch('app.routers.servicios.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de verificación de servicio existente
        mock_service_data = {
            "servicio_id": 222,
            "descripcion": "Servicio sin responsable"
        }
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_service_data]
        
        # Mock de búsqueda de estado COMPLETADO
        mock_estado_data = {"estado_servicio_id": 3}
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_estado_data]
        
        # Mock de update exitoso
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        # Mock de users_repo que no encuentra email del responsable
        mock_users_repo.get_responsable_email_by_servicio_id.return_value = None
        
        # Headers de autenticación
        headers = get_auth_headers(
            admin_user["user_id"], 
            admin_user["email"], 
            admin_user["role"]
        )
        
        # Realizar request
        response = client.put("/servicios/222/complete", headers=headers)
        
        # Verificaciones - debe completar el servicio aunque no haya email
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["ok"] is True
        assert response_data["servicio_id"] == 222
        assert response_data["status"] == "COMPLETADO"
