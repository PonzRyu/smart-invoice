import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import path from 'path';
import { CustomerInfo } from './entities/CustomerInfo';
import { IssuedInvoice } from './entities/IssuedInvoice';
import { StoreSummary } from './entities/StoreSummary';
import { StoreMaster } from './entities/StoreMaster';

config();

// 本番環境ではコンパイル後の.jsファイルを参照する必要がある
const isProduction = process.env.NODE_ENV === 'production';
const fileExtension = isProduction ? '*.js' : '*.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  synchronize: false,
  logging: true,
  // エンティティクラスを直接指定（最も確実な方法）
  entities: [CustomerInfo, IssuedInvoice, StoreSummary, StoreMaster],
  migrations: [path.join(__dirname, 'migrations', fileExtension)],
  subscribers: [path.join(__dirname, 'subscribers', fileExtension)],
});
