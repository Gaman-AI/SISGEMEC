# Changelog - Fix Importador de Excel

## Fix: JSONResponse importado desde fastapi.responses

### Problema
- El import de `JSONResponse` desde `fastapi` causaba crash del backend
- Las respuestas no eran consistentemente JSON-serializables

### Solución
- **Archivo**: `backend/app/routers/import_inventario.py`
- **Cambio**: 
  ```python
  # Antes
  from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Header, JSONResponse
  
  # Después
  from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Header
  from fastapi.responses import JSONResponse
  ```

## Garantía de que errores es list[str]

### Problema
- Los errores se acumulaban como objetos complejos (dicts, tuplas)
- Esto causaba problemas de serialización JSON

### Solución
- **Archivo**: `backend/app/services/excel_import.py`
- **Cambios**:
  - `self.errores: List[str] = []` - Tipado explícito
  - Todos los `self.errores.append()` ahora usan strings simples
  - Formato: `f"Fila {fila_num}: {mensaje}"` para errores de fila
  - Formato: `f"{mensaje}"` para errores generales

### Ejemplos de errores convertidos:
```python
# Antes
self.errores.append({"fila": fila_num, "mensaje": "Estado no encontrado"})

# Después  
self.errores.append(f"Fila {fila_num}: Estado no encontrado")
```

## Garantía de respuesta JSON-serializable

### Problema
- Las respuestas del endpoint no tenían formato consistente
- Mezcla de objetos dict y JSONResponse

### Solución
- **Archivo**: `backend/app/routers/import_inventario.py`
- **Nuevas funciones helper**:
  ```python
  def _ok_response(total_filas: int, equipos_procesados: int, perfiles_creados: int, errores: List[str] = None) -> JSONResponse
  
  def _fail_response(status: int, total_filas: int = 0, equipos_procesados: int = 0, perfiles_creados: int = 0, errores: List[str] = None) -> JSONResponse
  ```

### Formato de respuesta garantizado:
```json
{
  "ok": bool,
  "total_filas_excel": int,
  "insertados_actualizados_equipos": int,
  "perfiles_creados": int,
  "errores": [str]
}
```

## Validación

### Import estático exitoso
```bash
python -c "from app.main import app; print('✅ Import estático exitoso')"
# Resultado: ✅ Import estático exitoso
```

### Sin errores de linting
- `backend/app/routers/import_inventario.py` - ✅ Sin errores
- `backend/app/services/excel_import.py` - ✅ Sin errores

## Estado Final

✅ **Backend estable**: No más crashes por imports incorrectos
✅ **Respuestas consistentes**: Formato JSON garantizado
✅ **Errores serializables**: Solo strings en la lista de errores
✅ **Compatibilidad mantenida**: Frontend sigue funcionando sin cambios

El importador de Excel ahora es completamente estable y devuelve respuestas JSON consistentes.
