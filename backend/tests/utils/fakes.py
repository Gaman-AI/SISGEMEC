"""
Utilidades y dobles de prueba para SISGEMEC 2.0
"""
import uuid
from typing import Dict, Any, List, Optional
from unittest.mock import MagicMock, patch

class FakeSupabaseClient:
    """Cliente fake de Supabase para testing"""
    
    def __init__(self):
        self.inserted_records = []
        self.updated_records = []
        self.selected_records = []
    
    def table(self, table_name: str):
        return FakeTable(table_name, self)

class FakeTable:
    """Tabla fake de Supabase para testing"""
    
    def __init__(self, table_name: str, client: FakeSupabaseClient):
        self.table_name = table_name
        self.client = client
        self._select_fields = "*"
        self._where_conditions = []
        self._limit_value = None
        self._range_values = None
    
    def select(self, fields: str = "*"):
        self._select_fields = fields
        return self
    
    def insert(self, data: Dict[str, Any]):
        return FakeInsert(data, self.table_name, self.client)
    
    def update(self, data: Dict[str, Any]):
        return FakeUpdate(data, self.table_name, self.client)
    
    def eq(self, field: str, value: Any):
        self._where_conditions.append(("eq", field, value))
        return self
    
    def limit(self, count: int):
        self._limit_value = count
        return self
    
    def range(self, from_idx: int, to_idx: int):
        self._range_values = (from_idx, to_idx)
        return self
    
    def execute(self):
        # Simular respuesta de select
        if self.table_name == "solicitudes_servicio":
            return self._mock_solicitudes_response()
        elif self.table_name == "servicios":
            return self._mock_servicios_response()
        elif self.table_name == "profiles":
            return self._mock_profiles_response()
        elif self.table_name == "estados_servicio":
            return self._mock_estados_response()
        elif self.table_name == "notification_logs":
            return self._mock_notification_logs_response()
        else:
            return MagicMock(data=[], count=0)
    
    def _mock_solicitudes_response(self):
        # Simular respuesta de solicitudes_servicio
        mock_data = [{
            "solicitud_id": 123,
            "equipo_id": 101,
            "solicitante_id": str(uuid.uuid4()),
            "descripcion": "Test solicitud",
            "estado_solicitud_id": 1,
            "created_at": "2025-01-10T10:00:00Z"
        }]
        return MagicMock(data=mock_data, count=1)
    
    def _mock_servicios_response(self):
        # Simular respuesta de servicios
        mock_data = [{
            "servicio_id": 456,
            "equipo_id": 101,
            "descripcion": "Test servicio",
            "estado_servicio_id": 2,
            "tecnico_id": str(uuid.uuid4())
        }]
        return MagicMock(data=mock_data, count=1)
    
    def _mock_profiles_response(self):
        # Simular respuesta de profiles
        mock_data = [
            {
                "user_id": str(uuid.uuid4()),
                "email": "admin1@test.com",
                "full_name": "Admin 1",
                "role": "ADMIN",
                "active": True
            },
            {
                "user_id": str(uuid.uuid4()),
                "email": "admin2@test.com",
                "full_name": "Admin 2",
                "role": "ADMIN",
                "active": True
            }
        ]
        return MagicMock(data=mock_data, count=2)
    
    def _mock_estados_response(self):
        # Simular respuesta de estados_servicio
        mock_data = [{
            "estado_servicio_id": 3,
            "nombre": "COMPLETADO"
        }]
        return MagicMock(data=mock_data, count=1)
    
    def _mock_notification_logs_response(self):
        # Simular respuesta de notification_logs
        mock_data = [{
            "id": 1,
            "event_type": "SOLICITUD_NUEVA",
            "solicitud_id": 123,
            "to_email": "admin@test.com",
            "status": "SENT",
            "created_at": "2025-01-10T10:00:00Z"
        }]
        return MagicMock(data=mock_data, count=1)

class FakeInsert:
    """Operación fake de insert"""
    
    def __init__(self, data: Dict[str, Any], table_name: str, client: FakeSupabaseClient):
        self.data = data
        self.table_name = table_name
        self.client = client
    
    def execute(self):
        # Simular insert exitoso
        record = self.data.copy()
        if "solicitud_id" not in record:
            record["solicitud_id"] = 123
        if "servicio_id" not in record:
            record["servicio_id"] = 456
        
        self.client.inserted_records.append({
            "table": self.table_name,
            "data": record
        })
        
        return MagicMock(data=[record], count=1)

class FakeUpdate:
    """Operación fake de update"""
    
    def __init__(self, data: Dict[str, Any], table_name: str, client: FakeSupabaseClient):
        self.data = data
        self.table_name = table_name
        self.client = client
        self._where_conditions = []
    
    def eq(self, field: str, value: Any):
        self._where_conditions.append(("eq", field, value))
        return self
    
    def execute(self):
        # Simular update exitoso
        self.client.updated_records.append({
            "table": self.table_name,
            "data": self.data,
            "conditions": self._where_conditions
        })
        
        return MagicMock(data=[self.data], count=1)

class FakeSMTP:
    """Servidor SMTP fake para testing"""
    
    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail
        self.sent_emails = []
        self.failed_emails = []
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def starttls(self, context=None):
        if self.should_fail:
            raise Exception("SMTP TLS Failed")
    
    def login(self, user: str, password: str):
        if self.should_fail:
            raise Exception("SMTP Login Failed")
    
    def send_message(self, msg):
        if self.should_fail:
            self.failed_emails.append({
                "to": msg["To"],
                "subject": msg["Subject"],
                "error": "SMTP Send Failed"
            })
            raise Exception("SMTP Send Failed")
        else:
            self.sent_emails.append({
                "to": msg["To"],
                "subject": msg["Subject"],
                "from": msg["From"]
            })

def create_fake_notification_log(event_type: str, to_email: str, status: str, 
                                solicitud_id: Optional[int] = None, 
                                servicio_id: Optional[int] = None) -> Dict[str, Any]:
    """Crear log fake de notificación"""
    return {
        "id": uuid.uuid4().int % 10000,
        "event_type": event_type,
        "solicitud_id": solicitud_id,
        "servicio_id": servicio_id,
        "to_email": to_email,
        "subject": f"Test {event_type}",
        "status": status,
        "error_message": None if status == "SENT" else "Test error",
        "created_at": "2025-01-10T10:00:00Z"
    }

def mock_supabase_client():
    """Crear mock del cliente de Supabase"""
    return FakeSupabaseClient()

def mock_smtp_server(should_fail: bool = False):
    """Crear mock del servidor SMTP"""
    return FakeSMTP(should_fail)
