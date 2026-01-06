Param()

$mockDir = Join-Path (Resolve-Path .).Path 'admin_frontend\\dist-mock'
If (-not (Test-Path $mockDir)) {
    Write-Error "Mock directory not found: $mockDir"
    exit 1
}
Write-Host "Serving mock frontend from $mockDir on port 5173"
Push-Location $mockDir
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `\"python -m http.server 5173`\"" -WindowStyle Normal
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"
Pop-Location


