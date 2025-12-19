# デプロイメントガイド

## 概要

このドキュメントでは、Smart InvoiceアプリケーションをWindows IISサーバーに自動デプロイする手順を説明します。

## 前提条件

### サーバー環境

- Windows Server（IISがインストールされていること）
- Node.js 20.18.0
- npm 10.8.2
- GitHub Actions Runner（self-hosted）がインストール・設定されていること

### IISの設定

- IIS Management Toolsがインストールされていること
- URL Rewriteモジュールがインストールされていること
- HTTPS証明書が設定されていること（本番環境用）

## 初回セットアップ

### 1. GitHub Actions Runnerの設定

1. GitHubリポジトリの「Settings」→「Actions」→「Runners」に移動
2. 「New self-hosted runner」をクリック
3. 表示される手順に従って、Windowsサーバー上でActions Runnerをインストール・設定

### 2. IISの初期設定

管理者権限でPowerShellを開き、以下のコマンドを実行：

```powershell
# IISモジュールのインポート
Import-Module WebAdministration

# アプリケーションプールの作成
New-WebAppPool -Name "AimsSaaSInvoiceAppPool"
Set-ItemProperty -Path "IIS:\AppPools\AimsSaaSInvoiceAppPool" -Name managedRuntimeVersion -Value ""
Set-ItemProperty -Path "IIS:\AppPools\AimsSaaSInvoiceAppPool" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty -Path "IIS:\AppPools\AimsSaaSInvoiceAppPool" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)

# デプロイ先ディレクトリの作成
$deployPath = "C:\inetpub\wwwroot\smart-invoice"
New-Item -ItemType Directory -Path $deployPath -Force

# サイトの作成（初回のみ）
New-Website -Name "SmartInvoice" -PhysicalPath $deployPath -Port 443 -ApplicationPool "AimsSaaSInvoiceAppPool"
```

### 3. HTTPS証明書の設定

本番環境では適切なSSL証明書を設定してください：

```powershell
# 証明書のインポート（必要に応じて）
# $certPath = "C:\path\to\certificate.pfx"
# $certPassword = ConvertTo-SecureString -String "your-password" -Force -AsPlainText
# Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\My -Password $certPassword

# サイトにHTTPSバインディングを追加
$siteName = "AimsSaaSInvoice"
$hostName = "25.20.10.200"
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*$hostName*" } | Select-Object -First 1

if ($cert) {
    New-WebBinding -Name $siteName -Protocol https -Port 443 -SslFlags 0
    (Get-WebBinding -Name $siteName -Protocol https).AddSslCertificate($cert.Thumbprint, "My")
}
```

### 4. Windows起動時の自動起動設定

管理者権限でPowerShellを開き、以下のコマンドを実行：

```powershell
cd C:\smart-invoice
.\scripts\setup-auto-start.ps1
```

これにより、Windows起動時に自動的にIISアプリケーションプールが起動するようになります。

## 自動デプロイ

### GitHub Actionsによる自動デプロイ

`main`ブランチにpushすると、自動的に以下の処理が実行されます：

1. コードのチェックアウト
2. 依存関係のインストール
3. アプリケーションのビルド
4. 既存デプロイのバックアップ
5. IISへのデプロイ
6. IISサイトとアプリケーションプールの設定
7. アプリケーションプールの起動

### デプロイの確認

デプロイが完了したら、以下のURLでアクセスできます：

- HTTPS: `https://25.20.10.200`

## 手動デプロイ

自動デプロイが使用できない場合、手動でデプロイすることもできます：

```powershell
# 1. アプリケーションのビルド
npm ci
npm run build

# 2. デプロイスクリプトの実行（管理者権限で）
.\scripts\deploy.ps1
```

## トラブルシューティング

### アプリケーションプールが起動しない

```powershell
# アプリケーションプールの状態を確認
Import-Module WebAdministration
Get-WebAppPoolState -Name "AimsSaaSInvoiceAppPool"

# 手動で起動
Start-WebAppPool -Name "AimsSaaSInvoiceAppPool"
```

### サイトにアクセスできない

1. IISマネージャーでサイトの状態を確認
2. アプリケーションプールが起動しているか確認
3. ポート443が開いているか確認
4. ファイアウォールの設定を確認

### HTTPS証明書のエラー

- 証明書が正しくインストールされているか確認
- 証明書の有効期限を確認
- 証明書のサブジェクト名がホスト名と一致しているか確認

## バックアップとロールバック

GitHub Actionsワークフローは、デプロイ前に自動的にバックアップを作成します。
バックアップは `C:\inetpub\wwwroot\smart-invoice-backup-YYYYMMDD-HHMMSS` に保存されます。

ロールバックが必要な場合：

```powershell
$backupPath = "C:\inetpub\wwwroot\smart-invoice-backup-YYYYMMDD-HHMMSS"
$deployPath = "C:\inetpub\wwwroot\smart-invoice"

# アプリケーションプールを停止
Stop-WebAppPool -Name "AimsSaaSInvoiceAppPool"

# バックアップから復元
Remove-Item -Path $deployPath -Recurse -Force
Copy-Item -Path $backupPath -Destination $deployPath -Recurse -Force

# アプリケーションプールを起動
Start-WebAppPool -Name "AimsSaaSInvoiceAppPool"
```

## セキュリティに関する注意事項

1. **HTTPS証明書**: 本番環境では適切なSSL証明書を使用してください
2. **ファイアウォール**: 必要なポートのみを開放してください
3. **アクセス制御**: IISの認証設定を適切に構成してください
4. **ログ**: 定期的にIISログを確認してください

## 参考資料

- [IIS公式ドキュメント](https://docs.microsoft.com/ja-jp/iis/)
- [GitHub Actions Runner](https://docs.github.com/ja/actions/hosting-your-own-runners)
- [PWA設定ガイド](https://vite-pwa-org.netlify.app/)
