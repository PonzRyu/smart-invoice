# IISアプリケーションプールを起動するスクリプト
# タスクスケジューラから呼び出されます

$appPoolName = "AimsSaaSInvoiceAppPool"
$siteName = "AimsSaaSInvoice"

try {
    Import-Module WebAdministration -ErrorAction Stop
    
    # アプリケーションプールの状態を確認
    $appPool = Get-WebAppPoolState -Name $appPoolName -ErrorAction SilentlyContinue
    
    if (-not $appPool) {
        Write-Host "Application pool '$appPoolName' does not exist. Creating..."
        New-WebAppPool -Name $appPoolName
        Set-ItemProperty -Path "IIS:\AppPools\$appPoolName" -Name managedRuntimeVersion -Value ""
        Set-ItemProperty -Path "IIS:\AppPools\$appPoolName" -Name startMode -Value "AlwaysRunning"
        Set-ItemProperty -Path "IIS:\AppPools\$appPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
    }
    
    # アプリケーションプールを起動
    $state = (Get-WebAppPoolState -Name $appPoolName).Value
    if ($state -ne "Started") {
        Start-WebAppPool -Name $appPoolName
        Start-Sleep -Seconds 2
        
        $newState = (Get-WebAppPoolState -Name $appPoolName).Value
        if ($newState -eq "Started") {
            Write-Host "Application pool '$appPoolName' started successfully."
        } else {
            Write-Error "Failed to start application pool '$appPoolName'. Current state: $newState"
            exit 1
        }
    } else {
        Write-Host "Application pool '$appPoolName' is already running."
    }
    
    # サイトを起動
    $site = Get-Website -Name $siteName -ErrorAction SilentlyContinue
    if ($site) {
        if ($site.State -ne "Started") {
            Start-Website -Name $siteName
            Write-Host "Website '$siteName' started successfully."
        } else {
            Write-Host "Website '$siteName' is already running."
        }
    }
    
    Write-Host "Auto-start script completed successfully."
} catch {
    Write-Error "Error in auto-start script: $_"
    exit 1
}

