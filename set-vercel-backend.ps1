<#
set-vercel-backend.ps1

Usage:
  1. Ensure you have vercel CLI installed and are logged in (`vercel login`).
  2. Run this script in project root: .\set-vercel-backend.ps1
  3. When prompted, paste your backend public URL (e.g. https://your-backend.onrender.com)
  4. The script will add `VITE_BACKEND_URL` to Vercel (production) and trigger a deploy.
#>

function Read-Visible($prompt) {
  Write-Host -NoNewline ($prompt + ": ")
  return Read-Host
}

Write-Host "Set Vercel VITE_BACKEND_URL and redeploy"
$backend = Read-Visible "Enter backend URL (e.g. https://your-backend.onrender.com)"
if (-not $backend) { Write-Host "No backend URL provided, aborting." ; exit 1 }

Write-Host "Adding VITE_BACKEND_URL to Vercel (production)..."
try {
  vercel env add VITE_BACKEND_URL production $backend --yes
  Write-Host "Environment variable added. Triggering production deploy..."
  # Redeploy the current linked project
  vercel --prod --yes
  Write-Host "Redeploy triggered. Visit your Vercel project to monitor deployment."
} catch {
  Write-Host "Failed to add env or deploy: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Alternative: go to Vercel dashboard -> Settings -> Environment Variables and add VITE_BACKEND_URL manually, then redeploy."
}


