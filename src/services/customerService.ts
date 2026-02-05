import { API_ROUTES } from './apiRoutes';
import { deleteRequest, getJson, postJson, putJson } from './apiClient';

/**
 * 顧客情報の型定義
 * バックエンドの Customer エンティティに対応
 */
export interface Customer {
  id: number;
  company_name: string;
  company_code: string;
  currency: string;
  unit_price: number;
  si_partner_name: string;
  updated_at: string;
  created_at: string;
}

/**
 * 顧客作成・更新時のペイロード
 */
export interface CustomerPayload {
  company_name: string;
  company_code: string;
  currency: string;
  unit_price: number;
}

/**
 * 顧客一覧取得
 */
export async function fetchCustomers(): Promise<Customer[]> {
  const data = await getJson<Customer[]>(API_ROUTES.customers());

  // unit_price が文字列として返ってくるケースに備えて正規化
  return data.map((customer) => ({
    ...customer,
    unit_price:
      typeof customer.unit_price === 'string'
        ? parseFloat(customer.unit_price)
        : customer.unit_price,
  }));
}

/**
 * 顧客の新規作成
 */
export async function createCustomer(
  payload: CustomerPayload
): Promise<Customer> {
  const data = await postJson<Customer, CustomerPayload>(
    API_ROUTES.customers(),
    payload
  );

  return {
    ...data,
    unit_price:
      typeof data.unit_price === 'string'
        ? parseFloat(data.unit_price)
        : data.unit_price,
  };
}

/**
 * 顧客の更新
 */
export async function updateCustomer(
  id: number,
  payload: CustomerPayload
): Promise<Customer> {
  const data = await putJson<Customer, CustomerPayload>(
    API_ROUTES.customer(id),
    payload
  );

  return {
    ...data,
    unit_price:
      typeof data.unit_price === 'string'
        ? parseFloat(data.unit_price)
        : data.unit_price,
  };
}

/**
 * 顧客の削除
 */
export async function deleteCustomer(id: number): Promise<void> {
  await deleteRequest(API_ROUTES.customer(id));
}

