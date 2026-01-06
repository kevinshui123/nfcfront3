Param()

Write-Host "Integration test runner (PowerShell)"

$env:BASE_URL = $env:BASE_URL -or "http://localhost:8000"

Write-Host "Bringing up docker-compose services..."
docker-compose up -d

Write-Host "Waiting 8 seconds for services to initialize..."
Start-Sleep -s 8

Write-Host "Initializing database (seed data)..."
docker-compose exec backend python -m app.init_db

Write-Host "Running backend pytest..."
docker-compose exec backend pytest -q | Tee-Object -FilePath backend\scripts\integration_output.log -Append

Write-Host "Running smoke tests..."
python backend/scripts/smoke_test.py | Tee-Object -FilePath backend\scripts\integration_output.log -Append

Write-Host "Integration run finished. See backend/scripts/integration_output.log for details."


