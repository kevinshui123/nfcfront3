<#
create-render-service.ps1

Helper to assist creating a Render Web Service for this repo and set basic env vars.
Run this locally in PowerShell (project root).

Usage:
  1. Open PowerShell in the repository root.
  2. Run: .\create-render-service.ps1
  3. Paste your Render API Key when prompted (input is visible).
  4. Paste your SILRA API key when prompted (optional).

Notes:
- This script will first validate the Render API key.
- It will then attempt to create a service via the Render API. If the API call fails,
  the script will print a curl command you can run locally (with the token) or manual GUI steps.
- The script will try to set ENV and DATABASE_URL and SILRA_API_KEY as env-vars for the service.
#>

function Read-Visible($prompt) {
  # Use concatenation to avoid PowerShell treating "$prompt:" as a variable with a namespace
  Write-Host -NoNewline ($prompt + ": ")
  return Read-Host
}

Write-Host "Create Render service helper"

$renderToken = Read-Visible "Enter your Render API Key (paste and press Enter). If you prefer not to automate, press Enter to cancel"
if (-not $renderToken) {
  Write-Host "No token provided; aborting. Use Render dashboard manually (recommended)." -ForegroundColor Yellow
  exit 0
}

$silra = Read-Visible "Enter SILRA_API_KEY (paste and press Enter). Leave empty to skip"

# Basic validation: call account endpoint
Write-Host "Validating Render API key..."
try {
  $acct = Invoke-RestMethod -Uri "https://api.render.com/v1/account" -Headers @{ Authorization = "Bearer $renderToken" } -Method Get -ErrorAction Stop
  Write-Host "Render account validated: "$acct.name
} catch {
  Write-Host "Render API key validation failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "If you prefer, create the service in Render dashboard manually: https://dashboard.render.com -> New -> Web Service"
  exit 1
}

# Ask for repo (default to known)
$defaultRepo = "kevinshui123/nfcfront3"
$repo = Read-Visible "Repository (owner/repo) to connect (default: $defaultRepo)"
if ([string]::IsNullOrWhiteSpace($repo)) { $repo = $defaultRepo }

Write-Host "Attempting to create a Render Web Service for repo $repo (branch: main)."

$serviceObj = @{
  name = "nfc-backend"
  repo = @{
    name = $repo
    branch = "main"
  }
  buildCommand = "pip install -r requirements.txt"
  startCommand = "uvicorn backend.app.main:app --host 0.0.0.0 --port \$PORT"
  plan = "starter"
}

$payload = @{ service = $serviceObj } | ConvertTo-Json -Depth 10

Write-Host "Calling Render API to create service..."
try {
  $resp = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method Post -Headers @{ Authorization = "Bearer $renderToken"; "Content-Type" = "application/json" } -Body $payload -ErrorAction Stop
  Write-Host "Service creation response:"
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Host "Service create failed: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "You can create the service manually (GUI) with these settings:"
  Write-Host " - Root Directory: backend"
  Write-Host " - Branch: main"
  Write-Host " - Build Command: pip install -r requirements.txt"
  Write-Host " - Start Command: uvicorn backend.app.main:app --host 0.0.0.0 --port \$PORT"
  Write-Host ""
  Write-Host "Or run this curl locally (replace <RENDER_API_KEY> with your key):"
  $curl = "curl -X POST https://api.render.com/v1/services -H `"Authorization: Bearer <RENDER_API_KEY>`" -H `"Content-Type: application/json`" -d '" + ($payload -replace '"','\"') + "'"
  Write-Host $curl
  exit 1
}

# Extract service id
$svcId = $null
if ($resp -ne $null) {
  if ($resp.PSObject.Properties.Name -contains 'service' -and $resp.service.id) { $svcId = $resp.service.id }
  elseif ($resp.PSObject.Properties.Name -contains 'id') { $svcId = $resp.id }
}
if (-not $svcId) {
  Write-Host "Could not extract service id. Open Render dashboard to inspect the created resource." -ForegroundColor Yellow
  exit 1
}

Write-Host "Service created. ID: $svcId"

# Set basic envs
$envs = @(
  @{ key = "ENV"; value = "prod"; scope = "env" },
  @{ key = "DATABASE_URL"; value = "sqlite:///./dev.db"; scope = "env" }
)

foreach ($e in $envs) {
  $body = $e | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/env-vars" -Method Post -Headers @{ Authorization = "Bearer $renderToken"; "Content-Type" = "application/json" } -Body $body -ErrorAction Stop
    Write-Host "Created env: $($e.key)"
  } catch {
    Write-Host "Failed to create env $($e.key): $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

if (-not [string]::IsNullOrWhiteSpace($silra)) {
  $bodyS = @{ key = "SILRA_API_KEY"; value = $silra; scope = "env" } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/env-vars" -Method Post -Headers @{ Authorization = "Bearer $renderToken"; "Content-Type" = "application/json" } -Body $bodyS -ErrorAction Stop
    Write-Host "Created env: SILRA_API_KEY"
  } catch {
    Write-Host "Failed to set SILRA_API_KEY: $($_.Exception.Message)" -ForegroundColor Yellow
  }
} else {
  Write-Host "SILRA_API_KEY not provided. Remember to set it in Render dashboard."
}

Write-Host "Fetching service details..."
try {
  $details = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId" -Method Get -Headers @{ Authorization = "Bearer $renderToken" } -ErrorAction Stop
  $details | ConvertTo-Json -Depth 6
  if ($details -and $details.service -and $details.service.serviceDetails -and $details.service.serviceDetails.defaultDomain) {
    Write-Host "Default domain: $($details.service.serviceDetails.defaultDomain)"
  } else {
    Write-Host "Service created; domain may appear in Render dashboard once deployment finishes."
  }
} catch {
  Write-Host "Could not fetch service details: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Script finished. Copy the service domain and paste it to me, I will set Vercel env and redeploy the frontend."

