# smart-invoice

Easily generate invoices based on db data.

---

## 環境構築

### 1. Git

Git をインストールしてください。

### 2. Node

v20.18.0 推奨します。
バージョン管理には **nvm** をオススメします。

### 3. WSL のセットアップ

管理者として **PowerShell** を開き、以下のコマンドを順に実行します。

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
wsl --set-default-version 2
```

上記がうまく動かない場合は、以下の公式ドキュメントを参照してください。
「WSL 2 を既定のバージョンとして設定する」まで設定すれば問題ありません。
https://learn.microsoft.com/ja-jp/windows/wsl/install-manual

### 4. Podman Desktop

Podman Desktop をインストールし、起動してセットアップしてください。
設定はすべてデフォルトで問題ありません。
また、Compose Extension もセットアップしてください。

### 5. DBeaver（任意）

PostgreSQL を閲覧できる DB 管理ツールであれば何でも構いません。
UI が不要であればインストールしなくてもよいです。

### 6. リポジトリのクローン

```bash
git clone https://github.com/PonzRyu/smart-invoice.git
```

### 7. パッケージインストール

```bash
npm i
cd backend
npm i
```

### 7.5. 環境変数の設定（フロントエンド）

プロジェクトルートに `.env` ファイルを作成し、バックエンドAPIのURLを設定します：

```env
# 開発環境用
VITE_API_BASE_URL=http://localhost:3001
```

または、環境変数を直接指定：

```bash
# Windows (PowerShell)
$env:VITE_API_BASE_URL="http://localhost:3001"

# Linux/Mac
export VITE_API_BASE_URL=http://localhost:3001
```

環境変数が設定されていない場合、デフォルトで `http://localhost:3001` が使用されます。

### 8. machine と開発用 DB の起動

```bash
npm run start:machine
npm run start:db
```

### 9. 開発用 DB テーブルのマイグレーション

```bash
npm run migration:run
```

### 10. アプリの起動

```bash
npm start
```

---

## デプロイメント

本番環境へのデプロイメント手順については、[DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### 主な機能
- **自動デプロイ**: `main`ブランチへのpushで自動デプロイ
- **PWA対応**: プログレッシブウェブアプリとして動作
- **HTTPS対応**: セキュアな通信を保証
- **自動起動**: Windows起動時に自動的にアプリケーションが起動

---
