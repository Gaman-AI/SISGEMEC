@echo off
echo ========================================
echo    INICIANDO SERVIDOR SISGEMEC
echo ========================================
echo.

REM Verificar si el entorno virtual existe
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: No se encontró el entorno virtual
    echo Ejecuta primero: python -m venv venv
    echo Luego: venv\Scripts\activate
    pause
    exit /b 1
)

REM Activar entorno virtual
echo Activando entorno virtual...
call venv\Scripts\activate.bat

REM Verificar dependencias
echo Verificando dependencias...
pip install -r requirements.txt

REM Iniciar servidor
echo.
echo Iniciando servidor en http://localhost:8000
echo Presiona Ctrl+C para detener
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
