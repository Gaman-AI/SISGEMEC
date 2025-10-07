#!/usr/bin/env python3
"""
Script de pruebas end-to-end para el sistema de notificaciones por correo.
Ejecutar: python test_email_system.py
"""
import os
import sys
import requests
import json
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_smtp_connection():
    """Prueba la conexión SMTP"""
    print("🔌 Probando conexión SMTP...")
    try:
        response = requests.get("http://localhost:8000/debug/smtp-login")
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                print(f"✅ SMTP OK - Modo: {data.get('mode')}")
                return True
            else:
                print(f"❌ SMTP Error: {data.get('error')}")
                return False
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return False

def test_email_config():
    """Prueba la configuración de email"""
    print("⚙️ Verificando configuración de email...")
    try:
        response = requests.get("http://localhost:8000/debug/email-config")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Host: {data.get('host')}:{data.get('port')}")
            print(f"✅ User: {data.get('user')}")
            print(f"✅ From: {data.get('from_email')}")
            print(f"✅ TLS: {data.get('use_tls')}")
            print(f"✅ Has Password: {data.get('has_password')}")
            return True
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_smoke_email():
    """Prueba el envío de un email de smoke test"""
    print("💨 Ejecutando smoke test de email...")
    try:
        response = requests.get("http://localhost:8000/debug/send-smoke")
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                print(f"✅ Smoke test OK - Enviado a: {data.get('sent_to')}")
                print(f"   Mensaje: {data.get('message')}")
                return True
            else:
                print(f"❌ Smoke test Error: {data.get('error')}")
                return False
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_server_running():
    """Verifica que el servidor esté corriendo"""
    print("🚀 Verificando que el servidor esté corriendo...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servidor corriendo en http://localhost:8000")
            return True
        else:
            print(f"❌ Servidor respondió con status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Servidor no disponible: {e}")
        print("💡 Asegúrate de ejecutar: uvicorn app.main:app --reload")
        return False

def main():
    """Función principal de pruebas"""
    print("🧪 PRUEBAS END-TO-END - Sistema de Notificaciones por Correo")
    print("=" * 60)
    
    tests = [
        ("Servidor", test_server_running),
        ("Configuración Email", test_email_config),
        ("Conexión SMTP", test_smtp_connection),
        ("Smoke Test Email", test_smoke_email),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error inesperado en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS:")
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} pruebas pasaron")
    
    if passed == len(results):
        print("🎉 ¡Todas las pruebas pasaron! El sistema de emails está funcionando.")
        print("\n📝 Próximos pasos:")
        print("   1. Crear un servicio como RESPONSABLE")
        print("   2. Completar el servicio como ADMIN")
        print("   3. Verificar que lleguen los correos")
        print("   4. Revisar logs: python check_email_logs.py")
    else:
        print("⚠️ Algunas pruebas fallaron. Revisa la configuración.")
        print("\n🔧 Checklist:")
        print("   - ¿Está corriendo el servidor? (uvicorn app.main:app --reload)")
        print("   - ¿Está configurado SMTP_PASS en env.local?")
        print("   - ¿Existe la tabla notification_logs? (ejecutar migración SQL)")
        print("   - ¿Está configurado ADMIN_EMAIL en env.local?")

if __name__ == "__main__":
    main()
