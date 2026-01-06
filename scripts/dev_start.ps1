Param()

Write-Host "Starting development environment (backend + frontend)"

# Resolve repository root relative to this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

# Start backend in a new PowerShell window using run_local.ps1
$backendPath = Join-Path $repoRoot "backend\run_local.ps1"
if (-not (Test-Path $backendPath)) {
    Write-Error "Backend run script not found at $backendPath"
    exit 1
}
Write-Host "Starting backend..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$backendPath`"" -WindowStyle Hidden

# Wait a few seconds for backend to initialize
Start-Sleep -Seconds 6

Write-Host "Starting frontend (mock mode)..."
$adminPath = Join-Path $repoRoot "admin_frontend"
if (-not (Test-Path $adminPath)) {
    Write-Error "Admin frontend folder not found at $adminPath"
    exit 1
}
Push-Location $adminPath
$env:VITE_MOCK = "true"
npm install
npm run dev
Pop-Location


