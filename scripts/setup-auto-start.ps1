# Windows起動時にIISアプリケーションプールを自動起動するスクリプト
# このスクリプトは管理者権限で実行する必要があります

$appPoolName = "AimsSaaSInvoiceAppPool"
$taskName = "StartAimsSaaSInvoiceAppPool"

Write-Host "Setting up auto-start for IIS Application Pool: $appPoolName"

# 既存のタスクが存在する場合は削除
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing scheduled task: $taskName"
}

# PowerShellスクリプトのパス（このスクリプトと同じディレクトリ）
$scriptPath = Join-Path $PSScriptRoot "start-app-pool.ps1"

# タスクスケジューラにタスクを作成
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Automatically start SmartInvoice Application Pool on Windows startup"

Write-Host "Scheduled task created successfully: $taskName"
Write-Host "The application pool will start automatically when Windows starts."

