$body = @{
    source = @(16.5185, 80.621)
    destination = @(16.5062, 80.6635)
} | ConvertTo-Json

Write-Host "Testing /api/v1/routes ..."
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/routes' -Method POST -ContentType 'application/json' -Body $body
    $result | ConvertTo-Json -Depth 4
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $_.ErrorDetails.Message
}

Write-Host "`nTesting /api/v1/safety ..."
$safetyBody = @{
    lat = 16.5185
    lon = 80.621
} | ConvertTo-Json
try {
    $result2 = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/safety' -Method POST -ContentType 'application/json' -Body $safetyBody
    $result2 | ConvertTo-Json -Depth 4
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $_.ErrorDetails.Message
}
