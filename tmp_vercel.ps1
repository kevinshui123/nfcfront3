 = Invoke-RestMethod -Headers @{Authorization='Bearer RracBRRgbNu5AWzW4IyXEkQt'} -Uri 'https://api.vercel.com/v1/projects'
 = .projects | Where-Object { .name -eq 'nfcfront3' }
if () {
   | ConvertTo-Json -Depth 6
} else {
  Write-Output 'NOT_FOUND'
}
