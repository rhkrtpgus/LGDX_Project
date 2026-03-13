param(
  [string]$Port = "8082"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdout = Join-Path $logDir "bootrun.$timestamp.out.log"
$stderr = Join-Path $logDir "bootrun.$timestamp.err.log"

$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
$env:GRADLE_USER_HOME = Join-Path $projectRoot ".gradle-home"
$env:DB_HOST = "localhost"
$env:DB_PORT = "3355"
$env:DB_NAME = "lgdx"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "12345"

$process = Start-Process `
  -FilePath "powershell.exe" `
  -WorkingDirectory $projectRoot `
  -ArgumentList @(
    "-NoProfile",
    "-Command",
    "& '.\gradlew.bat' bootRun --args='--server.port=$Port'"
  ) `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$process.Id
