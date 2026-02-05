import { API_ROUTES } from './apiRoutes';
import { getJson, postJson } from './apiClient';

export interface IssuedInvoice {
  id: number;
  company_code: string;
  company_name: string;
  issued_date: string;
  invoice_code: number;
  currency: string;
  ttm: number | null;
}

export interface StoreSummary {
  store_code: string;
  store_name: string | null;
  start_date_of_use: string;
  usage_days: number;
  avg_label_count: number;
  avg_product_update_count: number;
}

export interface UploadInvoiceSummary {
  day: string;
  company: string;
  store: string;
  name?: string;
  totalLabels: number;
  productUpdated: number;
}

export interface UploadInvoiceRequest {
  companyId: number;
  companyCode: string;
  companyName: string;
  issuedDate: string;
  currency: string;
  ttm: number | null;
  summaries: UploadInvoiceSummary[];
}

export interface UploadInvoiceResponse {
  invoice: {
    invoice_code: number;
    issued_date: string;
  };
}

/**
 * 請求書発行済み一覧取得
 */
export async function fetchIssuedInvoices(
  companyCode: string
): Promise<IssuedInvoice[]> {
  const data = await getJson<IssuedInvoice[]>(
    API_ROUTES.issuedInvoices(companyCode)
  );

  return data.map((invoice) => ({
    ...invoice,
    ttm:
      invoice.ttm !== null && invoice.ttm !== undefined ? Number(invoice.ttm) : null,
  }));
}

/**
 * 店舗別明細取得（請求書Excel生成用）
 * 既存の仕様に合わせて issuedDate はクエリとして追加します。
 */
export async function fetchStoreSummaries(
  companyCode: string,
  issuedDate: string
): Promise<StoreSummary[]> {
  const url = `${API_ROUTES.storeSummaries(companyCode)}&issuedDate=${encodeURIComponent(
    issuedDate
  )}`;
  return getJson<StoreSummary[]>(url);
}

/**
 * お客様利用データのアップロード
 */
export async function uploadInvoiceSummaries(
  payload: UploadInvoiceRequest
): Promise<UploadInvoiceResponse> {
  return postJson<UploadInvoiceResponse, UploadInvoiceRequest>(
    API_ROUTES.invoices.upload(),
    payload
  );
}

