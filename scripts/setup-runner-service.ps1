# GitHub Actions Runner サービスを SYSTEM アカウントで実行するように設定するスクリプト
# このスクリプトは管理者権限で実行する必要があります

Write-Host "Setting up GitHub Actions Runner service to run as SYSTEM account..."

# 管理者権限のチェック
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

# ランナーサービスの検索（複数のパターンで試行）
$serviceName = $null
$possibleServiceNames = @(
    "actions.runner.*",
    "*GitHub Actions Runner*",
    "*actions_runner*"
)

foreach ($pattern in $possibleServiceNames) {
    $services = Get-Service | Where-Object { 
        $_.Name -like $pattern -or $_.DisplayName -like $pattern 
    }
    
    if ($services) {
        $serviceName = $services[0].Name
        Write-Host "Found runner service: $serviceName (DisplayName: $($services[0].DisplayName))"
        break
    }
}

if (-not $serviceName) {
    Write-Error "GitHub Actions Runner service not found."
    Write-Host "Please check if the runner service is installed."
    Write-Host "You can list all services with: Get-Service | Where-Object { `$_.DisplayName -like '*runner*' }"
    exit 1
}

# 現在のサービス設定を確認
$service = Get-Service -Name $serviceName
Write-Host "Current service status: $($service.Status)"
Write-Host "Current service account: $(Get-WmiObject Win32_Service -Filter "Name='$serviceName'" | Select-Object -ExpandProperty StartName)"

# サービスを停止
if ($service.Status -eq 'Running') {
    Write-Host "Stopping service: $serviceName"
    Stop-Service -Name $serviceName -Force
    Start-Sleep -Seconds 2
    
    # サービスが停止するまで待機
    $timeout = 30
    $elapsed = 0
    while ($service.Status -ne 'Stopped' -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $service.Refresh()
        $elapsed++
    }
    
    if ($service.Status -ne 'Stopped') {
        Write-Error "Failed to stop service within $timeout seconds."
        exit 1
    }
    Write-Host "Service stopped successfully"
}

# SYSTEMアカウントで実行するように設定
Write-Host "Configuring service to run as SYSTEM account..."
try {
    $result = sc.exe config $serviceName obj= "NT AUTHORITY\SYSTEM"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Service configured successfully"
    } else {
        Write-Error "Failed to configure service. Exit code: $LASTEXITCODE"
        Write-Host "sc.exe output: $result"
        exit 1
    }
} catch {
    Write-Error "Failed to configure service: $_"
    exit 1
}

# サービスを開始
Write-Host "Starting service: $serviceName"
try {
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 2
    
    # サービスが起動するまで待機
    $timeout = 30
    $elapsed = 0
    while ($service.Status -ne 'Running' -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $service.Refresh()
        $elapsed++
    }
    
    if ($service.Status -eq 'Running') {
        Write-Host "Service started successfully"
        
        # 設定を確認
        $serviceAccount = (Get-WmiObject Win32_Service -Filter "Name='$serviceName'").StartName
        Write-Host "Service is now running as: $serviceAccount"
        Write-Host "Setup completed successfully!"
    } else {
        Write-Error "Failed to start service within $timeout seconds. Current status: $($service.Status)"
        exit 1
    }
} catch {
    Write-Error "Failed to start service: $_"
    exit 1
}

