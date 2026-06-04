param(
    [int]$Port = 8081
)

$ErrorActionPreference = "Stop"

function Stop-ExistingBackend {
    param([int]$Port)

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $processId = $listener.OwningProcess
        if (-not $processId -or $processId -eq 0) {
            continue
        }

        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        $commandLine = if ($processInfo) { $processInfo.CommandLine } else { "" }
        Write-Host "Stopping process $processId on backend port $Port..."
        if ($commandLine) {
            Write-Host $commandLine
        }
        Stop-Process -Id $processId -Force
        Start-Sleep -Seconds 2
    }
}

$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

Stop-ExistingBackend -Port $Port

Write-Host "Starting Spring Boot backend on port $Port..."
$env:SERVER_PORT = "$Port"
& .\mvnw.cmd spring-boot:run
