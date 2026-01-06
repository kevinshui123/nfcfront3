# Backend developer setup for Windows PowerShell
# Usage: run in repository root: .\backend\setup_dev.ps1
Param()

Write-Host "Creating virtual environment in backend/.venv..."
python -m venv .venv

Write-Host "Activating virtual environment..."
& .\.venv\Scripts\Activate.ps1

Write-Host "Upgrading pip..."
python -m pip install --upgrade pip

Write-Host "Installing backend Python dependencies..."
pip install -r requirements.txt

Write-Host ""
Write-Host "Setup complete."
Write-Host "To start services: docker-compose up --build"
Write-Host "To initialize DB after services are up: docker-compose exec backend python -m app.init_db"


