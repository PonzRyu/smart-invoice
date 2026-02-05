/**
 * APIルート定義
 * - ベースURLの解決は utils/config.ts の getApiUrl に委譲
 * - ドメインごとのパス定義をここに集約する
 */

import { getApiUrl } from '../utils/config';

export const API_ROUTES = {
  customers: () => getApiUrl('/api/v1/customers'),
  customer: (id: string | number) => getApiUrl(`/api/v1/customers/${id}`),
  invoices: {
    upload: () => getApiUrl('/api/v1/invoices/upload'),
  },
  issuedInvoices: (companyCode?: string) => {
    const baseUrl = getApiUrl('/api/v1/invoices/issued');
    return companyCode
      ? `${baseUrl}?companyCode=${encodeURIComponent(companyCode)}`
      : baseUrl;
  },
  storeSummaries: (companyCode?: string) => {
    const baseUrl = getApiUrl('/api/v1/invoices/summaries');
    return companyCode
      ? `${baseUrl}?companyCode=${encodeURIComponent(companyCode)}`
      : baseUrl;
  },
} as const;

