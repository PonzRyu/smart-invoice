# デプロイ手順書

## 概要

このドキュメントでは、Smart Invoiceアプリケーションを社内のWindows 11 Proサーバー（25.20.10.201）にデプロイする手順を説明します。

## 前提条件

- Windows 11 Pro（25.20.10.201）
- Node.js 20.18.0
- npm 10.8.2
- PostgreSQL（データベースサーバー）
- GitHubアカウントとリポジトリへのアクセス権限

## 初回セットアップ

### 1. GitHub Actions Self-hosted Runnerのセットアップ

#### 1-1. GitHubリポジトリでランナーを登録&セットアップ

1. GitHubリポジトリの **Settings** → **Actions** → **Runners** → **New self-hosted runner** にアクセス
2. **OS: Windows**、**Architecture: x64** を選択
3. Download / Configure / Using your self-hosted runner の説明に従い、コマンドを入力

うまくいかない場合、以下のリンクを参照
https://github.com/actions/runner/releases

# サービスを起動

Start-Service SERVICE_NAME

````
https://docs.github.com/ja/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application?platform=windows

### 2. Node.jsとnpmの確認

```powershell
node --version  # 20.18.0であることを確認
npm --version   # 10.8.2であることを確認
````

### 3. PM2のインストール

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

### 4. デプロイディレクトリの作成

```powershell
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\logs -Force
```

### 5. 環境変数ファイルの作成

`C:\smart-invoice\backend\.env` を作成し、以下を設定：

```env
# Database Configuration（本番環境）
DB_HOST=25.20.10.200
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres

# Server Configuration
PORT=3001
NODE_ENV=production
```

**注意**: `DB_USERNAME`、`DB_PASSWORD`、`DB_DATABASE`は実際の本番環境の値に置き換えてください。

### 6. 初回手動デプロイ（データベースマイグレーション実行）

```powershell
# リポジトリをクローン（初回のみ）
cd C:\
git@github.com:PonzRyu/smart-invoice.git
または、
(If no ssh config)git clone https://github.com/your-username/smart-invoice.git smart-invoice-source


# フロントエンドをビルド
cd smart-invoice-source
npm install
npm run build

# バックエンドをビルド
cd backend
npm install --production
npm run build

# ファイルをデプロイディレクトリにコピー
cd ..
Copy-Item -Path dist -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\dist -Recurse -Force
Copy-Item -Path backend\dist -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\dist -Recurse -Force
Copy-Item -Path backend\node_modules -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\node_modules -Recurse -Force
Copy-Item -Path backend\package.json -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
Copy-Item -Path backend\ecosystem.config.js -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
Copy-Item -Path backend\tsconfig.json -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\ -Force
New-Item -ItemType Directory -Path C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database -Force
Copy-Item -Path backend\src\database\entities -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database\entities -Recurse -Force
Copy-Item -Path backend\src\database\migrations -Destination C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend\src\database\migrations -Recurse -Force

# データベースマイグレーション実行（初回のみ）
cd C:\Users\ESL-VM-SERVER1\dev\smart-invoice\backend
npm run migration:run

# pm2の実行ポリシーを永続的に変更（管理者権限が必要）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# PM2でアプリケーションを起動
pm2 start ecosystem.config.js
pm2 save

# Windows起動時に自動起動するように設定
npx pm2-windows-startup install
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

- URL: `http://25.20.10.200:3001`
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
