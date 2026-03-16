param(
  [string]$Port = "8000"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "start-fastapi.ps1"
if (!(Test-Path $scriptPath)) {
  throw "start-fastapi.ps1 not found: $scriptPath"
}

& $scriptPath -Port $Port -StopDockerFastApi
