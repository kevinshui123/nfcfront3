<#
  run_local_all.ps1
  One-click developer start for this project (Windows PowerShell).
  - Opens two PowerShell windows: backend (uvicorn) and frontend (vite).
  - If backend venv or frontend node_modules are missing, the script will attempt to create/install them (first-run friendly).
  Usage: Right-click -> Run with PowerShell, or from an elevated PowerShell:
    & 'C:\path\to\project\run_local_all.ps1'
#>
Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

$backendDir = Join-Path $scriptDir 'backend'
$frontendDir = Join-Path $scriptDir 'admin_frontend'

Write-Host "Project root: $scriptDir"
Write-Host "Backend dir: $backendDir"
Write-Host "Frontend dir: $frontendDir"

# Build the backend command string
$backendCommand = @(
  "cd '$backendDir'"
  "if (-Not (Test-Path 'venv')) {",
  "  Write-Host 'Creating Python venv...';",
  "  python -m venv venv;",
  "  .\venv\Scripts\Activate.ps1;",
  "  if (Test-Path 'requirements_dev.txt') { Write-Host 'Installing Python deps...'; pip install -r requirements_dev.txt }",
  "  elseif (Test-Path 'requirements.txt') { Write-Host 'Installing Python deps...'; pip install -r requirements.txt }",
  "}",
  "else { Write-Host 'Activating existing venv...'; .\\venv\\Scripts\\Activate.ps1 }",
  "Write-Host 'Starting backend (uvicorn) on :8001...';",
  "python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
 ) -join "; "

# Build the frontend command string
$frontendCommand = @(
  "cd '$frontendDir'",
  "if (-Not (Test-Path 'node_modules')) {",
  "  if (Test-Path 'package.json') { Write-Host 'Installing npm deps...'; npm install }",
  "}",
  "Write-Host 'Starting frontend (vite)...';",
  "npm run dev"
 ) -join "; "

Write-Host "Launching backend window..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $backendCommand

Start-Sleep -Milliseconds 400
Write-Host "Launching frontend window..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "Done. Two windows launched. Backend -> http://localhost:8001, Frontend -> http://localhost:5173 (default)."

