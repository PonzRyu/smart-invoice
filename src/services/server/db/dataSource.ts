import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { CustomerInfo } from '../entities/CustomerInfo';
import { IssuedInvoice } from '../entities/IssuedInvoice';
import { StoreMaster } from '../entities/StoreMaster';
import { StoreSummary } from '../entities/StoreSummary';

function getEnv(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const isProduction = process.env.NODE_ENV === 'production';

// NOTE:
// Next.js Route Handler は複数回ロードされ得るため、DataSource はグローバルにキャッシュします。
declare global {
  // eslint-disable-next-line no-var
  var __smartInvoiceDataSource: DataSource | undefined;
}

export function getAppDataSource(): DataSource {
  if (globalThis.__smartInvoiceDataSource)
    return globalThis.__smartInvoiceDataSource;

  const ds = new DataSource({
    type: 'postgres',
    host: getEnv('DB_HOST', 'localhost'),
    port: parseInt(getEnv('DB_PORT', '5432')!, 10),
    username: getEnv('DB_USERNAME', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    database: getEnv('DB_DATABASE', 'postgres'),
    synchronize: false,
    logging: !isProduction,
    entities: [CustomerInfo, IssuedInvoice, StoreMaster, StoreSummary],
  });

  globalThis.__smartInvoiceDataSource = ds;
  return ds;
}

export async function ensureDbInitialized(): Promise<DataSource> {
  const ds = getAppDataSource();
  if (ds.isInitialized) return ds;
  return ds.initialize();
}
