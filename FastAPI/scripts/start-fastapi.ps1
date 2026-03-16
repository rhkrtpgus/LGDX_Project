param(
  [string]$Port = "8000",
  [switch]$StopDockerFastApi
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot
$logDir = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (!(Test-Path $pythonExe)) {
  $pythonExe = "python"
}

if ($StopDockerFastApi) {
  $dockerCompose = Join-Path $repoRoot "docker-compose.yml"
  if (Test-Path $dockerCompose) {
    try {
      docker compose stop fastapi | Out-Null
    }
    catch {
      Write-Warning "Docker FastAPI 컨테이너를 중지하지 못했습니다. 포트 $Port 사용 여부를 확인해 주세요."
    }
  }
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
    "`$env:ADDICTION_MONITOR_PYTHON_COMMAND='$pythonExe'; & '$pythonExe' -m uvicorn app.main:app --host 0.0.0.0 --port $Port"
  ) `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$process.Id
