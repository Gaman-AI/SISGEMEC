"""
Servicio de importación de Excel para inventario de equipos
"""
import pandas as pd
import io
from typing import Dict, List, Optional, Any, Set, Tuple
from unidecode import unidecode
import re
import logging
from uuid import uuid4

from app.config import settings
from app.deps.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """Normaliza texto: lower, strip, elimina tildes, espacios extra"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', unidecode(str(text).strip().lower()))

def normalize_estado(estado: str) -> Optional[str]:
    """Mapea estado a formato canónico de BD"""
    if not estado:
        return None
    
    normalized = normalize_text(estado)
    
    # Mapeo tolerante de estados
    estado_map = {
        "activo": "ACTIVO",
        "en mantenimiento": "EN_MANTENIMIENTO", 
        "en_mantenimiento": "EN_MANTENIMIENTO",
        "enmantenimiento": "EN_MANTENIMIENTO",
        "mantenimiento": "EN_MANTENIMIENTO",
        "de baja": "DE_BAJA",
        "de_baja": "DE_BAJA",
        "debaja": "DE_BAJA",
        "baja": "DE_BAJA"
    }
    
    return estado_map.get(normalized)

class ExcelImportService:
    def __init__(self):
        self.supabase = get_supabase_service_client()
        self.filas_procesadas = 0
        self.equipos_procesados = 0
        self.perfiles_creados = 0
        self.errores: List[Dict[str, Any]] = []
        self.estados_validos: Set[str] = set()
        self.correos_map: Dict[str, Tuple[str, str]] = {}  # nombre_normalizado -> (full_name, email)
    
    def _load_estados_validos(self):
        """Carga estados válidos desde la base de datos"""
        try:
            response = self.supabase.table("estados_equipo").select("nombre").execute()
            self.estados_validos = {estado["nombre"] for estado in response.data or []}
            logger.info(f"Estados válidos cargados: {self.estados_validos}")
        except Exception as e:
            logger.error(f"Error cargando estados válidos: {e}")
            self.errores.append({"fila": "-", "mensaje": f"Error cargando estados válidos: {str(e)}"})
    
    def _build_correos_map(self, df_correos: pd.DataFrame):
        """Construye mapa de nombres normalizados a emails"""
        if df_correos is None or df_correos.empty:
            return
        
        try:
            # Buscar columnas por nombre normalizado
            first_name_col = None
            last_name_col = None
            email_col = None
            
            for col in df_correos.columns:
                col_norm = normalize_text(col)
                if col_norm in ["first name", "nombre"]:
                    first_name_col = col
                elif col_norm in ["last name", "apellido", "apellidos"]:
                    last_name_col = col
                elif col_norm in ["email address", "email", "correo"]:
                    email_col = col
            
            if not all([first_name_col, last_name_col, email_col]):
                logger.warning("Columnas de correos no encontradas completamente")
                return
            
            for _, row in df_correos.iterrows():
                first_name = str(row.get(first_name_col, "")).strip()
                last_name = str(row.get(last_name_col, "")).strip()
                email = str(row.get(email_col, "")).strip()
                
                if first_name and last_name and email:
                    full_name = f"{first_name} {last_name}"
                    nombre_normalizado = normalize_text(full_name)
                    self.correos_map[nombre_normalizado] = (full_name, email)
            
            logger.info(f"Mapa de correos construido: {len(self.correos_map)} entradas")
            
        except Exception as e:
            logger.error(f"Error construyendo mapa de correos: {e}")
            self.errores.append({"fila": "-", "mensaje": f"Error procesando lista de correos: {str(e)}"})
    
    def _find_profile_by_email(self, email: str) -> Optional[str]:
        """Busca profile por email y devuelve user_id"""
        try:
            response = self.supabase.table("profiles").select("user_id").eq("email", email.lower().strip()).execute()
            if response.data:
                return response.data[0]["user_id"]
            return None
        except Exception as e:
            logger.error(f"Error buscando profile por email {email}: {e}")
            return None
    
    def _create_profile(self, email: str, full_name: str) -> Optional[str]:
        """Crea nuevo profile y responsable"""
        try:
            user_id = str(uuid4())
            
            # Crear profile
            profile_data = {
                "user_id": user_id,
                "full_name": full_name,
                "email": email.lower().strip(),
                "role": "RESPONSABLE",
                "active": True
            }
            
            self.supabase.table("profiles").insert(profile_data).execute()
            
            # Crear responsable
            self.supabase.table("responsables").insert({"responsable_id": user_id}).execute()
            
            self.perfiles_creados += 1
            logger.info(f"Profile creado: {email} ({user_id})")
            return user_id
            
        except Exception as e:
            logger.error(f"Error creando profile para {email}: {e}")
            return None
    
    def _get_or_create_profile(self, email: str, full_name: str) -> Optional[str]:
        """Obtiene o crea profile por email"""
        user_id = self._find_profile_by_email(email)
        if user_id:
            return user_id
        
        return self._create_profile(email, full_name)
    
    def _upsert_equipo(self, equipo_data: Dict[str, Any]) -> bool:
        """Upsert equipo por número de serie"""
        try:
            num_serie = equipo_data["num_serie"]
            
            # Verificar si existe
            existing = self.supabase.table("equipos").select("equipo_id").eq("num_serie", num_serie).execute()
            
            if existing.data:
                # Update
                self.supabase.table("equipos").update(equipo_data).eq("equipo_id", existing.data[0]["equipo_id"]).execute()
                logger.info(f"Equipo actualizado: {num_serie}")
            else:
                # Insert
                self.supabase.table("equipos").insert(equipo_data).execute()
                logger.info(f"Equipo creado: {num_serie}")
            
            self.equipos_procesados += 1
            return True
            
        except Exception as e:
            logger.error(f"Error upserting equipo {equipo_data.get('num_serie', 'N/A')}: {e}")
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
            
            # Obtener nombres de hojas
            inventario_sheet = settings.SHEET_INVENTARIO or "Inventario"
            correos_sheet = settings.SHEET_CORREOS or "Lista de correos"
            
            # Leer hojas
            df_inventario = None
            df_correos = None
            
            for sheet_name in xls.sheet_names:
                if normalize_text(sheet_name) == normalize_text(inventario_sheet):
                    df_inventario = pd.read_excel(xls, sheet_name)
                elif normalize_text(sheet_name) == normalize_text(correos_sheet):
                    df_correos = pd.read_excel(xls, sheet_name)
            
            # Validar hoja de inventario
            if df_inventario is None:
                self.errores.append({"fila": "-", "mensaje": f"Hoja '{inventario_sheet}' no encontrada"})
                return self._build_result()
            
            # Validar encabezados requeridos
            required_headers = [
                "Numero de serie", "Tipo", "Marca", "Modelo", "Procesador", "RAM", "Disco", 
                "Sistema Operativo", "Ubicacion", "Estado", "Responsable", "Observaciones"
            ]
            
            missing_headers = []
            df_headers = list(df_inventario.columns)
            
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
            
            # Cargar estados válidos
            self._load_estados_validos()
            if not self.estados_validos:
                return self._build_result()
            
            # Construir mapa de correos si existe
            if df_correos is not None:
                self._build_correos_map(df_correos)
            
            # Procesar filas de inventario
            for idx, row in df_inventario.iterrows():
                # Saltar filas vacías
                if row.isna().all():
                    continue
                
                fila_num = idx + 2  # +2 por header y 1-indexing
                self.filas_procesadas += 1
                
                # Validar número de serie
                num_serie = self._get_column_value(row, "Numero de serie", df_headers)
                if not num_serie:
                    self.errores.append({"fila": fila_num, "mensaje": "Número de serie es requerido"})
                    continue
                
                # Validar estado
                estado_raw = self._get_column_value(row, "Estado", df_headers)
                if not estado_raw:
                    self.errores.append({"fila": fila_num, "mensaje": "Estado es requerido"})
                    continue
                
                estado_normalizado = normalize_estado(estado_raw)
                if not estado_normalizado or estado_normalizado not in self.estados_validos:
                    validos_str = ', '.join(sorted(self.estados_validos))
                    self.errores.append({"fila": fila_num, "mensaje": f"Estado no encontrado: '{estado_raw}' (válidos: {validos_str})"})
                    continue
                
                # Obtener estado_equipo_id
                try:
                    estado_response = self.supabase.table("estados_equipo").select("estado_equipo_id").eq("nombre", estado_normalizado).execute()
                    if not estado_response.data:
                        self.errores.append({"fila": fila_num, "mensaje": f"Estado '{estado_normalizado}' no encontrado en BD"})
                        continue
                    estado_equipo_id = estado_response.data[0]["estado_equipo_id"]
                except Exception as e:
                    self.errores.append({"fila": fila_num, "mensaje": f"Error obteniendo ID de estado: {str(e)}"})
                    continue
                
                # Validar responsable
                responsable_raw = self._get_column_value(row, "Responsable", df_headers)
                if not responsable_raw:
                    self.errores.append({"fila": fila_num, "mensaje": "Responsable es requerido"})
                    continue
                
                # Buscar email del responsable
                responsable_normalizado = normalize_text(responsable_raw)
                if responsable_normalizado not in self.correos_map:
                    self.errores.append({"fila": fila_num, "mensaje": f"Responsable '{responsable_raw}' no encontrado en 'Lista de correos'"})
                    continue
                
                full_name, email = self.correos_map[responsable_normalizado]
                
                # Obtener o crear profile
                user_id = self._get_or_create_profile(email, full_name)
                if not user_id:
                    self.errores.append({"fila": fila_num, "mensaje": f"Error obteniendo/creando profile para {email}"})
                    continue
                
                # Preparar datos del equipo
                equipo_data = {
                    "tipo_equipo": self._get_column_value(row, "Tipo", df_headers) or "Computadora",
                    "marca": self._get_column_value(row, "Marca", df_headers),
                    "modelo": self._get_column_value(row, "Modelo", df_headers),
                    "num_serie": num_serie,
                    "procesador": self._get_column_value(row, "Procesador", df_headers),
                    "ram": self._get_column_value(row, "RAM", df_headers),
                    "disco": self._get_column_value(row, "Disco", df_headers),
                    "sistema_operativo": self._get_column_value(row, "Sistema Operativo", df_headers),
                    "ubicacion_actual": self._get_column_value(row, "Ubicacion", df_headers),
                    "estado_equipo_id": estado_equipo_id,
                    "responsable_id": user_id,
                    "observaciones": self._get_column_value(row, "Observaciones", df_headers)
                }
                
                # Upsert equipo
                if not self._upsert_equipo(equipo_data):
                    self.errores.append({"fila": fila_num, "mensaje": f"Error procesando equipo {num_serie}"})
            
            return self._build_result()
                
        except Exception as e:
            logger.error(f"Error procesando Excel: {e}", exc_info=True)
            self.errores.append({"fila": "-", "mensaje": f"Error procesando Excel: {str(e)}"})
            return self._build_result()
    
    def _build_result(self) -> Dict[str, Any]:
        """Construye resultado final"""
        return {
            "ok": len(self.errores) == 0,
            "filas_procesadas": self.filas_procesadas,
            "equipos_procesados": self.equipos_procesados,
            "perfiles_creados": self.perfiles_creados,
            "errores": self.errores
        }