# Smart Invoice Backend

## 概要

Smart Invoice のバックエンドAPIサーバーです。

## 技術スタック

- Node.js 20.18.0
- Express.js
- TypeORM
- PostgreSQL

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

### 2. 環境変数の設定

`backend`ディレクトリに`.env`ファイルを作成し、以下の内容を設定してください：

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 3. PodmanでPostgreSQLを起動

Windowsの場合（PowerShell）:

```powershell
.\start-db.ps1
```

Linux/Macの場合:

```bash
chmod +x start-db.sh
./start-db.sh
```

または、手動で起動する場合：

```bash
# Podmanマシンを起動（まだ起動していない場合）
podman machine start

# Docker ComposeでPostgreSQLを起動
podman-compose up -d
```

`docker-compose`コマンドが利用可能な場合：

```bash
docker-compose up -d
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. ビルドと本番起動

```bash
npm run build
npm start
```

## データベースマイグレーション

```bash
# マイグレーションファイルの生成
npm run migration:generate -- src/database/migrations/MigrationName

# マイグレーションの実行
npm run migration:run

# マイグレーションのロールバック
npm run migration:revert
```

## API エンドポイント

- `GET /health` - ヘルスチェック
