# PowerShell smoke (usar desde backend/)
$Headers = @{ "Content-Type" = "application/json"; "X-Intake-Secret" = "demo" }

$payloads = @(
  @{ submissionId="forms:smoke-001"; email="user1@example.com"; nombre="Usuario 1"; descripcion="A" } | ConvertTo-Json
  @{ submissionId="forms:smoke-002"; email="user2@example.com"; nombre="Usuario 2"; descripcion="B" } | ConvertTo-Json
  @{ submissionId="forms:smoke-003"; email="user3@example.com"; nombre="Usuario 3"; descripcion="C" } | ConvertTo-Json
)

foreach ($p in $payloads) {
  Invoke-RestMethod -Method Post "http://localhost:8000/intake/google-forms" -Headers $Headers -Body $p
}
Write-Host "Listo. Refresca /tickets y revisa el chip de debug."
