"""
Servicio de importación de usuarios desde Excel
"""
import pandas as pd
import io
from typing import Dict, List, Optional, Any
from unidecode import unidecode
import re
import logging
from uuid import uuid4

from app.config import settings
from app.deps.supabase_client import supa_service

logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """Normaliza texto: lower, strip, elimina tildes, espacios extra"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', unidecode(str(text).strip().lower()))

class UserImportService:
    def __init__(self):
        self.supabase = supa_service()
        self.total_filas_excel = 0
        self.perfiles_procesados = 0
        self.perfiles_creados = 0
        self.perfiles_actualizados = 0
        self.errores: List[Dict[str, Any]] = []
    
    def _normalize_email(self, email: str) -> str:
        """Normaliza email: lower y strip"""
        if not email:
            return ""
        return str(email).lower().strip()
    
    def _find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca usuario en auth.users por email"""
        try:
            # Usar Admin API para buscar usuarios
            response = self.supabase.auth.admin.list_users()
            for user in response:
                if user.email == email:
                    return user
            return None
        except Exception as e:
            logger.error(f"Error buscando usuario por email {email}: {e}")
            return None
    
    def _create_auth_user(self, email: str, full_name: str) -> Optional[str]:
        """Crea usuario en auth.users usando Admin API"""
        try:
            user_data = {
                "email": email,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "source": "excel_import"
                }
            }
            
            response = self.supabase.auth.admin.create_user(user_data)
            if response.user:
                logger.info(f"Usuario creado en auth.users: {email}")
                return response.user.id
            return None
            
        except Exception as e:
            logger.error(f"Error creando usuario en auth.users para {email}: {e}")
            return None
    
    def _find_profile_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca profile por email"""
        try:
            response = self.supabase.table("profiles").select("*").eq("email", email).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error buscando profile por email {email}: {e}")
            return None
    
    def _upsert_profile(self, user_id: str, email: str, full_name: str, 
                       department: str = None, phone: str = None, location: str = None) -> bool:
        """Upsert profile por email"""
        try:
            profile_data = {
                "user_id": user_id,
                "email": email,
                "full_name": full_name,
                "role": "RESPONSABLE",
                "active": True
            }
            
            # Agregar campos opcionales si existen
            if department:
                profile_data["department"] = department
            if phone:
                profile_data["phone"] = phone
            if location:
                profile_data["location"] = location
            
            # Verificar si existe
            existing = self._find_profile_by_email(email)
            
            if existing:
                # Update
                self.supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
                self.perfiles_actualizados += 1
                logger.info(f"Profile actualizado: {email}")
            else:
                # Insert
                self.supabase.table("profiles").insert(profile_data).execute()
                self.perfiles_creados += 1
                logger.info(f"Profile creado: {email}")
            
            self.perfiles_procesados += 1
            return True
            
        except Exception as e:
            logger.error(f"Error upserting profile para {email}: {e}")
            return False
    
    def _get_column_value(self, row: pd.Series, column_name: str, df_headers: List[str]) -> Optional[str]:
        """Obtiene valor de columna por nombre normalizado"""
        target_norm = normalize_text(column_name)
        for i, header in enumerate(df_headers):
            if normalize_text(header) == target_norm:
                value = row.iloc[i]
                return str(value).strip() if pd.notna(value) else None
        return None
    
    def process(self, file_bytes: bytes) -> Dict[str, Any]:
        """Procesa archivo Excel y devuelve resultado"""
        try:
            # Leer workbook
            xls = pd.ExcelFile(io.BytesIO(file_bytes))
            
            # Buscar hoja "Usuarios"
            df_usuarios = None
            for sheet_name in xls.sheet_names:
                if normalize_text(sheet_name) == normalize_text("Usuarios"):
                    df_usuarios = pd.read_excel(xls, sheet_name)
                    break
            
            # Validar hoja de usuarios
            if df_usuarios is None:
                self.errores.append({"fila": "-", "mensaje": "Hoja 'Usuarios' no encontrada"})
                return self._build_result()
            
            # Validar encabezados requeridos
            required_headers = ["First Name", "Last Name", "Email Address"]
            df_headers = list(df_usuarios.columns)
            
            missing_headers = []
            for req_header in required_headers:
                found = False
                for col in df_headers:
                    if normalize_text(col) == normalize_text(req_header):
                        found = True
                        break
                if not found:
                    missing_headers.append(req_header)
            
            if missing_headers:
                self.errores.append({"fila": "-", "mensaje": f"Columnas faltantes: {', '.join(missing_headers)}"})
                return self._build_result()
            
            # Procesar filas de usuarios
            for idx, row in df_usuarios.iterrows():
                # Saltar filas vacías
                if row.isna().all():
                    continue
                
                fila_num = idx + 2  # +2 por header y 1-indexing
                self.total_filas_excel += 1
                
                # Obtener datos requeridos
                first_name = self._get_column_value(row, "First Name", df_headers)
                last_name = self._get_column_value(row, "Last Name", df_headers)
                email = self._get_column_value(row, "Email Address", df_headers)
                
                # Validar campos requeridos
                if not first_name:
                    self.errores.append({"fila": fila_num, "mensaje": "First Name es requerido"})
                    continue
                
                if not last_name:
                    self.errores.append({"fila": fila_num, "mensaje": "Last Name es requerido"})
                    continue
                
                if not email:
                    self.errores.append({"fila": fila_num, "mensaje": "Email Address es requerido"})
                    continue
                
                # Normalizar datos
                email = self._normalize_email(email)
                full_name = f"{first_name} {last_name}"
                
                # Obtener campos opcionales
                department = self._get_column_value(row, "Department", df_headers)
                phone = self._get_column_value(row, "Phone", df_headers)
                location = self._get_column_value(row, "Location", df_headers)
                
                # Buscar o crear usuario en auth.users
                user = self._find_user_by_email(email)
                if user:
                    user_id = user.id
                else:
                    user_id = self._create_auth_user(email, full_name)
                    if not user_id:
                        self.errores.append({"fila": fila_num, "mensaje": f"Error creando usuario en auth.users para {email}"})
                        continue
                
                # Upsert profile
                if not self._upsert_profile(user_id, email, full_name, department, phone, location):
                    self.errores.append({"fila": fila_num, "mensaje": f"Error procesando profile para {email}"})
            
            return self._build_result()
                
        except Exception as e:
            logger.error(f"Error procesando Excel de usuarios: {e}", exc_info=True)
            self.errores.append({"fila": "-", "mensaje": f"Error procesando Excel: {str(e)}"})
            return self._build_result()
    
    def _build_result(self) -> Dict[str, Any]:
        """Construye resultado final"""
        return {
            "ok": len(self.errores) == 0,
            "total_filas_excel": self.total_filas_excel,
            "perfiles_procesados": self.perfiles_procesados,
            "perfiles_creados": self.perfiles_creados,
            "perfiles_actualizados": self.perfiles_actualizados,
            "errores": self.errores
        }
