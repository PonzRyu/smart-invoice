import { ensureDbInitialized } from '../db/dataSource';
import { conflict, badRequest, notFound } from '../http/httpError';
import { customerInfoRepositoryFrom } from '../repositories/typeormRepos';

export interface CustomerCreatePayload {
  company_code: string;
  company_name: string;
  si_partner_name: string;
  unit_price: number;
  currency: string;
}

export interface CustomerUpdatePayload {
  company_code?: string;
  company_name?: string;
  si_partner_name?: string;
  unit_price?: number;
  currency?: string;
}

export async function listCustomers() {
  const ds = await ensureDbInitialized();
  const repo = customerInfoRepositoryFrom(ds.manager);
  return repo.find({ order: { company_name: 'ASC' } });
}

export async function getCustomerById(id: number) {
  if (Number.isNaN(id)) throw badRequest('Invalid customer id');

  const ds = await ensureDbInitialized();
  const repo = customerInfoRepositoryFrom(ds.manager);
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');
  return customer;
}

export async function createCustomer(payload: Partial<CustomerCreatePayload>) {
  const ds = await ensureDbInitialized();
  const repo = customerInfoRepositoryFrom(ds.manager);
  const { company_code, company_name, si_partner_name, unit_price, currency } =
    payload;

  const normalizedSiPartnerName =
    typeof si_partner_name === 'string' ? si_partner_name.trim() : '';

  if (
    !company_code ||
    !company_name ||
    !normalizedSiPartnerName ||
    unit_price === undefined ||
    unit_price === null ||
    !currency
  ) {
    throw badRequest('Missing required fields');
  }

  const parsedUnitPrice = Number(unit_price);
  if (Number.isNaN(parsedUnitPrice) || !(parsedUnitPrice > 0)) {
    throw badRequest('Invalid unit price');
  }

  const existing = await repo.findOne({ where: { company_code } });
  if (existing) throw conflict('Customer code already exists');

  const entity = repo.create({
    company_code,
    company_name,
    si_partner_name: normalizedSiPartnerName,
    unit_price: parsedUnitPrice,
    currency,
  });

  return repo.save(entity);
}

export async function updateCustomer(
  id: number,
  payload: Partial<CustomerUpdatePayload>
) {
  const ds = await ensureDbInitialized();
  const repo = customerInfoRepositoryFrom(ds.manager);
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');

  const { company_code, company_name, si_partner_name, unit_price, currency } =
    payload;

  if (company_code && company_code !== customer.company_code) {
    const existing = await repo.findOne({ where: { company_code } });
    if (existing) throw conflict('Customer code already exists');
  }

  if (company_code !== undefined) customer.company_code = company_code;
  if (company_name !== undefined) customer.company_name = company_name;
  if (si_partner_name !== undefined) {
    const normalized =
      typeof si_partner_name === 'string' ? si_partner_name.trim() : '';
    if (!normalized) throw badRequest('Invalid SI partner name');
    customer.si_partner_name = normalized;
  }
  if (unit_price !== undefined) {
    const parsedUnitPrice = Number(unit_price);
    if (Number.isNaN(parsedUnitPrice) || !(parsedUnitPrice > 0)) {
      throw badRequest('Invalid unit price');
    }
    customer.unit_price = parsedUnitPrice;
  }
  if (currency !== undefined) customer.currency = currency;

  return repo.save(customer);
}

export async function deleteCustomer(id: number) {
  const ds = await ensureDbInitialized();
  const repo = customerInfoRepositoryFrom(ds.manager);
  const customer = await repo.findOne({ where: { id } });
  if (!customer) throw notFound('Customer not found');
  await repo.remove(customer);
}
