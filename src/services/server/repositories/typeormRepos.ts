import type { EntityManager, Repository } from 'typeorm';
import { CustomerInfo } from '../entities/CustomerInfo';
import { IssuedInvoice } from '../entities/IssuedInvoice';
import { StoreMaster } from '../entities/StoreMaster';
import { StoreSummary } from '../entities/StoreSummary';

export const customerInfoRepositoryFrom = (
  manager: EntityManager
): Repository<CustomerInfo> => manager.getRepository(CustomerInfo);

export const issuedInvoiceRepositoryFrom = (
  manager: EntityManager
): Repository<IssuedInvoice> => manager.getRepository(IssuedInvoice);

export const storeSummaryRepositoryFrom = (
  manager: EntityManager
): Repository<StoreSummary> => manager.getRepository(StoreSummary);

export const storeMasterRepositoryFrom = (
  manager: EntityManager
): Repository<StoreMaster> => manager.getRepository(StoreMaster);
