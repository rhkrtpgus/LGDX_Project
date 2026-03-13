param(
  [string]$SpringPort = "8082",
  [string]$FastApiPort = "8000"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting Spring Boot on port $SpringPort"
$springPid = & (Join-Path $root "Back\scripts\start-backend.ps1") -Port $SpringPort
Write-Host "Spring Boot PID: $springPid"

Write-Host "Starting FastAPI on port $FastApiPort"
$fastapiPid = & (Join-Path $root "FastAPI\scripts\start-fastapi.ps1") -Port $FastApiPort
Write-Host "FastAPI PID: $fastapiPid"

Write-Host "Rebuilding frontend"
Push-Location (Join-Path $root "Front")
try {
  npm.cmd run build | Out-Host
} finally {
  Pop-Location
}

Write-Host "Reloading Nginx"
Push-Location $root
try {
  docker compose -f docker-compose.nginx.yml up -d | Out-Host
} finally {
  Pop-Location
}

Write-Host "Started. Spring=$springPid FastAPI=$fastapiPid"
