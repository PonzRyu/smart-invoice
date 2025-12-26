/**
 * アプリケーション設定
 * 環境変数からAPIエンドポイントなどの設定を取得します
 */

// Viteでは環境変数にVITE_プレフィックスが必要
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''; // デフォルトを空文字（相対パス）に変更

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

// APIエンドポイントのヘルパー関数
export const API_ENDPOINTS = {
  customers: () => getApiUrl('/api/customers'),
  customer: (id: string | number) => getApiUrl(`/api/customers/${id}`),
  invoices: {
    upload: () => getApiUrl('/api/invoices/upload'),
  },
  issuedInvoices: (companyCode?: string) => {
    const baseUrl = getApiUrl('/api/issued-invoices');
    return companyCode
      ? `${baseUrl}?companyCode=${encodeURIComponent(companyCode)}`
      : baseUrl;
  },
  storeSummaries: (companyCode?: string) => {
    const baseUrl = getApiUrl('/api/store-summaries');
    return companyCode
      ? `${baseUrl}?companyCode=${encodeURIComponent(companyCode)}`
      : baseUrl;
  },
};

export default {
  API_BASE_URL,
  getApiUrl,
  API_ENDPOINTS,
};
