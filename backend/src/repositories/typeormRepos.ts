import type { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { CustomerInfo } from '../database/entities/CustomerInfo';
import { IssuedInvoice } from '../database/entities/IssuedInvoice';
import { StoreMaster } from '../database/entities/StoreMaster';
import { StoreSummary } from '../database/entities/StoreSummary';

export const customerInfoRepository = (): Repository<CustomerInfo> =>
  AppDataSource.getRepository(CustomerInfo);
export const issuedInvoiceRepository = (): Repository<IssuedInvoice> =>
  AppDataSource.getRepository(IssuedInvoice);
export const storeSummaryRepository = (): Repository<StoreSummary> =>
  AppDataSource.getRepository(StoreSummary);
export const storeMasterRepository = (): Repository<StoreMaster> =>
  AppDataSource.getRepository(StoreMaster);

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

