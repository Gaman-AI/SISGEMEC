"""
Servicio de importación de equipos desde Excel
"""
import pandas as pd
import io
from typing import Dict, List, Optional, Any, Set
from unidecode import unidecode
import re
import logging
from datetime import datetime

from app.config import settings
from app.deps.supabase_client import supa_service
from app.services.database_seed import seed_estados_equipo

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

def parse_date(date_value) -> Optional[str]:
    """Convierte fecha a formato YYYY-MM-DD o None"""
    if pd.isna(date_value) or not date_value:
        return None
    
    try:
        # Si es string, intentar parsear
        if isinstance(date_value, str):
            # Intentar diferentes formatos
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                try:
                    dt = datetime.strptime(date_value.strip(), fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return None
        
        # Si es timestamp de pandas/Excel
        if hasattr(date_value, 'strftime'):
            return date_value.strftime('%Y-%m-%d')
        
        # Si es número (serial de Excel)
        if isinstance(date_value, (int, float)):
            # Convertir serial de Excel a fecha
            dt = pd.to_datetime(date_value, origin='1899-12-30', unit='D')
            return dt.strftime('%Y-%m-%d')
        
        return None
        
    except Exception as e:
        logger.warning(f"Error parseando fecha {date_value}: {e}")
        return None

class EquipmentImportService:
    def __init__(self):
        self.supabase = supa_service()
        self.total_filas_excel = 0
        self.equipos_procesados = 0
        self.equipos_creados = 0
        self.equipos_actualizados = 0
        self.errores: List[Dict[str, Any]] = []
        self.estados_validos: Set[str] = set()
        self.estado_map: Dict[str, int] = {}  # nombre -> estado_equipo_id
    
    def _load_estados_validos(self):
        """Carga estados válidos desde la base de datos"""
        try:
            # Asegurar que existan los estados básicos
            seed_estados_equipo()
            
            response = self.supabase.table("estados_equipo").select("*").execute()
            if response.data:
                for estado in response.data:
                    nombre = estado["nombre"]
                    self.estados_validos.add(nombre)
                    self.estado_map[nombre] = estado["estado_equipo_id"]
                logger.info(f"Estados válidos cargados: {self.estados_validos}")
            else:
                logger.warning("No se encontraron estados en la base de datos")
        except Exception as e:
            logger.error(f"Error cargando estados válidos: {e}")
            self.errores.append({"fila": "-", "mensaje": f"Error cargando estados válidos: {str(e)}"})
    
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
    
    def _upsert_equipo(self, equipo_data: Dict[str, Any]) -> bool:
        """Upsert equipo por número de serie"""
        try:
            num_serie = equipo_data["num_serie"]
            
            # Verificar si existe
            existing = self.supabase.table("equipos").select("equipo_id").eq("num_serie", num_serie).execute()
            
            if existing.data:
                # Update
                self.supabase.table("equipos").update(equipo_data).eq("equipo_id", existing.data[0]["equipo_id"]).execute()
                self.equipos_actualizados += 1
                logger.info(f"Equipo actualizado: {num_serie}")
            else:
                # Insert
                self.supabase.table("equipos").insert(equipo_data).execute()
                self.equipos_creados += 1
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
            
            # Buscar hoja "Equipos"
            df_equipos = None
            for sheet_name in xls.sheet_names:
                if normalize_text(sheet_name) == normalize_text("Equipos"):
                    df_equipos = pd.read_excel(xls, sheet_name)
                    break
            
            # Validar hoja de equipos
            if df_equipos is None:
                self.errores.append({"fila": "-", "mensaje": "Hoja 'Equipos' no encontrada"})
                return self._build_result()
            
            # Validar encabezados requeridos
            required_headers = ["Número de serie", "Estado", "Responsable email"]
            df_headers = list(df_equipos.columns)
            
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
            
            # Cargar estados válidos
            self._load_estados_validos()
            if not self.estados_validos:
                return self._build_result()
            
            # Procesar filas de equipos
            for idx, row in df_equipos.iterrows():
                # Saltar filas vacías
                if row.isna().all():
                    continue
                
                fila_num = idx + 2  # +2 por header y 1-indexing
                self.total_filas_excel += 1
                
                # Validar número de serie
                num_serie = self._get_column_value(row, "Número de serie", df_headers)
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
                    self.errores.append({"fila": fila_num, "mensaje": f"Estado inválido '{estado_raw}'. Válidos: {validos_str}"})
                    continue
                
                # Obtener estado_equipo_id
                estado_equipo_id = self.estado_map.get(estado_normalizado)
                if not estado_equipo_id:
                    self.errores.append({"fila": fila_num, "mensaje": f"Estado '{estado_normalizado}' no encontrado en BD"})
                    continue
                
                # Validar responsable
                responsable_email = self._get_column_value(row, "Responsable email", df_headers)
                if not responsable_email:
                    self.errores.append({"fila": fila_num, "mensaje": "Responsable email es requerido"})
                    continue
                
                # Buscar responsable por email
                responsable_id = self._find_profile_by_email(responsable_email)
                if not responsable_id:
                    self.errores.append({"fila": fila_num, "mensaje": f"Responsable '{responsable_email}' no encontrado. Importe usuarios primero."})
                    continue
                
                # Obtener fechas
                fecha_ingreso = self._get_column_value(row, "Fecha de ingreso", df_headers)
                fecha_salida = self._get_column_value(row, "Fecha de salida", df_headers)
                
                # Parsear fechas
                fecha_ingreso_parsed = parse_date(fecha_ingreso) if fecha_ingreso else None
                fecha_salida_parsed = parse_date(fecha_salida) if fecha_salida else None
                
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
                    "ubicacion_actual": self._get_column_value(row, "Ubicación actual", df_headers),
                    "estado_equipo_id": estado_equipo_id,
                    "responsable_id": responsable_id,
                    "fecha_ingreso": fecha_ingreso_parsed,
                    "fecha_salida": fecha_salida_parsed,
                    "observaciones": self._get_column_value(row, "Observaciones", df_headers)
                }
                
                # Upsert equipo
                if not self._upsert_equipo(equipo_data):
                    self.errores.append({"fila": fila_num, "mensaje": f"Error procesando equipo {num_serie}"})
            
            return self._build_result()
                
        except Exception as e:
            logger.error(f"Error procesando Excel de equipos: {e}", exc_info=True)
            self.errores.append({"fila": "-", "mensaje": f"Error procesando Excel: {str(e)}"})
            return self._build_result()
    
    def _build_result(self) -> Dict[str, Any]:
        """Construye resultado final"""
        return {
            "ok": len(self.errores) == 0,
            "total_filas_excel": self.total_filas_excel,
            "equipos_procesados": self.equipos_procesados,
            "equipos_creados": self.equipos_creados,
            "equipos_actualizados": self.equipos_actualizados,
            "errores": self.errores
        }
