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
## システム構成

### 1. 処理の流れ

```bash
[ユーザーのブラウザ]
      │  HTTPS
      ▼
[Windows Server + IIS]
  ├─ フロントエンド(PWA)
  │   - React + Vite でビルドされた静的ファイル
  │   - `https://<server>` で配信
  │   - API ベースURL: `VITE_API_BASE_URL` (例: https://25.20.10.200:3443 / http://localhost:3001)
  │
  └─ (必要に応じてリバースプロキシで /api → バックエンドAPI に転送)

      │  HTTP/HTTPS (REST API)
      ▼
[バックエンド API サーバー]
  - Node.js + Express
  - ディレクトリ: `backend/src`
  - レイヤ構造:
      routes → controllers → services → repositories → database(TypeORM)
  - 主な責務:
      ・顧客マスタ管理（CustomerInfo, StoreMaster, StoreSummary）
      ・請求書発行・履歴管理（IssuedInvoice）
      ・ヘルスチェック(health)

      │  TCP (PostgreSQL)
      ▼
[PostgreSQL データベース]
  - 開発環境: Podman + docker-compose でコンテナ起動
  - TypeORM エンティティ:
      CustomerInfo / IssuedInvoice / StoreMaster / StoreSummary
  - マイグレーション: `backend/src/database/migrations/*`

      ▲
      │ CSVアップロード (ブラウザから)
[外部システム：Metricsサイトなど]
  - 利用実績CSVをユーザーがダウンロード
  - 本アプリの画面からCSVをアップロード
  - フロントの `excelGenerator.ts` 等で加工し、
    バックエンド + DB と連携して請求書 Excel を生成
```

### 2.  運用・デプロイ構成
```bash
[GitHub リポジトリ]
      │  push(main)
      ▼
[GitHub Actions]
  - ワークフロー: `.github/workflows/deploytoproduction.yml`
  - 自動ビルド & デプロイ
      │
      ▼
[Self-hosted GitHub Actions Runner]
(Windows Server 上で動作)
      │
      ├─ フロントエンドをビルド (npm run build)
      │   → 出力物を IIS 配下 `C:\inetpub\wwwroot\smart-invoice` へ配置
      │
      └─ IIS 設定/アプリプール制御スクリプト実行
          - AppPool: `AimsSaaSInvoiceAppPool`
          - サイト名: `SmartInvoice`
          - ポート: 443 (HTTPS)
          - 証明書: Windows 証明書ストアの PFX を使用
```

## ディレクトリ構成

### 1. ルート構成
```
smart-invoice/
├─ src/                     # フロントエンド（React + Vite）
├─ backend/                 # バックエンド（APIサーバ）
├─ public/                  # 静的ファイル
├─ tests/                   # テスト用データ（CSV など）
├─ .github/
├─ .vscode/
├─ .cursor/
├─ index.html
├─ package.json             # フロント側
├─ package-lock.json
├─ vite.config.ts
├─ tsconfig.json
├─ tsconfig.node.json
├─ web.config
├─ README.md
└─ DEPLOYMENT.md
```

### 2. フロントエンド構成
```
src/
├─ main.tsx                 # エントリポイント
├─ App.tsx                  # ルートコンポーネント
├─ index.css                # グローバルスタイル
├─ pages/                   # 画面単位コンポーネント
├─ parts/                   # 共通UI部品
├─ services/                # APIクライアント/サービス層
├─ utils/                   # ユーティリティ
├─ assets/                  # テンプレートなどの静的アセット
├─ styles/                  # スタイル関連
├─ types/                   # 型定義
└─ vite-env.d.ts
```

### 3. バックエンド構成
```
backend/
├─ package.json
├─ package-lock.json
├─ docker-compose.yml
├─ tsconfig.json
├─ README.md
└─ src/
   ├─ index.ts              # エントリポイント
   ├─ app.ts                # Express アプリ設定
   ├─ routes/               # ルーティング
   ├─ controllers/          # コントローラ層
   ├─ services/             # ビジネスロジック層
   ├─ repositories/         # リポジトリ層（DBアクセス）
   ├─ database/             # DB設定・スキーマ
   │  ├─ data-source.ts
   │  ├─ entities/
   │  └─ migrations/
   ├─ middlewares/          # 共通ミドルウェア
   └─ utils/                # ユーティリティ
      └─ httpError.ts
```

## デプロイメント

本番環境へのデプロイメント手順については、[DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### 主な機能
- **自動デプロイ**: `main`ブランチへのpushで自動デプロイ
- **PWA対応**: プログレッシブウェブアプリとして動作
- **HTTPS対応**: セキュアな通信を保証
- **自動起動**: Windows起動時に自動的にアプリケーションが起動

---
