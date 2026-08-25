# Smart-INVOICE 設計書

## 1. 文書の目的と対象読者

本書は **smart-invoice** のソフトウェア設計を、開発・保守・運用の担当者が共通理解できるように整理したものです。README の手順やフォルダ説明を補い、**責務分担・データの流れ・API・主要な制約** を明示します。

---

## 2. 背景とシステム概要

### 2.1 背景

Apache Supersetから出力される **利用実績 CSV** をもとに請求書を作成する業務があり、手作業によるミスリスクがあった。本システムは **CSV の取り込み、集計結果の永続化、請求書 Excel の生成** をアプリケーション上で行い、作業を標準化する。

### 2.2 システムの位置づけ

- **クライアント**: React（Vite）による SPA。PWA としての配布、Electron によるデスクトップ配布に対応。
- **サーバ**: Node.js + Express の REST API。PostgreSQL にマスタ・取込データ・発行履歴を保存。
- **外部データ**: ユーザーが Metrics 等から取得した CSV をブラウザ／デスクトップ上でアップロードする（サーバへの raw ファイルアップロードではなく、**フロントでパースした JSON を API に POST** する形）。

---

## 3. 機能一覧

| 区分 | 機能 | 主な実装場所 |
|------|------|----------------|
| ホーム | 各機能へのナビゲーション | `src/pages/HomePage.tsx` |
| 顧客管理 | 顧客マスタの一覧・検索・追加・編集・削除 | `src/pages/CustomerManagementPage.tsx`、API `/api/v1/customers` |
| お客様利用データ取込 | CSV 選択→検証→バックエンドへ取込、発行番号の採番 | `src/pages/CreateInvoicePage.tsx`、`POST /api/v1/invoices/upload` |
| 請求書発行 | 発行済み請求の一覧、店舗集計の取得、Excel ダウンロード | `src/pages/IssueInvoicePage.tsx`、`src/utils/excelGenerator.ts` |
| ヘルスチェック | API・DB 起動確認用 | `GET /health` |

---

## 4. アーキテクチャ

### 4.1 論理構成（レイヤ）

**フロントエンド**

- **pages**: 画面単位の状態・操作
- **parts**: TopBar、NavigationRail、BottomBar 等の UI 部品
- **services**: `apiClient`（fetch ラッパ）、`apiRoutes`（URL 集約）、ドメイン別 `*Service`
- **utils**: `config`（`VITE_API_BASE_URL`）、`excelGenerator`（ExcelJS）

**バックエンド**

```
routes → controllers → services → repositories (TypeORM) → PostgreSQL
```

- **middlewares**: `asyncHandler`、`errorHandler`
- **utils**: `httpError`（400/404/409 等の統一）

### 4.2 物理・デプロイ構成（概要）

**IIS 上にフロント静的ファイル**、**別プロセスで API**（必要に応じてリバースプロキシ）という想定。GitHub Actions（セルフホスト Runner）でビルド・配置が行われる。

開発時は **フロント（例: Vite 3000）** と **API（既定 PORT 3001）** を別起動し、`VITE_API_BASE_URL` で API を指定する。

### 4.3 クライアント形態

| 形態 | ルーティング | 備考 |
|------|----------------|------|
| ブラウザ | `BrowserRouter` | 通常 URL |
| Electron | `HashRouter` | `file://` 配下での History での不具合回避（`App.tsx`） |

Electron は **別途バックエンド API が稼働している前提**。API URL は `.env` / `.env.electron` 等で設定。

---

## 5. 技術スタック

| 領域 | 技術 | 備考 |
|------|------|------|
| フロント | TypeScript, React 18, Vite 5, React Router 7 | Chrome 互換を前提 |
| CSV | PapaParse | チャンク読み込み・ヘッダ検証 |
| Excel | ExcelJS | テンプレート `src/assets/invoice_template.xlsx` を読み込み加工 |
| PWA | vite-plugin-pwa | オフライン対応等（ビルド設定に依存） |
| デスクトップ | Electron 33, electron-builder | 製品名: Smart INVOICE |
| API | Node 20.18.0, Express 4, cors, dotenv | JSON 上限 10MB |
| ORM | TypeORM 0.3 | マイグレーション管理 |
| DB | PostgreSQL | 開発: Podman + docker-compose |

**engines**: ルートおよび `backend/package.json` で `node` / `npm` バージョンを固定。

---

## 6. データモデル

### 6.1 エンティティ概要

| テーブル（エンティティ） | 役割 |
|--------------------------|------|
| `customer_info` | 顧客マスタ。`company_code` 一意、単価・通貨・SI パートナー名 |
| `store_master` | 店舗マスタ（会社コード＋店舗コードで店舗名を補完する用途） |
| `store_summary` | 日次の利用実績（会社・店舗・日付・ラベル数・更新数）。`(company_code, store_code, date)` 一意 |
| `issued_invoice` | 発行済み請求のメタ情報。`company_code` は `customer_info.company_code` に外部キー相当の関連 |

### 6.2 リレーション（概念）

- `CustomerInfo` 1 — * `StoreSummary`
- `CustomerInfo` 1 — * `IssuedInvoice`（Join: `company_code`）
- `StoreMaster` は取込処理内で **店舗名欠落時の参照** に使用（CSV の `Name` が空のとき）

