Param()

Write-Host "Starting backend locally with SQLite (dev mode)"
if (-not (Test-Path .venv)) {
    python -m venv .venv
}
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
$req = (Join-Path (Get-Location) 'requirements_dev.txt')
if (Test-Path $req) {
    try {
        & pip install -r $req
    } catch {
        Write-Warning \"pip install -r requirements_dev.txt failed: $_. Exception. Continuing.\"
    }
} else {
    try {
        & pip install -r requirements.txt
    } catch {
        Write-Warning \"pip install -r requirements.txt failed: $_. Exception. Continuing.\"
    }
}

 $env:DATABASE_URL = "sqlite+aiosqlite:///./dev.db"
 $env:SILRA_API_KEY = $env:SILRA_API_KEY
 $env:SECRET_KEY = $env:SECRET_KEY -or "dev-secret"
 if (-not $env:PORT) { $env:PORT = "8001" }

Write-Host "Initializing DB..."
python -m app.init_db

Write-Host "Starting uvicorn..."
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $env:PORT


