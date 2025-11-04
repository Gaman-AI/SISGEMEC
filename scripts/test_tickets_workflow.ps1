# Script de pruebas para el flujo completo de Tickets
# Ejecutar desde el directorio backend/

Write-Host "🧪 INICIANDO PRUEBAS DEL FLUJO COMPLETO DE TICKETS" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# 1. Crear ticket de prueba
Write-Host "`n1️⃣ Creando ticket de prueba..." -ForegroundColor Yellow
$ticketData = @{
    solicitante_email = "test@empresa.com"
    solicitante_nombre = "Usuario Prueba"
    descripcion = "Problema con el equipo de prueba"
    fuente = "manual"
    external_id = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8000/intake/google-forms" -Method POST -Body $ticketData -ContentType "application/json" -Headers @{"X-Intake-Secret" = "test-secret"}
    $ticketId = $createResponse.ticket_id
    Write-Host "✅ Ticket creado: ID $ticketId" -ForegroundColor Green
    Write-Host "   requires_classification: $($createResponse.requires_classification)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error creando ticket: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Verificar que aparece en la lista
Write-Host "`n2️⃣ Verificando listado de tickets..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets?page=1&size=20" -Method GET
    Write-Host "✅ Lista obtenida: $($listResponse.items.Count) items, total: $($listResponse.total)" -ForegroundColor Green
    
    $testTicket = $listResponse.items | Where-Object { $_.ticket_id -eq $ticketId }
    if ($testTicket) {
        Write-Host "✅ Ticket encontrado en lista" -ForegroundColor Green
        Write-Host "   Estado: $($testTicket.estado)" -ForegroundColor Cyan
        Write-Host "   Prioridad: $($testTicket.priority)" -ForegroundColor Cyan
        Write-Host "   requires_classification: $($testTicket.requires_classification)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Ticket no encontrado en lista" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error obteniendo lista: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Clasificar el ticket
Write-Host "`n3️⃣ Clasificando ticket..." -ForegroundColor Yellow
$classifyData = @{
    priority = "Important"
    observaciones = "Ticket de prueba clasificado"
} | ConvertTo-Json

try {
    $classifyResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId/clasificar" -Method PUT -Body $classifyData -ContentType "application/json"
    Write-Host "✅ Ticket clasificado" -ForegroundColor Green
    Write-Host "   Nueva prioridad: $($classifyResponse.priority)" -ForegroundColor Cyan
    Write-Host "   requires_classification: $($classifyResponse.requires_classification)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error clasificando ticket: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Cambiar a "En atención"
Write-Host "`n4️⃣ Cambiando estado a 'En atención'..." -ForegroundColor Yellow
$stateData = @{
    estado = "En atención"
} | ConvertTo-Json

try {
    $stateResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId/estado" -Method PUT -Body $stateData -ContentType "application/json"
    Write-Host "✅ Estado cambiado a: $($stateResponse.estado)" -ForegroundColor Green
    Write-Host "   first_response_at: $($stateResponse.first_response_at)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error cambiando estado: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Cambiar prioridad
Write-Host "`n5️⃣ Cambiando prioridad..." -ForegroundColor Yellow
$priorityData = @{
    priority = "Urgent"
} | ConvertTo-Json

try {
    $priorityResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId/prioridad" -Method PUT -Body $priorityData -ContentType "application/json"
    Write-Host "✅ Prioridad cambiada a: $($priorityResponse.priority)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error cambiando prioridad: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Cerrar el ticket
Write-Host "`n6️⃣ Cerrando ticket..." -ForegroundColor Yellow
$closeData = @{
    estado = "Cerrado"
    resultado_servicio = "Problema resuelto exitosamente. Se realizó mantenimiento preventivo y se actualizó el firmware del equipo."
} | ConvertTo-Json

try {
    $closeResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId/estado" -Method PUT -Body $closeData -ContentType "application/json"
    Write-Host "✅ Ticket cerrado" -ForegroundColor Green
    Write-Host "   Estado final: $($closeResponse.estado)" -ForegroundColor Cyan
    Write-Host "   closed_at: $($closeResponse.closed_at)" -ForegroundColor Cyan
    Write-Host "   resultado_servicio: $($closeResponse.resultado_servicio)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error cerrando ticket: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Verificar eventos
Write-Host "`n7️⃣ Verificando eventos del ticket..." -ForegroundColor Yellow
try {
    $eventsResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId/events" -Method GET
    Write-Host "✅ Eventos obtenidos: $($eventsResponse.Count) eventos" -ForegroundColor Green
    
    $eventTypes = $eventsResponse | ForEach-Object { $_.event_type } | Sort-Object -Unique
    Write-Host "   Tipos de eventos: $($eventTypes -join ', ')" -ForegroundColor Cyan
    
    foreach ($event in $eventsResponse) {
        Write-Host "   - $($event.event_type): $($event.created_at)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo eventos: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Verificar estado final
Write-Host "`n8️⃣ Verificando estado final del ticket..." -ForegroundColor Yellow
try {
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8000/tickets/$ticketId" -Method GET
    Write-Host "✅ Estado final verificado" -ForegroundColor Green
    Write-Host "   ID: $($finalResponse.ticket_id)" -ForegroundColor Cyan
    Write-Host "   Estado: $($finalResponse.estado)" -ForegroundColor Cyan
    Write-Host "   Prioridad: $($finalResponse.priority)" -ForegroundColor Cyan
    Write-Host "   requires_classification: $($finalResponse.requires_classification)" -ForegroundColor Cyan
    Write-Host "   received_at: $($finalResponse.received_at)" -ForegroundColor Cyan
    Write-Host "   first_response_at: $($finalResponse.first_response_at)" -ForegroundColor Cyan
    Write-Host "   closed_at: $($finalResponse.closed_at)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error obteniendo estado final: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "Ticket ID: $ticketId" -ForegroundColor Cyan
Write-Host "`nPara probar en el frontend:" -ForegroundColor Yellow
Write-Host "1. Ir a http://localhost:5173/tickets" -ForegroundColor White
Write-Host "2. Verificar que el ticket aparece en la lista" -ForegroundColor White
Write-Host "3. Probar botón 'Clasificar' (si requires_classification=true)" -ForegroundColor White
Write-Host "4. Probar cambio de estado y prioridad" -ForegroundColor White
Write-Host "5. Probar cierre con resultado_servicio" -ForegroundColor White
Write-Host "6. Verificar timeline en detalle del ticket" -ForegroundColor White
