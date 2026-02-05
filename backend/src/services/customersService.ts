import { customerInfoRepository } from '../repositories/typeormRepos';
import { badRequest, conflict, notFound } from '../utils/httpError';

export interface CustomerCreatePayload {
  company_code: string;
  company_name: string;
  unit_price: number;
  currency: string;
}

export interface CustomerUpdatePayload {
  company_code?: string;
  company_name?: string;
  unit_price?: number;
  currency?: string;
}

const DEFAULT_SI_PARTNER_NAME = 'BIPROGY株式会社';

export async function listCustomers() {
  const repo = customerInfoRepository();
  return repo.find({
    order: { company_name: 'ASC' },
  });
}

export async function getCustomerById(id: number) {
  if (Number.isNaN(id)) throw badRequest('Invalid customer id');

  const repo = customerInfoRepository();
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');
  return customer;
}

export async function createCustomer(payload: Partial<CustomerCreatePayload>) {
  const repo = customerInfoRepository();
  const { company_code, company_name, unit_price, currency } = payload;

  // バリデーション（既存仕様を踏襲）
  if (
    !company_code ||
    !company_name ||
    unit_price === undefined ||
    unit_price === null ||
    !currency
  ) {
    throw badRequest('Missing required fields');
  }

  const parsedUnitPrice = Number(unit_price);
  if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
    throw badRequest('Invalid unit price');
  }

  const existing = await repo.findOne({ where: { company_code } });
  if (existing) throw conflict('Customer code already exists');

  const entity = repo.create({
    company_code,
    company_name,
    si_partner_name: DEFAULT_SI_PARTNER_NAME,
    unit_price: parsedUnitPrice,
    currency,
  });

  return repo.save(entity);
}

export async function updateCustomer(
  id: number,
  payload: Partial<CustomerUpdatePayload>
) {
  const repo = customerInfoRepository();
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');

  const { company_code, company_name, unit_price, currency } = payload;

  // 顧客コード重複チェック（自分以外）
  if (company_code && company_code !== customer.company_code) {
    const existing = await repo.findOne({ where: { company_code } });
    if (existing) throw conflict('Customer code already exists');
  }

  if (company_code !== undefined) customer.company_code = company_code;
  if (company_name !== undefined) customer.company_name = company_name;
  customer.si_partner_name = DEFAULT_SI_PARTNER_NAME;

  if (unit_price !== undefined) {
    const parsedUnitPrice = Number(unit_price);
    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      throw badRequest('Invalid unit price');
    }
    customer.unit_price = parsedUnitPrice;
  }
  if (currency !== undefined) customer.currency = currency;

  return repo.save(customer);
}

export async function deleteCustomer(id: number) {
  const repo = customerInfoRepository();
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');
  await repo.remove(customer);
}

