#!/usr/bin/env python3
"""
Script para verificar los logs de notificaciones por correo.
Ejecutar: python check_email_logs.py
"""
import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.deps.supabase_client import supa_service

def check_notification_logs():
    """Verifica los logs de notificaciones en la base de datos"""
    try:
        supabase = supa_service()
        
        # Consultar los últimos 20 logs
        response = supabase.table("notification_logs").select(
            "id, event_type, status, to_email, subject, error_message, created_at"
        ).order("id", desc=True).limit(20).execute()
        
        if response.data:
            print("📧 Últimos 20 logs de notificaciones:")
            print("=" * 80)
            for log in response.data:
                status_emoji = "✅" if log["status"] == "SENT" else "❌" if log["status"] == "FAILED" else "⏳"
                error_msg = f" | Error: {log['error_message']}" if log["error_message"] else ""
                print(f"{status_emoji} ID:{log['id']} | {log['event_type']} | {log['status']} | {log['to_email']}{error_msg}")
                print(f"   Subject: {log['subject']}")
                print(f"   Created: {log['created_at']}")
                print("-" * 80)
        else:
            print("📭 No hay logs de notificaciones en la base de datos")
            
        # Estadísticas
        stats_response = supabase.table("notification_logs").select("status").execute()
        if stats_response.data:
            stats = {}
            for log in stats_response.data:
                status = log["status"]
                stats[status] = stats.get(status, 0) + 1
            
            print("\n📊 Estadísticas:")
            for status, count in stats.items():
                emoji = "✅" if status == "SENT" else "❌" if status == "FAILED" else "⏳"
                print(f"   {emoji} {status}: {count}")
        
    except Exception as e:
        print(f"❌ Error consultando logs: {e}")
        return False
    
    return True

def check_table_exists():
    """Verifica que la tabla notification_logs existe"""
    try:
        supabase = supa_service()
        
        # Intentar consultar la tabla
        response = supabase.table("notification_logs").select("id").limit(1).execute()
        print("✅ Tabla 'notification_logs' existe y es accesible")
        return True
        
    except Exception as e:
        print(f"❌ Error accediendo a tabla 'notification_logs': {e}")
        print("💡 Asegúrate de ejecutar la migración SQL:")
        print("   backend/db/migrations/001_create_notification_logs.sql")
        return False

if __name__ == "__main__":
    print("🔍 Verificando sistema de notificaciones por correo...")
    print()
    
    # Verificar que la tabla existe
    if not check_table_exists():
        sys.exit(1)
    
    print()
    
    # Verificar logs
    check_notification_logs()
    
    print("\n✨ Verificación completada")
