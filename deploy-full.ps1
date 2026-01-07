<#
deploy-full.ps1

One-shot helper to:
- build `admin_frontend` and deploy to Vercel (interactive vercel CLI login)
- optionally create a Render web service via API (you input Render API key locally)
- print instructions to set Vercel env `VITE_BACKEND_URL` and redeploy

Security:
- Do NOT paste any tokens into chat. This script reads tokens locally and uses them only on your machine.
Usage:
- Open PowerShell in the repository root (the folder that contains `admin_frontend` and `backend`)
- Run: .\deploy-full.ps1
#>

function Read-Secret($prompt) {
  Write-Host -NoNewline ("$($prompt): ")
  $s = Read-Host -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

Write-Host "=== deploy-full.ps1 ==="

try {
  # Step 1: Build frontend
  if (-not (Test-Path ".\admin_frontend\package.json")) {
    Write-Host "Error: admin_frontend/package.json not found. Run this script from project root." -ForegroundColor Red
    exit 1
  }

  Write-Host "`n1) Installing frontend dependencies (admin_frontend)..."
  Push-Location .\admin_frontend
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Host "npm ci failed." -ForegroundColor Red
    Pop-Location
    exit 1
  }

  Write-Host "2) Building frontend..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed." -ForegroundColor Red
    Pop-Location
    exit 1
  }
  Write-Host "Frontend built: admin_frontend/dist"

  # Ensure vercel CLI
  $vc = Get-Command vercel -ErrorAction SilentlyContinue
  if (-not $vc) {
    Write-Host "`nvercel CLI not found. Installing vercel globally..."
    npm i -g vercel
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Failed to install vercel CLI. Please install it manually and re-run: npm i -g vercel" -ForegroundColor Yellow
    }
  }

  Write-Host "`n3) Deploying frontend to Vercel (interactive). Follow prompts to login/select scope/project..."
  vercel --prod --confirm
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Vercel deploy failed or was cancelled. You can login with 'vercel login' and re-run this script." -ForegroundColor Yellow
  } else {
    Write-Host "Vercel frontend deploy finished. Note the production URL printed by vercel."
  }
  Pop-Location

  Write-Host "`n4) Backend deployment options (Render recommended)"
  Write-Host "You can create a Render Web Service manually (recommended) or attempt via API below."
  Write-Host "`nManual Render steps (recommended):"
  Write-Host " - Go to https://dashboard.render.com -> New -> Web Service"
  Write-Host " - Connect GitHub repo, choose branch 'main', set Root Directory: backend"
  Write-Host " - Environment: Python 3.12"
  Write-Host " - Build Command: pip install -r requirements.txt"
  Write-Host " - Start Command: uvicorn backend.app.main:app --host 0.0.0.0 --port \$PORT"
  Write-Host " - Health check path: /health"
  Write-Host " - After create, set env vars: SILRA_API_KEY, ENV=prod, DATABASE_URL"

  Write-Host "`nOptional: create Render service via API (you will be prompted for Render API key)."
  $create = Read-Host "Attempt automatic Render creation now? (Y/N)"
  if ($create -ieq 'Y') {
    $renderKey = Read-Host -AsSecureString "Enter Render API Key (will not be shown)"
    $renderToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($renderKey))

    Write-Host "Preparing service payload..."
    $payload = @{
      service = @{
        name = "nfc-backend"
        repo = @{
          name = "<GITHUB_OWNER>/<GITHUB_REPO>"
          branch = "main"
        }
        buildCommand = "pip install -r requirements.txt"
        startCommand = "uvicorn backend.app.main:app --host 0.0.0.0 --port \$PORT"
        plan = "starter"
      }
    } | ConvertTo-Json -Depth 10

    Write-Host "Calling Render API to create service (response will be printed)."
    try {
      $resp = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method Post -Headers @{ Authorization = "Bearer $renderToken"; "Content-Type" = "application/json" } -Body $payload -ErrorAction Stop
      Write-Host "Render API response:"
      $resp | ConvertTo-Json -Depth 8
      Write-Host "`nPlease open Render dashboard to set environment variables (SILRA_API_KEY, ENV, DATABASE_URL) and wait for the deploy to complete."
    } catch {
      Write-Host "Render API call failed: $($_.Exception.Message)" -ForegroundColor Red
      Write-Host "Use the manual GUI steps above instead."
    }
  } else {
    Write-Host "Skipping automatic Render creation. Use the manual steps above to create the backend service."
  }

  Write-Host "`n5) After backend is live: set Vercel env `VITE_BACKEND_URL` to your backend URL (Production) and redeploy the frontend."
  Write-Host "Example (vercel CLI):"
  Write-Host "  vercel env add VITE_BACKEND_URL production https://your-backend-url"
  Write-Host "  Then trigger a redeploy in Vercel or run: vercel --prod --confirm"

  Write-Host "`n6) Final verification:"
  Write-Host " - Visit: https://<your-vercel-domain>/t/demo-token"
  Write-Host " - If backend is configured and SILRA_API_KEY set, AI features will work."
  Write-Host "`nScript finished."
  exit 0
} catch {
  Write-Host "Script error: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

