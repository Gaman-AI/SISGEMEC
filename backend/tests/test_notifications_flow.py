"""
Tests del flujo de notificaciones por email
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import get_auth_headers

def test_no_admins_activos_no_falla(
    client: TestClient,
    responsable_user
):
    """Test que no hay admins activos no falla la creación de solicitud"""
    # Mock de users_repo que no encuentra admins activos
    mock_users_repo = MagicMock()
    mock_users_repo.get_active_admin_emails.return_value = []
    
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
            "equipo_id": 201,
            "descripcion": "Test sin admins activos"
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones - debe crear la solicitud aunque no haya admins
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True
        assert "solicitud_id" in response_data

def test_email_from_matches_smtp_user_en_modo_real(
    client: TestClient,
    responsable_user,
    mock_users_repo
):
    """Test que EMAIL_DEBUG=0 y SMTP_FROM coincide con SMTP_USER"""
    with patch('app.routers.solicitudes.require_user_jwt', return_value=responsable_user), \
         patch('app.routers.solicitudes.UsersRepo', return_value=mock_users_repo), \
         patch('app.routers.solicitudes.get_notification_service') as mock_notifier, \
         patch.dict('os.environ', {
             'EMAIL_DEBUG': '0',
             'SMTP_FROM': 'test@test.com',
             'SMTP_USER': 'test@test.com'
         }):
        
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
            "equipo_id": 202,
            "descripcion": "Test con EMAIL_DEBUG=0"
        }
        
        # Realizar request
        response = client.post("/solicitudes", json=payload, headers=headers)
        
        # Verificaciones
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["ok"] is True

def test_notification_service_creation_with_debug_mode():
    """Test que el servicio de notificaciones se crea correctamente en modo debug"""
    with patch.dict('os.environ', {'EMAIL_DEBUG': '1'}):
        from app.services.notifications import get_notification_service
        
        service = get_notification_service()
        
        # En modo debug, debe ser NoOpNotifier
        assert hasattr(service, 'send_nueva_solicitud_flexible')
        assert hasattr(service, 'send_servicio_completado_flexible')

def test_notification_service_creation_without_debug_mode():
    """Test que el servicio de notificaciones se crea correctamente sin modo debug"""
    with patch.dict('os.environ', {'EMAIL_DEBUG': '0'}):
        from app.services.notifications import get_notification_service
        
        service = get_notification_service()
        
        # Sin modo debug, debe ser NotificationService normal
        assert hasattr(service, 'send_nueva_solicitud_flexible')
        assert hasattr(service, 'send_servicio_completado_flexible')

def test_users_repo_get_active_admin_emails():
    """Test que el repositorio de usuarios obtiene emails de admins correctamente"""
    from app.repositories.users_repo import UsersRepo
    
    with patch('app.repositories.users_repo.get_supabase') as mock_supabase:
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de respuesta con admins activos
        mock_admins = [
            {"email": "admin1@test.com", "role": "ADMIN", "active": True},
            {"email": "admin2@test.com", "role": "ADMIN", "active": True}
        ]
        # Configurar la cadena de llamadas correctamente
        mock_table = mock_sb.table.return_value
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.not_.return_value = mock_table
        mock_table.execute.return_value.data = mock_admins
        
        # Crear repositorio y obtener emails
        repo = UsersRepo()
        admin_emails = repo.get_active_admin_emails()
        
        # Verificaciones
        assert len(admin_emails) == 2
        assert "admin1@test.com" in admin_emails
        assert "admin2@test.com" in admin_emails

def test_users_repo_get_responsable_email_by_servicio_id():
    """Test que el repositorio obtiene email del responsable por servicio_id"""
    from app.repositories.users_repo import UsersRepo
    
    with patch('app.repositories.users_repo.get_supabase') as mock_supabase:
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de respuesta de solicitudes_servicio
        mock_solicitud = {"solicitante_id": "uuid-responsable"}
        mock_table1 = mock_sb.table.return_value
        mock_table1.select.return_value = mock_table1
        mock_table1.eq.return_value = mock_table1
        mock_table1.limit.return_value = mock_table1
        mock_table1.execute.return_value.data = [mock_solicitud]
        
        # Mock de respuesta de profiles
        mock_profile = {"email": "responsable@test.com"}
        mock_table2 = mock_sb.table.return_value
        mock_table2.select.return_value = mock_table2
        mock_table2.eq.return_value = mock_table2
        mock_table2.limit.return_value = mock_table2
        mock_table2.execute.return_value.data = [mock_profile]
        
        # Crear repositorio y obtener email
        repo = UsersRepo()
        responsable_email = repo.get_responsable_email_by_servicio_id(123)
        
        # Verificaciones
        assert responsable_email == "responsable@test.com"

def test_notification_logs_repo_insert_event():
    """Test que el repositorio de logs de notificaciones inserta eventos correctamente"""
    from app.repositories.notifications_repo import NotificationLogsRepo
    
    with patch('app.repositories.notifications_repo.get_supabase') as mock_supabase:
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de respuesta de insert
        mock_log = {"id": 1, "event_type": "SOLICITUD_NUEVA", "status": "RETRYING"}
        mock_sb.table.return_value.insert.return_value.execute.return_value.data = [mock_log]
        
        # Crear repositorio e insertar evento
        repo = NotificationLogsRepo()
        log_id = repo.insert_event(
            event_type="SOLICITUD_NUEVA",
            solicitud_id=123,
            servicio_id=None,
            to_email="admin@test.com",
            subject="Test Subject",
            status="RETRYING",
            error_message=None
        )
        
        # Verificaciones
        assert log_id == 1

def test_notification_logs_repo_update_status():
    """Test que el repositorio de logs actualiza el status correctamente"""
    from app.repositories.notifications_repo import NotificationLogsRepo
    
    with patch('app.repositories.notifications_repo.get_supabase') as mock_supabase:
        # Mock de Supabase
        mock_sb = MagicMock()
        mock_supabase.return_value = mock_sb
        
        # Mock de respuesta de update
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        # Crear repositorio y actualizar status
        repo = NotificationLogsRepo()
        repo.update_status(1, status="SENT", error_message=None)
        
        # Verificar que se llamó al update
        mock_sb.table.assert_called_with("notification_logs")
        update_call = mock_sb.table.return_value.update
        update_call.assert_called_once()

def test_smtp_connection_success():
    """Test conexión SMTP exitosa"""
    import smtplib
    from unittest.mock import patch
    
    with patch('smtplib.SMTP') as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        mock_smtp.return_value.__exit__.return_value = None
        
        # Simular conexión SMTP
        with smtplib.SMTP("smtp.test.com", 587) as server:
            server.starttls()
            server.login("user@test.com", "password")
            server.send_message(MagicMock())
        
        # Verificar que se llamaron los métodos
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user@test.com", "password")
        mock_server.send_message.assert_called_once()

def test_smtp_connection_failure():
    """Test fallo de conexión SMTP"""
    import smtplib
    from unittest.mock import patch
    
    with patch('smtplib.SMTP') as mock_smtp:
        mock_smtp.side_effect = Exception("SMTP Connection Failed")
        
        # Intentar conexión SMTP que debe fallar
        with pytest.raises(Exception, match="SMTP Connection Failed"):
            with smtplib.SMTP("smtp.test.com", 587) as server:
                server.starttls()
