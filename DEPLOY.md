# デプロイ手順書

## 概要

このドキュメントでは、Smart Invoiceアプリケーションを社内のWindows 11 Proサーバー（25.20.10.201）にデプロイする手順を説明します。

## 前提条件

- Windows 11 Pro（25.20.10.201）
- Node.js 20.18.0
- npm 10.8.2
- PostgreSQL（データベースサーバー）
- GitHubアカウントとリポジトリへのアクセス権限

## GitHubトークンの発行方法

### Self-hosted Runner登録用トークン

Self-hosted Runnerを登録する際に必要な一時トークンは、以下の手順で取得できます：

1. GitHubリポジトリにアクセス
2. **Settings** → **Actions** → **Runners** → **New self-hosted runner** を開く
3. **OS: Windows**、**Architecture: x64** を選択
4. 表示される **Configure** セクションの **Token** をコピー
   - このトークンは24時間有効で、一度使用すると無効になります
   - ランナー登録時にのみ使用します

### Personal Access Token（PAT）の発行（プライベートリポジトリの場合）

プライベートリポジトリをクローンする場合や、GitHub APIを使用する場合は、Personal Access Tokenが必要です：

1. GitHubにログイン
2. 右上のプロフィールアイコンをクリック → **Settings**
3. 左サイドバーの **Developer settings** をクリック
4. **Personal access tokens** → **Tokens (classic)** を選択
5. **Generate new token** → **Generate new token (classic)** をクリック
6. 以下の設定を行います：
   - **Note**: トークンの説明（例: "Smart Invoice Deploy"）
   - **Expiration**: 有効期限を設定（推奨: 90日またはカスタム）
   - **Scopes**: 以下の権限にチェックを入れる
     - `repo`（リポジトリへのフルアクセス）
     - `workflow`（GitHub Actionsワークフローの管理）
7. **Generate token** をクリック
8. **表示されるトークンをすぐにコピーして安全な場所に保存**
   - このトークンは一度しか表示されません
   - 失くした場合は再発行が必要です

**注意**: Personal Access Tokenは機密情報です。環境変数やシークレット管理ツールで安全に管理してください。

## 初回セットアップ

### 1. GitHub Actions Self-hosted Runnerのセットアップ

#### 1-1. GitHubリポジトリでランナーを登録

1. GitHubリポジトリの **Settings** → **Actions** → **Runners** → **New self-hosted runner** にアクセス
2. **OS: Windows**、**Architecture: x64** を選択
3. 表示されるページに、**Configure** セクションが表示されます
4. このセクションに表示される **トークン（Token）** をコピーします
   - このトークンは一時的なもので、ランナー登録時にのみ使用されます
   - トークンは24時間有効です
   - トークンは一度使用すると無効になります
5. 表示される `config.cmd` コマンドも確認します（後で使用）

#### 1-2. サーバー（25.20.10.201）でランナーをセットアップ

管理者権限でPowerShellを開き、以下を実行：

```powershell
# ランナー用ディレクトリを作成
cd C:\
mkdir actions-runner
cd actions-runner

# 最新のランナーをダウンロード
// Download the latest runner package
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.330.0/actions-runner-win-x64-2.330.0.zip -OutFile actions-runner-win-x64-2.330.0.zip
// Extract the installer
Add-Type -AssemblyName System.IO.Compression.FileSystem ;
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\actions-runner-win-x64-2.330.0.zip", "$PWD")

うまくいかない場合、以下のリンクを参照
https://github.com/actions/runner/releases

# 設定（1-1で取得したトークンを使用）
# YOUR_TOKEN の部分を、1-1でコピーしたトークンに置き換えてください
.\config.cmd --url https://github.com/your-username/smart-invoice --token YOUR_TOKEN

# サービスを起動
Start-Service SERVICE_NAME
```

### 2. Node.jsとnpmの確認

```powershell
node --version  # 20.18.0であることを確認
npm --version   # 10.8.2であることを確認
```

### 3. PM2のインストール

```powershell
npm install -g pm2
```

### 4. デプロイディレクトリの作成

```powershell
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\logs -Force
```

### 5. 環境変数ファイルの作成

`C:\dev\smart-invoice\backend\.env` を作成し、以下を設定：

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 6. 初回手動デプロイ（データベースマイグレーション実行）

```powershell
# リポジトリをクローン（初回のみ）
cd C:\
git clone https://github.com/your-username/smart-invoice.git smart-invoice-source

# フロントエンドをビルド
cd smart-invoice-source
npm install
npm run build

# バックエンドをビルド
cd backend
npm install --production
npm run build

# ファイルをデプロイディレクトリにコピー
Copy-Item -Path ..\dist -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\dist -Recurse -Force
Copy-Item -Path dist -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\dist -Recurse -Force
Copy-Item -Path node_modules -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\node_modules -Recurse -Force
Copy-Item -Path package.json -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
Copy-Item -Path ecosystem.config.js -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
Copy-Item -Path tsconfig.json -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database -Force
Copy-Item -Path src\database\entities -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database\entities -Recurse -Force
Copy-Item -Path src\database\migrations -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database\migrations -Recurse -Force

# データベースマイグレーション実行（初回のみ）
cd C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend
npm run migration:run

# PM2でアプリケーションを起動
pm2 start ecosystem.config.js
pm2 save

# Windows起動時に自動起動するように設定
pm2 startup
# 表示されたコマンドを管理者権限で実行
```

## 自動デプロイ

初回セットアップ後は、`main`ブランチにプッシュするだけで自動的にデプロイされます。

### デプロイの流れ

1. コードを`main`ブランチにプッシュ
2. GitHub Actionsが自動実行
3. フロントエンドとバックエンドをビルド
4. ビルド成果物を`C:\Users\ESL-VM-SERVER1\dev\smart-invoice`にコピー
5. PM2でアプリケーションを再起動

### 手動でデプロイを実行する場合

GitHubリポジトリの **Actions** タブから、**Deploy to Windows Server** ワークフローを選択し、**Run workflow** をクリック。

## アプリケーションの管理

### PM2コマンド

```powershell
# アプリケーションの状態確認
pm2 status

# ログの確認
pm2 logs smart-invoice-backend

# 再起動
pm2 restart smart-invoice-backend

# 停止
pm2 stop smart-invoice-backend

# 削除
pm2 delete smart-invoice-backend

# リアルタイムモニタリング
pm2 monit
```

### アプリケーションへのアクセス

- URL: `http://25.20.10.201:3001`
- または: `http://localhost:3001`（サーバー上から）

## トラブルシューティング

### PM2がアプリケーションを起動できない

```powershell
# ログを確認
pm2 logs smart-invoice-backend --lines 100

# 環境変数を確認
pm2 env 0
```

### データベース接続エラー

- `.env`ファイルの設定を確認
- PostgreSQLが起動しているか確認
- ファイアウォール設定を確認

### 静的ファイルが表示されない

- `C:\Users\ESL-VM-SERVER1\dev\smart-invoice\dist`ディレクトリにファイルが存在するか確認
- バックエンドのログでエラーがないか確認

## 注意事項

- `.env`ファイルはGitにコミットしないでください
- 本番環境のデータベースパスワードは安全に管理してください
- 定期的にバックアップを取得してください
