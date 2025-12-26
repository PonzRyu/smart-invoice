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

### バックエンドAPIサーバー

- バックエンドAPIサーバーが起動していること
- フロントエンドからアクセス可能なURLを設定すること（環境変数で指定）

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

#### 3.1 証明書の作成とPFXファイルのエクスポート

##### IISマネージャーから自己署名証明書を作成する方法

IISマネージャーから直接自己署名証明書を作成できます：

1. **IISマネージャーを開く**
   - `Win + R` を押して「ファイル名を指定して実行」を開く
   - `inetmgr` と入力してEnterキーを押す
   - または、コントロールパネル → 管理ツール → IIS（インターネットインフォメーションサービス）マネージャー

2. **証明書を作成**
   - 左側のツリーでサーバーノード（サーバー名）をクリック
   - 中央の「サーバー証明書」をダブルクリック
   - 右側のアクションウィンドウで「自己署名証明書の作成」をクリック

3. **証明書情報を入力**
   - フレンドリ名（例：`Smart Invoice Certificate`）
   - 証明書ストア：個人（Personal）

4. **完了**
   - 「OK」をクリックすると証明書が作成されます
   - 証明書が「個人」ストアに保存されます

**注意**: IISマネージャーから作成した証明書をPFXファイルとしてエクスポートするには、次に説明する「Windows証明書管理コンソール」を使用してください。

##### PFXファイルのエクスポート方法

**方法1: Windows証明書管理コンソール（GUI）を使用**

IISマネージャーから直接エクスポートはできませんが、Windows証明書管理コンソールを使用してGUIでエクスポートできます：

1. **証明書管理コンソールを開く**
   - `Win + R` を押して「ファイル名を指定して実行」を開く
   - `certlm.msc` と入力してEnterキーを押す
   - または、管理者権限でPowerShellから実行：`certlm.msc`

2. **証明書を探す**
   - 左側のツリーで「個人」→「証明書」を展開
   - エクスポートしたい証明書を見つける（サブジェクト名や発行先で確認）

3. **証明書をエクスポート**
   - 証明書を右クリック → 「すべてのタスク」→「エクスポート」
   - 「証明書のエクスポート ウィザード」が開く

4. **エクスポート設定**
   - 「次へ」をクリック
   - 「はい、秘密キーをエクスポートします」を選択 → 「次へ」
   - 「Personal Information Exchange - PKCS #12 (.PFX)」が選択されていることを確認
   - 必要に応じて「証明書パスにある証明書を可能であればすべて含める」にチェック → 「次へ」

5. **パスワード設定**
   - PFXファイルのパスワードを入力（確認のため2回入力）
   - 「次へ」

6. **ファイル名を指定**
   - エクスポート先のファイルパスを指定（例：`C:\path\to\certificate.pfx`）
   - 「次へ」→「完了」

**注意**: 証明書の秘密鍵にアクセス権限がない場合、「はい、秘密キーをエクスポートします」オプションがグレーアウトされます。その場合は、PowerShellでアクセス権限を設定するか、スクリプトを使用してください。

**方法2: スクリプトを使用（推奨）**

管理者権限でPowerShellを開き、以下のコマンドを実行：

```powershell
# 既存の証明書からPFXファイルをエクスポート
.\scripts\export-certificate-pfx.ps1 `
    -DnsName "25.20.10.200" `
    -OutputPath "C:\path\to\certificate.pfx" `
    -Password "YourSecurePassword123!"
```

または、サムプリントを指定：

```powershell
.\scripts\export-certificate-pfx.ps1 `
    -Thumbprint "証明書のサムプリント" `
    -OutputPath "C:\path\to\certificate.pfx" `
    -Password "YourSecurePassword123!"
```

**方法3: PowerShellコマンドを直接実行**

```powershell
# 自己署名証明書を作成（開発・テスト用）
$cert = New-SelfSignedCertificate `
    -DnsName "25.20.10.200", "localhost" `
    -CertStoreLocation "Cert:\LocalMachine\My" `
    -FriendlyName "Smart Invoice Certificate" `
    -NotAfter (Get-Date).AddYears(1)

# 証明書の秘密鍵へのアクセス権限を設定
$keyContainerName = $cert.PrivateKey.CspKeyContainerInfo.UniqueKeyContainerName
$keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$keyContainerName"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl $keyPath
$permission = $currentUser, "FullControl", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $keyPath $acl

# PFXファイルにエクスポート
$password = ConvertTo-SecureString -String "YourPassword123!" -Force -AsPlainText
$pfxPath = "C:\path\to\certificate.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password
```

**方法4: 既存の証明書からエクスポート（PowerShell）**

```powershell
# 証明書を検索
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {
    $_.Subject -like "*your-domain*"
} | Select-Object -First 1

# 秘密鍵へのアクセス権限を設定（必要な場合）
$keyContainerName = $cert.PrivateKey.CspKeyContainerInfo.UniqueKeyContainerName
$keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$keyContainerName"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl $keyPath
$permission = $currentUser, "FullControl", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $keyPath $acl

# PFXファイルにエクスポート
$password = ConvertTo-SecureString -String "YourPassword123!" -Force -AsPlainText
$pfxPath = "C:\path\to\certificate.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password
```

**トラブルシューティング: アクセスが拒否された場合**

エラー `Export-PfxCertificate : アクセスが拒否されました` が発生する場合：

1. **PowerShellを管理者権限で実行しているか確認**
2. **秘密鍵へのアクセス権限を手動で設定**：

```powershell
# 証明書のサムプリントを確認
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {
    $_.Subject -like "*your-domain*"
} | Select-Object -First 1
$cert.Thumbprint

# 秘密鍵のパスを確認
$keyContainerName = $cert.PrivateKey.CspKeyContainerInfo.UniqueKeyContainerName
$keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$keyContainerName"

# アクセス権限を設定
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl $keyPath
$permission = $currentUser, "FullControl", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $keyPath $acl
```

#### 3.2 証明書のインポートとIIS設定

```powershell
# PFXファイルから証明書をインポート（必要に応じて）
$certPath = "C:\path\to\certificate.pfx"
$certPassword = ConvertTo-SecureString -String "your-password" -Force -AsPlainText
Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\My -Password $certPassword

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

## 環境変数の設定

### フロントエンドの環境変数

本番環境でバックエンドAPIのURLを設定するには、GitHub ActionsのSecretsまたは環境変数を使用します。

#### GitHub Actions Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下のシークレットを追加：
   - Name: `VITE_API_BASE_URL`
   - Value: バックエンドAPIのURL（例: `https://api.example.com` または `/api`）

#### 環境変数の設定方法

- **絶対URL**: `https://api.example.com` - 別ドメインのバックエンドAPI
- **相対パス**: `/api` - 同じドメインで提供する場合（プロキシ設定が必要）
- **未設定時**: `http://localhost:3001` がデフォルト値として使用されます

**注意**: Viteでは環境変数に`VITE_`プレフィックスが必要です。

## 自動デプロイ

### GitHub Actionsによる自動デプロイ

`main`ブランチにpushすると、自動的に以下の処理が実行されます：

1. コードのチェックアウト
2. 依存関係のインストール
3. アプリケーションのビルド（環境変数`VITE_API_BASE_URL`を使用）
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
