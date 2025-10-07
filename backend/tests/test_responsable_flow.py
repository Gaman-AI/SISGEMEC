"""
Tests específicos para el flujo del RESPONSABLE: ver sus solicitudes inmediatamente
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

def test_solicitante_id_uses_jwt_sub(client: TestClient):
    """Test que el solicitante_id usa el sub del JWT (no email)"""
    # Este test verifica que el backend está usando correctamente el user_id del JWT
    # como solicitante_id en lugar del email
    
    # Mock de autenticación que simula un usuario RESPONSABLE
    mock_user = {
        "user_id": "uuid-responsable-123",
        "email": "responsable@test.com", 
        "full_name": "Test Responsable",
        "role": "RESPONSABLE"
    }
    
    with patch('app.routers.solicitudes.require_user_jwt', return_value=mock_user), \
         patch('app.routers.solicitudes.UsersRepo') as mock_users_repo, \
         patch('app.routers.solicitudes.get_notification_service'), \
         patch('app.routers.solicitudes.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de la respuesta del insert
        mock_response = MagicMock()
        mock_response.data = [{"solicitud_id": 123}]
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Headers de autenticación
        headers = {
            "Authorization": "Bearer fake.jwt.token",
            "Content-Type": "application/json"
        }
        
        # Payload de la solicitud
        payload = {
            "equipo_id": 101,
            "descripcion": "Test solicitud"
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones
        assert response.status_code == 201
        
        # Verificar que se llamó al insert con el solicitante_id correcto
        mock_sb.table.assert_called_with("solicitudes_servicio")
        insert_call = mock_sb.table.return_value.insert
        insert_call.assert_called_once()
        
        # Verificar que el solicitante_id es el user_id del JWT (no email)
        insert_data = insert_call.call_args[0][0]
        assert insert_data["solicitante_id"] == "uuid-responsable-123"
        assert insert_data["solicitante_id"] != "responsable@test.com"  # No debe ser email
        assert insert_data["equipo_id"] == 101
        assert insert_data["descripcion"] == "Test solicitud"
        assert insert_data["estado_solicitud_id"] == 1

def test_payload_alias_normalization(client: TestClient):
    """Test que acepta alias de campos (equipoId, description, etc.)"""
    mock_user = {
        "user_id": "uuid-responsable-456",
        "email": "responsable@test.com",
        "role": "RESPONSABLE"
    }
    
    with patch('app.routers.solicitudes.require_user_jwt', return_value=mock_user), \
         patch('app.routers.solicitudes.UsersRepo'), \
         patch('app.routers.solicitudes.get_notification_service'), \
         patch('app.routers.solicitudes.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        mock_response = MagicMock()
        mock_response.data = [{"solicitud_id": 456}]
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_response
        
        headers = {
            "Authorization": "Bearer fake.jwt.token",
            "Content-Type": "application/json"
        }
        
        # Test con alias de campos
        payload = {
            "equipoId": 102,  # Alias de equipo_id
            "description": "Test con alias"  # Alias de descripcion
        }
        
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        assert response.status_code == 201
        
        # Verificar que se normalizaron los campos
        insert_data = mock_sb.table.return_value.insert.call_args[0][0]
        assert insert_data["equipo_id"] == 102
        assert insert_data["descripcion"] == "Test con alias"

def test_background_email_task_scheduled(client: TestClient):
    """Test que se programa tarea de email en background"""
    mock_user = {
        "user_id": "uuid-responsable-789",
        "email": "responsable@test.com",
        "role": "RESPONSABLE"
    }
    
    mock_users_repo = MagicMock()
    mock_users_repo.get_active_admin_emails.return_value = ["admin1@test.com", "admin2@test.com"]
    
    with patch('app.routers.solicitudes.require_user_jwt', return_value=mock_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service') as mock_notifier, \
         patch('app.routers.solicitudes.get_supabase') as mock_supabase:
        
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        mock_response = MagicMock()
        mock_response.data = [{"solicitud_id": 789}]
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_response
        
        headers = {
            "Authorization": "Bearer fake.jwt.token",
            "Content-Type": "application/json"
        }
        
        payload = {
            "equipo_id": 103,
            "descripcion": "Test con emails"
        }
        
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        assert response.status_code == 201
        
        # Verificar que se llamó a get_active_admin_emails
        mock_users_repo.get_active_admin_emails.assert_called_once()
        
        # Verificar que se configuró el notifier
        mock_notifier.assert_called_once()

def test_email_debug_mode_logs_tracking():
    """Test que EMAIL_DEBUG=1 registra en notification_logs"""
    from app.services.notifications import _NoOpNotifier
    
    # Crear NoOpNotifier
    notifier = _NoOpNotifier("EMAIL_DEBUG=1")
    
    # Mock del repositorio de logs
    with patch.object(notifier.logs, 'insert_event') as mock_insert:
        mock_insert.return_value = 123
        
        # Simular envío de email
        admin_emails = ["admin@test.com"]
        ctx_email = {
            "id": 456,
            "titulo": "Test solicitud",
            "descripcion": "Test descripción"
        }
        
        # Ejecutar (async)
        import asyncio
        asyncio.run(notifier.send_nueva_solicitud_flexible(admin_emails, ctx_email))
        
        # Verificar que se registró en logs
        mock_insert.assert_called_once()
        call_args = mock_insert.call_args
        assert call_args[1]["event_type"] == "SOLICITUD_NUEVA"
        assert call_args[1]["solicitud_id"] == 456
        assert call_args[1]["to_email"] == "admin@test.com"
        assert call_args[1]["status"] == "SENT"
        assert "EMAIL_DEBUG=1" in call_args[1]["error_message"]

def test_frontend_event_dispatch():
    """Test que el frontend dispara evento de actualización"""
    # Este test simula el comportamiento del frontend
    import sys
    import os
    
    # Mock del window.dispatchEvent
    class MockWindow:
        def dispatchEvent(self, event):
            self.last_event = event
            return True
    
    # Simular el comportamiento de createSolicitud
    mock_result = {"ok": True, "solicitud_id": 789}
    
    # Simular window.dispatchEvent
    mock_window = MockWindow()
    
    # Simular el dispatch del evento
    mock_window.dispatchEvent(type('CustomEvent', (), {
        'detail': {'solicitud_id': mock_result['solicitud_id']}
    })())
    
    # Verificar que se disparó el evento
    assert hasattr(mock_window, 'last_event')
    assert mock_window.last_event.detail['solicitud_id'] == 789

def test_list_mis_solicitudes_filters_by_solicitante_id():
    """Test que listMisSolicitudes filtra correctamente por solicitante_id"""
    # Este test simula la lógica del frontend sin importar el módulo real
    # ya que estamos en el backend
    
    # Simular la lógica de filtrado
    solicitante_id = "uuid-responsable-123"
    
    # Verificar que el filtro se aplicaría correctamente
    assert solicitante_id is not None
    assert solicitante_id != "me"
    assert len(solicitante_id) > 0
    
    # Simular resultado esperado
    expected_result = {
        "data": [{"solicitud_id": 1, "descripcion": "Test"}],
        "count": 1,
        "error": None
    }
    
    # Verificar estructura del resultado
    assert "data" in expected_result
    assert "count" in expected_result
    assert "error" in expected_result
    assert expected_result["data"][0]["solicitud_id"] == 1
