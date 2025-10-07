# Script de smoke tests para el módulo de Reportes
# Ejecutar desde el directorio backend/

Write-Host "=== SMOKE TESTS PARA MÓDULO DE REPORTES ===" -ForegroundColor Green

# Health check
Write-Host "`n1. Health Check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/healthz" -Method GET -TimeoutSec 5
    Write-Host "OK Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "FAILED Health: $($_.Exception.Message)" -ForegroundColor Red
}

# Test export sin auth (debe dar 401)
Write-Host "`n2. Test Export sin auth (debe dar 401):" -ForegroundColor Yellow
try {
    $export = Invoke-WebRequest -Uri "http://127.0.0.1:8000/reportes/equipos/export?format=pdf" -Method GET -TimeoutSec 10
    Write-Host "FAILED Export: Debería requerir auth" -ForegroundColor Red
} catch {
    if ($_.Exception.Message -like "*401*") {
        Write-Host "OK Export: 401 No autorizado (correcto)" -ForegroundColor Green
    } else {
        Write-Host "FAILED Export: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Equipos sin filtros
Write-Host "`n3. Equipos (sin filtros):" -ForegroundColor Yellow
try {
    $equipos = Invoke-RestMethod -Uri "http://127.0.0.1:8000/reportes/equipos?page=1&size=5" -Method GET -TimeoutSec 10
    Write-Host "OK Equipos: $($equipos.total) total, $($equipos.items.Count) items" -ForegroundColor Green
} catch {
    Write-Host "FAILED Equipos: $($_.Exception.Message)" -ForegroundColor Red
}

# Equipos con filtro marca
Write-Host "`n4. Equipos (filtro marca=Lenovo):" -ForegroundColor Yellow
try {
    $equiposFiltro = Invoke-RestMethod -Uri "http://127.0.0.1:8000/reportes/equipos?marca=Lenovo&page=1&size=5" -Method GET -TimeoutSec 10
    Write-Host "OK Equipos con filtro: $($equiposFiltro.total) total, $($equiposFiltro.items.Count) items" -ForegroundColor Green
} catch {
    Write-Host "FAILED Equipos con filtro: $($_.Exception.Message)" -ForegroundColor Red
}

# Servicios con rango fechas
Write-Host "`n5. Servicios (rango fechas 2025):" -ForegroundColor Yellow
try {
    $servicios = Invoke-RestMethod -Uri "http://127.0.0.1:8000/reportes/servicios?from_dt=2025-01-01&to_dt=2025-12-31&page=1&size=5" -Method GET -TimeoutSec 10
    Write-Host "OK Servicios: $($servicios.total) total, $($servicios.items.Count) items" -ForegroundColor Green
} catch {
    Write-Host "FAILED Servicios: $($_.Exception.Message)" -ForegroundColor Red
}

# Export Excel
Write-Host "`n6. Export Excel:" -ForegroundColor Yellow
try {
    $excelFile = "reporte_equipos_test.xlsx"
    Invoke-WebRequest -Uri "http://127.0.0.1:8000/reportes/equipos/export?format=excel" -Method GET -OutFile $excelFile -TimeoutSec 15
    if (Test-Path $excelFile) {
        $fileSize = (Get-Item $excelFile).Length
        Write-Host "OK Export Excel: $excelFile ($fileSize bytes)" -ForegroundColor Green
        Remove-Item $excelFile
    } else {
        Write-Host "FAILED Export Excel: Archivo no creado" -ForegroundColor Red
    }
} catch {
    Write-Host "FAILED Export Excel: $($_.Exception.Message)" -ForegroundColor Red
}

# Export PDF
Write-Host "`n7. Export PDF:" -ForegroundColor Yellow
try {
    $pdfFile = "reporte_servicios_test.pdf"
    Invoke-WebRequest -Uri "http://127.0.0.1:8000/reportes/servicios/export?format=pdf" -Method GET -OutFile $pdfFile -TimeoutSec 15
    if (Test-Path $pdfFile) {
        $fileSize = (Get-Item $pdfFile).Length
        Write-Host "OK Export PDF: $pdfFile ($fileSize bytes)" -ForegroundColor Green
        Remove-Item $pdfFile
    } else {
        Write-Host "FAILED Export PDF: Archivo no creado" -ForegroundColor Red
    }
} catch {
    Write-Host "FAILED Export PDF: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== SMOKE TESTS COMPLETADOS ===" -ForegroundColor Green
