$env:PORT = "3001"
$env:BASE_URL = "http://localhost:3001"
$env:TEST_BASE_URL = "http://localhost:3001"
$server = Start-Process -FilePath "node" -ArgumentList "./node_modules/next/dist/bin/next", "start", "-p", "3001" -PassThru -NoNewWindow
Write-Host "Started Next.js server with PID $($server.Id)... Waiting 5s for warmup..."
Start-Sleep -Seconds 5

try {
    Write-Host "`nRunning test_auth_autologin.js..."
    node ./scripts/test_auth_autologin.js

    Write-Host "`nRunning test_viva_e2e.js..."
    node ./scripts/test_viva_e2e.js

    Write-Host "`nRunning verify_landing_and_demo.js..."
    node ./scripts/verify_landing_and_demo.js

    Write-Host "`nRunning verify_production_endpoints.js..."
    node ./scripts/verify_production_endpoints.js

    Write-Host "`nRunning test_phase8_production.js..."
    node ./test_phase8_production.js
} finally {
    Write-Host "`nStopping Next.js server PID $($server.Id)..."
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
