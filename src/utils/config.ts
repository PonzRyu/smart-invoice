/**
 * アプリケーション共通設定
 * - 環境変数からベースURLを取得
 * - 相対パスをフルURLに変換するヘルパのみを提供
 *
 * 具体的な API パス定義は src/services/apiRoutes.ts に集約します。
 */

// Viteでは環境変数にVITE_プレフィックスが必要
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 相対パスでも動作するようにする（本番環境で同じドメインで提供する場合）
export const getApiUrl = (path: string): string => {
  // パスがすでに完全なURLの場合はそのまま返す
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // ベースURLが空の場合は相対パスとして返す
  if (!API_BASE_URL) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // パスが相対パスの場合はベースURLと結合
  const baseUrl = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const apiPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${apiPath}`;
};

export default {
  API_BASE_URL,
  getApiUrl,
};