---

## 7. API 設計

ベースパス: **`/api/v1`**（ヘルスはルート直下）。

### 7.1 ヘルス

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/health` | サーバ生存確認 |

### 7.2 顧客

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/v1/customers` | 一覧（会社名昇順） |
| GET | `/api/v1/customers/:id` | 1 件 |
| POST | `/api/v1/customers` | 作成（必須項目・単価正・`company_code` 重複は 409） |
| PUT | `/api/v1/customers/:id` | 更新 |
| DELETE | `/api/v1/customers/:id` | 削除 |

### 7.3 請求・取込

| メソッド | パス | クエリ | 説明 |
|----------|------|--------|------|
| POST | `/api/v1/invoices/upload` | — | 利用データ JSON を受け取りトランザクションで `store_summary` 再構築＋`issued_invoice` 新規または更新 |
| GET | `/api/v1/invoices/issued` | `companyCode`（必須） | 当該顧客の発行済み一覧 |
| GET | `/api/v1/invoices/summaries` | `companyCode`、`issuedDate`（YYYY-MM） | 店舗別集計（SQL は `invoicesService.getStoreSummaries` 内の生クエリ） |

**取込リクエストボディ（概念）**: `companyId`, `companyCode`, `companyName`, `issuedDate`, `currency`, `ttm`, `summaries[]`（各行: day, company, store, name?, totalLabels, productUpdated）。

フロントの `API_ROUTES`（`src/services/apiRoutes.ts`）と一致させる。

---

## 8. 主要な業務フロー

### 8.1 CSV 取込（Create Invoice）

1. ユーザーが顧客・利用年月（YYYY-MM）等を選択し、Metrics 形式の CSV をアップロード。
2. **フロント**（PapaParse）で必須列 `Day`, `Company`, `Store`, `Total Labels`, `Product Updated` を検証。単一顧客・年月一致などをチェック。
3. `POST /api/v1/invoices/upload` に JSON 送信。
4. **バックエンド**（トランザクション）:
   - 顧客の存在確認
   - 当該月の既存 `store_summary` を削除し、新行を一括保存
   - 同一 `company_code` + `issued_date` の `issued_invoice` があれば更新、なければ **`invoice_code` を当月内で連番採番** して INSERT

### 8.2 請求書 Excel 発行（Issue Invoice）

1. 顧客選択により `GET .../issued` で一覧取得。
2. ユーザーが請求書を選び、請求日・支払期限等を指定（画面仕様に準拠）。
3. `GET .../summaries?companyCode=&issuedDate=` で店舗別集計を取得。
4. **フロント**が `excelGenerator.generateInvoiceExcel` でテンプレートに値を流し込み、ダウンロード。**超過課金（ペナルティ）** オプション時は商品更新率 110% 超の店舗に別計算（`excelGenerator.ts` 内の閾値・ロジック）。

---

## 9. エラー処理・バリデーション

- **API**: `errorHandler` がエラーを JSON 化。`httpError` によりステータスとメッセージを統一。
- **CORS**: 現状 `origin: '*'`。本番では限定を推奨（`app.ts` コメント）。
- **ペイロードサイズ**: `express.json` / `urlencoded` とも **10MB 上限**。

---

## 10. 設定・環境変数

### フロント（Vite）

| 変数 | 役割 |
|------|------|
| `VITE_API_BASE_URL` | API のオリジン（未設定時は相対パス／README のデフォルト記載に従う） |

### バックエンド（`backend/.env`）

| 変数 | 役割 |
|------|------|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL 接続 |
| `PORT` | 既定 3001 |
| `HOST` | 既定 localhost |
| `NODE_ENV` | 実行モード |

---

## 11. セキュリティ・運用上の留意

- 認証・認可は現行コードベースの API ルート上は **未実装**（社内ネットワークや別層での制御を前提とする場合は設計書・運用側で補足すること）。
- Electron では `ignore-certificate-errors` を付与（開発・社内証明書向け）。**本番配布時のリスク**を把握した上で運用する。
- 顧客削除時、`issued_invoice` / `store_summary` との **参照整合** は DB 制約・アプリ仕様で確認すること（必要ならカスケードや削除禁止の仕様化）。

---

## 12. テスト・品質

- `tests/` に CSV サンプル等あり（E2E の自動テスト有無はリポジトリのテストランナー設定に依存）。
- フロント: ESLint / Prettier（`package.json` scripts）。

---

## 13. 変更履歴の扱い

スキーマ変更は **TypeORM マイグレーション**（`backend/src/database/migrations/`）で管理する。設計変更時は本書と README の「システム構成」節を同期させることを推奨する。

---

## 14. 参考パス一覧

| 内容 | パス |
|------|------|
| ルート README（構築・デプロイ概要） | `README.md` |
| バックエンド README | `backend/README.md` |
| Express アプリ組み立て | `backend/src/app.ts` |
| 取込・集計ロジック | `backend/src/services/invoicesService.ts` |
| Excel 生成 | `src/utils/excelGenerator.ts` |
| ルート定義 | `src/App.tsx` |

---

*Document version: 1.0 — Smart INVOICE アプリケーションソースに基づく設計整理（2025-03-26 時点）。*
