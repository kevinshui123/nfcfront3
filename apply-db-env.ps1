<#
apply-db-env.ps1

Interactive helper to set DATABASE_URL (and optional SILRA_API_KEY) on a Render service and trigger a deploy.
Run locally in PowerShell. Prompts for Render API Key and Database URL.

Usage:
  1. Open PowerShell in project root.
  2. Run: .\apply-db-env.ps1
  3. When prompted, paste:
     - Render API Key (will be used locally)
     - Render Service ID (e.g. srv-xxxxx)
     - Database URL (postgres connection string)
     - SILRA_API_KEY (optional)
#>

function Read-Visible($prompt) {
  Write-Host -NoNewline ($prompt + ": ")
  return Read-Host
}

Write-Host "Apply DATABASE_URL to Render service (interactive)"
$renderToken = Read-Visible "Enter Render API Key (paste and press Enter)"
if (-not $renderToken) { Write-Host "No Render API Key provided, aborting."; exit 1 }
$serviceId = Read-Visible "Enter Render Service ID (e.g. srv-xxxxx)"
if (-not $serviceId) { Write-Host "No Service ID provided, aborting."; exit 1 }
$dbUrl = Read-Visible "Enter Database URL (postgres://... or internal db URL from Render)"
if (-not $dbUrl) { Write-Host "No Database URL provided, aborting."; exit 1 }
$silra = Read-Visible "Enter SILRA_API_KEY (optional, press Enter to skip)"

$headers = @{ Authorization = "Bearer $renderToken"; "Content-Type" = "application/json" }

function Create-Env($key, $value) {
  $body = @{ key = $key; value = $value; scope = "env" } | ConvertTo-Json
  $url = "https://api.render.com/v1/services/$serviceId/env-vars"
  try {
    $r = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host ("Created env: " + $key)
  } catch {
    $msg = $_.Exception.Message
    Write-Host ("Failed to set env " + $key + ": " + $msg) -ForegroundColor Yellow
  }
}

Write-Host "Setting DATABASE_URL..."
Create-Env -key "DATABASE_URL" -value $dbUrl
Write-Host "Setting ENV=prod..."
Create-Env -key "ENV" -value "prod"
if ($silra -and $silra.Trim() -ne "") {
  Write-Host "Setting SILRA_API_KEY..."
  Create-Env -key "SILRA_API_KEY" -value $silra
}

Write-Host "Triggering manual deploy..."
try {
  $deployUrl = "https://api.render.com/v1/services/$serviceId/deploys"
  $deployResp = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $headers -ErrorAction Stop
  Write-Host "Deploy triggered. Deploy ID:" $deployResp.id
} catch {
  Write-Host "Failed to trigger deploy: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "If this fails, redeploy manually via Render dashboard."
}

Write-Host "Done. Visit Render dashboard to monitor the build. After deploy succeeds, open service Shell and run 'python backend/app/init_db.py' to seed demo data."

