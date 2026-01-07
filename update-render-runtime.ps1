<#
update-render-runtime.ps1

Update a Render service to use Python 3.12 via the Render API and trigger a redeploy.
Run locally in PowerShell. The script asks for:
  - Render API Key (input visible)
  - Render Service ID

Usage:
  1. Open PowerShell in project root.
  2. Run: .\update-render-runtime.ps1
  3. Paste the API key and service id when prompted.

Note: If the Render API does not accept the runtime field, the script will attempt to trigger a manual deploy.
#>

function Read-Visible($prompt) {
  Write-Host -NoNewline ($prompt + ": ")
  return Read-Host
}

Write-Host "Update Render service runtime to python-3.12 and trigger redeploy"
$renderApiKey = Read-Visible "Enter Render API Key (paste and press Enter)"
if (-not $renderApiKey) { Write-Host "No API key provided, aborting."; exit 1 }
$serviceId = Read-Visible "Enter Render Service ID (paste and press Enter)"
if (-not $serviceId) { Write-Host "No Service ID provided, aborting."; exit 1 }

$baseUrl = "https://api.render.com/v1/services/$serviceId"
$headers = @{ Authorization = "Bearer $renderApiKey"; "Content-Type" = "application/json" }

Write-Host "Attempting to PATCH runtime -> python-3.12 ..."
try {
  $patchBody = @{ service = @{ runtime = "python-3.12" } } | ConvertTo-Json -Depth 6
  $patchResp = Invoke-RestMethod -Uri $baseUrl -Method Patch -Headers $headers -Body $patchBody -ErrorAction Stop
  Write-Host "PATCH successful (server accepted runtime change)."
} catch {
  Write-Host "PATCH failed: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "Proceeding to trigger a manual deploy (best-effort)."
}

Write-Host "Triggering a manual deploy..."
try {
  $deployUrl = "$baseUrl/deploys"
  $deployResp = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $headers -ErrorAction Stop
  Write-Host "Deploy triggered. Response summary:"
  $deployResp | ConvertTo-Json -Depth 6
} catch {
  Write-Host "Failed to trigger deploy: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "If this fails, please use the Render dashboard to change the runtime to Python 3.12 and redeploy manually."
  exit 1
}

Write-Host "Done. Visit the Render dashboard to watch the deployment logs and ensure build succeeds."

