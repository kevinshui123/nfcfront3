$body = @{ 
  name = "nfcfront3"
  gitSource = @{
    type = "github"
    repoId = 1128752470
    org = "kevinshui123"
    repo = "nfcfront3"
    ref = "main"
    sha = "22db4d68680cdf17e80303620e3dd1be3e1870c2"
  }
  target = "production"
}
$hdr = @{ Authorization = 'Bearer RracBRRgbNu5AWzW4IyXEkQt'; 'Content-Type' = 'application/json' }
try {
  $resp = Invoke-RestMethod -Uri 'https://api.vercel.com/v13/now/deployments' -Method Post -Headers $hdr -Body (ConvertTo-Json $body -Depth 10)
  $resp | ConvertTo-Json -Depth 10
} catch { Write-Output "ERROR: $_" }
