param(
  [string]$Port = "8000"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (!(Test-Path $pythonExe)) {
  $pythonExe = "python"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdout = Join-Path $logDir "fastapi.$timestamp.out.log"
$stderr = Join-Path $logDir "fastapi.$timestamp.err.log"

$process = Start-Process `
  -FilePath "powershell.exe" `
  -WorkingDirectory $projectRoot `
  -ArgumentList @(
    "-NoProfile",
    "-Command",
    "& '$pythonExe' -m uvicorn app.main:app --host 0.0.0.0 --port $Port"
  ) `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$process.Id
