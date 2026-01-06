<#
 upload-to-github.ps1

 PowerShell one-shot helper to:
 1) initialize git if needed
 2) create a GitHub repo via API using a personal access token (entered interactively)
 3) push the current directory to the new repo (main branch)
 4) reset remote to a clean URL (no token embedded)

 SECURITY:
 - Do NOT paste tokens into chats. Enter token when prompted in your local terminal only.
 - After successful push, immediately revoke the token in GitHub settings (Developer settings -> Personal access tokens).

 Usage:
 - Open PowerShell in the project root (the folder that contains package.json)
 - Run: .\upload-to-github.ps1
 - Follow prompts.
#>

function Read-Secret($prompt) {
  # Use subexpression to avoid PowerShell parsing the colon as part of the variable name
  Write-Host -NoNewline ("$($prompt): ")
  $s = Read-Host -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

Write-Host "=== GitHub One-shot Upload Helper ==="

$user = Read-Host "GitHub username (owner of the new repo)"
$repo = Read-Host "New repository name (will be created)"
$isPrivate = Read-Host "Make repo private? (y/N)"
if ($isPrivate -match '^[Yy]') { $private = $true } else { $private = $false }

$token = Read-Secret "Enter your GitHub Personal Access Token (will be used locally only)"
if (-not $token) {
  Write-Host "No token provided, aborting." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
  Write-Host "Initialized new git repository."
}

# Ensure .gitignore has node_modules
if (-not (Test-Path ".gitignore")) {
  "@node_modules`n.DS_Store`n.env" | Out-File -Encoding utf8 .gitignore
  Write-Host "Created basic .gitignore."
} else {
  $gi = Get-Content .gitignore -ErrorAction SilentlyContinue
  if ($gi -notcontains "node_modules") {
    Add-Content -Path .gitignore -Value "`nnode_modules"
    Write-Host "Appended node_modules to .gitignore."
  }
}

# Create GitHub repo via API
$createUrl = "https://api.github.com/user/repos"
$body = @{
  name = $repo
  description = "admin_frontend deployed via helper script"
  private = $private
} | ConvertTo-Json

$headers = @{
  Authorization = "token $token"
  Accept = "application/vnd.github.v3+json"
  "User-Agent" = "$user-upload-script"
}

Write-Host "Creating repository on GitHub..."
try {
  $resp = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $body
  Write-Host "Repository created: $($resp.html_url)"
} catch {
  Write-Host "Failed to create repository: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "If the repo already exists, you can create it manually and re-run the script."
  exit 1
}

# Add all files and commit
git add -A
git commit -m "chore: initial commit (upload via script)" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "No changes to commit or commit failed (check git config user.name/user.email)." -ForegroundColor Yellow
}

# Push using token-embedded remote temporarily
$remoteWithToken = "https://$($user):$($token)@github.com/$($user)/$($repo).git"
git remote remove origin 2>$null
git remote add origin $remoteWithToken

Write-Host "Pushing to GitHub (this uses the token locally only)..."
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Push to main failed; trying master branch..." -ForegroundColor Yellow
  git push -u origin master
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Please check your git credentials and network." -ForegroundColor Red
    exit 1
  }
}

# Reset remote to tokenless URL
$cleanRemote = "https://github.com/$($user)/$($repo).git"
git remote set-url origin $cleanRemote
Write-Host "Remote reset to: $cleanRemote"

Write-Host ""
Write-Host "=== Upload complete ===" -ForegroundColor Green
Write-Host "IMPORTANT: Revoke the token you entered now in GitHub Developer Settings -> Personal access tokens."
Write-Host "Next: go to Vercel and Import this repository to deploy, or tell me and I will deploy it for you."
Write-Host ""
Write-Host "Note: If you double-clicked this script the window may close immediately. Run it from PowerShell instead:"
Write-Host "  1) Open PowerShell, cd to project folder"
Write-Host "  2) Run: .\\upload-to-github.ps1"
Write-Host ""
# Pause so user can read output when running by double-click
try {
  Read-Host "Press Enter to exit"
} catch {
  # ignore if running non-interactive
}


