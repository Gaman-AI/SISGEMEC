"""
Tests de CORS y preflight OPTIONS para SISGEMEC 2.0
"""
import pytest
from fastapi.testclient import TestClient

def test_cors_preflight_options_root(client: TestClient):
    """Test OPTIONS / → 204 + headers CORS correctos"""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type"
        }
    )
    
    assert response.status_code == 204
    
    # Verificar headers CORS
    headers = response.headers
    assert "access-control-allow-origin" in headers
    assert "http://localhost:5173" in headers["access-control-allow-origin"]
    assert "access-control-allow-credentials" in headers
    assert headers["access-control-allow-credentials"] == "true"
    assert "access-control-allow-headers" in headers
    assert "Authorization" in headers["access-control-allow-headers"]
    assert "Content-Type" in headers["access-control-allow-headers"]
    assert "access-control-allow-methods" in headers
    # Verificar que incluye los métodos necesarios
    methods = headers["access-control-allow-methods"]
    assert "GET" in methods
    assert "POST" in methods
    assert "PUT" in methods
    assert "OPTIONS" in methods

def test_cors_preflight_endpoint_con_auth(client: TestClient):
    """Test OPTIONS /solicitudes → 204, NO debe pasar por auth"""
    response = client.options(
        "/solicitudes",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type"
        }
    )
    
    # OPTIONS debe responder 204 sin pasar por autenticación
    assert response.status_code == 204
    
    # Verificar headers CORS
    headers = response.headers
    assert "access-control-allow-origin" in headers
    assert "access-control-allow-credentials" in headers
    assert "access-control-allow-headers" in headers
    assert "access-control-allow-methods" in headers

def test_cors_preflight_servicios_endpoint(client: TestClient):
    """Test OPTIONS /servicios/{id}/complete → 204"""
    response = client.options(
        "/servicios/123/complete",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "Authorization, Content-Type"
        }
    )
    
    assert response.status_code == 204
    
    # Verificar headers CORS
    headers = response.headers
    assert "access-control-allow-origin" in headers
    assert "access-control-allow-credentials" in headers

def test_cors_actual_request_headers(client: TestClient):
    """Test que requests reales incluyen headers CORS"""
    response = client.get("/health")
    
    assert response.status_code == 200
    
    # Verificar headers CORS en respuesta
    headers = response.headers
    assert "access-control-allow-origin" in headers
    assert "access-control-allow-credentials" in headers
    assert headers["access-control-allow-credentials"] == "true"

def test_cors_multiple_origins(client: TestClient):
    """Test CORS con múltiples orígenes permitidos"""
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
    
    for origin in origins:
        response = client.options(
            "/solicitudes",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type"
            }
        )
        
        assert response.status_code == 204
        headers = response.headers
        assert "access-control-allow-origin" in headers
        # El origen debe estar permitido (exacto o wildcard)
        allowed_origin = headers["access-control-allow-origin"]
        assert origin in allowed_origin or "*" in allowed_origin
