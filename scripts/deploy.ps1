# 手動デプロイ用スクリプト
# このスクリプトは管理者権限で実行する必要があります

param(
    [string]$DeployPath = "C:\inetpub\wwwroot\smart-invoice",
    [string]$BuildPath = ".\dist"
)

Write-Host "Starting deployment process..."

# ビルドパスの確認
if (-not (Test-Path $BuildPath)) {
    Write-Error "Build path does not exist: $BuildPath"
    Write-Host "Please run 'npm run build' first."
    exit 1
}

# IISモジュールのインポート
try {
    Import-Module WebAdministration -ErrorAction Stop
} catch {
    Write-Error "Failed to import WebAdministration module. Please ensure IIS Management Tools are installed."
    exit 1
}

$appPoolName = "AimsSaaSInvoiceAppPool"
$siteName = "AimsSaaSInvoice"

# アプリケーションプールを停止
Write-Host "Stopping application pool: $appPoolName"
if (Get-WebAppPoolState -Name $appPoolName -ErrorAction SilentlyContinue) {
    Stop-WebAppPool -Name $appPoolName
    Start-Sleep -Seconds 2
}

# バックアップの作成
Write-Host "Creating backup..."
$backupPath = "$DeployPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $DeployPath) {
    Copy-Item -Path $DeployPath -Destination $backupPath -Recurse -Force
    Write-Host "Backup created at: $backupPath"
}

# デプロイ先ディレクトリの作成
if (-not (Test-Path $DeployPath)) {
    New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
    Write-Host "Created deployment directory: $DeployPath"
}

# 既存ファイルの削除（web.configは保持）
Write-Host "Cleaning deployment directory..."
Get-ChildItem -Path $DeployPath -Exclude "web.config" | Remove-Item -Recurse -Force

# ビルド成果物のコピー
Write-Host "Copying build artifacts..."
Copy-Item -Path "$BuildPath\*" -Destination $DeployPath -Recurse -Force

# web.configの確認とコピー
$webConfigSource = Join-Path (Get-Location) "web.config"
if (Test-Path $webConfigSource) {
    if (-not (Test-Path "$DeployPath\web.config")) {
        Copy-Item -Path $webConfigSource -Destination "$DeployPath\web.config" -Force
        Write-Host "Copied web.config"
    }
} else {
    Write-Warning "web.config not found in project root. Please ensure it exists."
}

# アプリケーションプールの起動
Write-Host "Starting application pool: $appPoolName"
Start-WebAppPool -Name $appPoolName
Start-Sleep -Seconds 2

$state = (Get-WebAppPoolState -Name $appPoolName).Value
if ($state -ne "Started") {
    Write-Error "Failed to start application pool. Current state: $state"
    exit 1
}

# サイトの起動
Write-Host "Starting website: $siteName"
$site = Get-Website -Name $siteName -ErrorAction SilentlyContinue
if ($site) {
    if ($site.State -ne "Started") {
        Start-Website -Name $siteName
    }
    Write-Host "Website state: $($site.State)"
}

Write-Host "Deployment completed successfully!"
Write-Host "Deployment path: $DeployPath"

