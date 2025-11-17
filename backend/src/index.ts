import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { AppDataSource } from './database/data-source';
import { CustomerInfo } from './database/entities/CustomerInfo';
import { IssuedInvoice } from './database/entities/IssuedInvoice';
import { StoreSummary } from './database/entities/StoreSummary';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Invoice Backend API is running' });
});

// 顧客管理APIエンドポイント

// 全顧客取得（ASC順）
app.get('/api/customers', async (req, res) => {
  try {
    const customerRepository = AppDataSource.getRepository(CustomerInfo);
    const customers = await customerRepository.find({
      order: {
        company_name: 'ASC',
      },
    });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// 特定顧客取得
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customerRepository = AppDataSource.getRepository(CustomerInfo);
    const customer = await customerRepository.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// 顧客作成
app.post('/api/customers', async (req, res) => {
  try {
    const customerRepository = AppDataSource.getRepository(CustomerInfo);
    const { company_code, company_name, unit_price, currency } = req.body;

    // バリデーション
    if (
      !company_code ||
      !company_name ||
      unit_price === undefined ||
      unit_price === null ||
      !currency
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 数値型チェック
    const parsedUnitPrice = Number(unit_price);
    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return res.status(400).json({ error: 'Invalid unit price' });
    }

    // 顧客コードの重複チェック
    const existingCustomer = await customerRepository.findOne({
      where: { company_code },
    });

    if (existingCustomer) {
      return res.status(409).json({ error: 'Customer code already exists' });
    }

    const customer = customerRepository.create({
      company_code,
      company_name,
      si_partner_name: 'BIPROGY株式会社',
      unit_price: parsedUnitPrice,
      currency,
    });

    await customerRepository.save(customer);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// 顧客更新
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customerRepository = AppDataSource.getRepository(CustomerInfo);
    const customer = await customerRepository.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { company_code, company_name, unit_price, currency } = req.body;

    // 顧客コードの重複チェック（自分以外）
    if (company_code && company_code !== customer.company_code) {
      const existingCustomer = await customerRepository.findOne({
        where: { company_code },
      });

      if (existingCustomer) {
        return res.status(409).json({ error: 'Customer code already exists' });
      }
    }

    // 更新
    if (company_code !== undefined) customer.company_code = company_code;
    if (company_name !== undefined) customer.company_name = company_name;
    customer.si_partner_name = 'BIPROGY株式会社';
    if (unit_price !== undefined) {
      const parsedUnitPrice = Number(unit_price);
      if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
        return res.status(400).json({ error: 'Invalid unit price' });
      }
      customer.unit_price = parsedUnitPrice;
    }
    if (currency !== undefined) customer.currency = currency;

    await customerRepository.save(customer);
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// 顧客削除
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customerRepository = AppDataSource.getRepository(CustomerInfo);
    const customer = await customerRepository.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customerRepository.remove(customer);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

interface StoreSummaryPayload {
  day: string;
  company: string;
  store: string;
  name?: string;
  totalLabels: number;
  productUpdated: number;
}

interface UploadInvoiceRequestBody {
  companyId: number;
  companyCode: string;
  companyName: string;
  issuedDate: string;
  currency: string;
  ttm: number | null;
  summaries: StoreSummaryPayload[];
}

const REQUIRED_HEADERS = [
  'Day',
  'Company',
  'Store',
  'Total Labels',
  'Product Updated',
];

app.post('/api/invoices/upload', async (req, res) => {
  const {
    companyId,
    companyCode,
    companyName,
    issuedDate,
    currency,
    ttm,
    summaries,
  } = req.body as UploadInvoiceRequestBody;

  if (
    companyId === undefined ||
    !companyCode ||
    !companyName ||
    !issuedDate ||
    !currency ||
    !Array.isArray(summaries)
  ) {
    return res.status(400).json({
      error: 'Invalid request payload',
    });
  }

  if (summaries.length === 0) {
    return res.status(400).json({
      error: '元データにレコードが存在しません。',
    });
  }

  const headerSet = new Set(
    summaries.length > 0
      ? Object.keys(summaries[0]).map((key) => {
          switch (key) {
            case 'totalLabels':
              return 'Total Labels';
            case 'productUpdated':
              return 'Product Updated';
            case 'day':
              return 'Day';
            case 'company':
              return 'Company';
            case 'store':
              return 'Store';
            case 'name':
              return 'Name';
            default:
              return key;
          }
        })
      : []
  );

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerSet.has(header)
  );

  if (missingHeaders.length > 0) {
    return res.status(400).json({
      error: [
        '元データが不正です。元データの中身をご確認ください。',
        `${missingHeaders.join(', ')}データが存在しません。`,
      ],
    });
  }

  const uniqueCompanies = new Set(summaries.map((summary) => summary.company));

  if (uniqueCompanies.size !== 1) {
    return res.status(400).json({
      error: [
        '元データが不正です。元データの中身をご確認ください。',
        '元データに複数の顧客(Company)が含まれています。元データは必ず1つの顧客を指定して出力してください。',
      ],
    });
  }

  const [csvCompany] = Array.from(uniqueCompanies);

  if (csvCompany !== companyCode) {
    return res.status(400).json({
      error: [
        '利用顧客名と元データの顧客名が一致しないです。元データの中身をご確認ください。',
        `利用顧客名:${companyCode}`,
        `元データー：${csvCompany}`,
      ],
    });
  }

  const issuedDateMatch = issuedDate.match(/^(\d{4})-(\d{2})$/);

  if (!issuedDateMatch) {
    return res.status(400).json({
      error: '利用年月の形式が不正です。(YYYY-MM)',
    });
  }

  const storeSummaryMap = new Map<
    string,
    {
      storeCode: string;
      storeName: string | null;
      dateString: string;
      totalLabels: number;
      productUpdated: number;
    }
  >();

  for (const summary of summaries) {
    const dayRaw =
      typeof summary.day === 'string'
        ? summary.day.trim()
        : String(summary.day ?? '');

    if (dayRaw.length < 7) {
      return res.status(400).json({
        error: '日付が不正です。',
      });
    }

    const normalizedDay = dayRaw.replace(/\//g, '-');

    if (normalizedDay.length < 10) {
      return res.status(400).json({
        error: '日付が不正です。',
      });
    }

    const csvMonth = normalizedDay.slice(0, 7);
    if (csvMonth !== issuedDate) {
      return res.status(400).json({
        error: [
          '利用年月が正しくありません。',
          '元データの中身を確認して正しい利用年月を指定してください。',
        ],
      });
    }

    const parsedDate = new Date(`${normalizedDay}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error: `日付が不正です: ${dayRaw}`,
      });
    }

    const storeCode =
      typeof summary.store === 'string'
        ? summary.store.trim()
        : summary.store !== undefined && summary.store !== null
          ? String(summary.store)
          : '';

    if (storeCode === '') {
      return res.status(400).json({
        error: `店舗コードが不正です: ${summary.store}`,
      });
    }

    const totalLabels = Number(summary.totalLabels);
    const productUpdated = Number(summary.productUpdated);

    if (Number.isNaN(totalLabels) || Number.isNaN(productUpdated)) {
      return res.status(400).json({
        error: 'ラベル数または更新数が数値ではありません。',
      });
    }

    const isoDate = normalizedDay.slice(0, 10);
    const key = `${companyCode}::${storeCode}::${isoDate}`;

    const storeName =
      typeof summary.name === 'string' && summary.name.trim() !== ''
        ? summary.name.trim()
        : null;

    storeSummaryMap.set(key, {
      storeCode,
      storeName,
      dateString: isoDate,
      totalLabels,
      productUpdated,
    });
  }

  try {
    const result = await AppDataSource.transaction(async (manager) => {
      const storeSummaryRepository = manager.getRepository(StoreSummary);
      const issuedInvoiceRepository = manager.getRepository(IssuedInvoice);
      const customerRepository = manager.getRepository(CustomerInfo);

      const customer = await customerRepository.findOne({
        where: { id: companyId, company_code: companyCode },
      });

      if (!customer) {
        throw new Error('指定された顧客が見つかりません。');
      }

      const storeSummariesToSave = Array.from(storeSummaryMap.values()).map(
        (item) => {
          const storeSummary = new StoreSummary();
          storeSummary.company_code = companyCode;
          storeSummary.store_code = item.storeCode;
          storeSummary.store_name = item.storeName;
          storeSummary.date = new Date(`${item.dateString}T00:00:00.000Z`);
          storeSummary.total_labels = item.totalLabels;
          storeSummary.product_updated = item.productUpdated;
          return storeSummary;
        }
      );

      if (storeSummariesToSave.length > 0) {
        await storeSummaryRepository.upsert(storeSummariesToSave, [
          'company_code',
          'store_code',
          'date',
        ]);
      }

      const lastInvoice = await issuedInvoiceRepository.findOne({
        where: { issued_date: issuedDate },
        order: { invoice_code: 'DESC' },
      });

      const nextInvoiceCode = lastInvoice ? lastInvoice.invoice_code + 1 : 1;

      const issuedInvoiceEntity = new IssuedInvoice();
      issuedInvoiceEntity.company_code = companyCode;
      issuedInvoiceEntity.company_name = companyName;
      issuedInvoiceEntity.issued_date = issuedDate;
      issuedInvoiceEntity.invoice_code = nextInvoiceCode;
      issuedInvoiceEntity.currency = currency;
      issuedInvoiceEntity.ttm = ttm ?? null;

      const savedIssuedInvoice =
        await issuedInvoiceRepository.save(issuedInvoiceEntity);

      return savedIssuedInvoice;
    });

    return res.status(201).json({
      invoice: {
        id: result.id,
        invoice_code: result.invoice_code,
        issued_date: result.issued_date,
      },
    });
  } catch (error) {
    console.error('Error uploading invoice data:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to upload invoice data';
    return res.status(500).json({ error: message });
  }
});

// 請求書発行情報取得
app.get('/api/issued-invoices', async (req, res) => {
  try {
    const { companyCode } = req.query;

    if (typeof companyCode !== 'string' || companyCode.trim() === '') {
      return res.status(400).json({ error: 'companyCode is required' });
    }

    const issuedInvoiceRepository = AppDataSource.getRepository(IssuedInvoice);
    const invoices = await issuedInvoiceRepository.find({
      where: { company_code: companyCode },
      order: {
        issued_date: 'DESC',
        invoice_code: 'DESC',
      },
    });

    const normalizedInvoices = invoices.map((invoice) => ({
      ...invoice,
      ttm:
        invoice.ttm !== null && invoice.ttm !== undefined
          ? Number(invoice.ttm)
          : null,
    }));

    res.json(normalizedInvoices);
  } catch (error) {
    console.error('Error fetching issued invoices:', error);
    res.status(500).json({ error: 'Failed to fetch issued invoices' });
  }
});

// 店舗別明細データ取得
app.get('/api/store-summaries', async (req, res) => {
  try {
    const { companyCode, issuedDate } = req.query;

    if (typeof companyCode !== 'string' || companyCode.trim() === '') {
      return res.status(400).json({ error: 'companyCode is required' });
    }

    if (typeof issuedDate !== 'string' || issuedDate.trim() === '') {
      return res.status(400).json({ error: 'issuedDate is required' });
    }

    // issuedDateはYYYY-MM形式なので、その月の範囲で検索
    const [year, month] = issuedDate.split('-');
    if (!year || !month) {
      return res.status(400).json({ error: 'issuedDate format is invalid (YYYY-MM)' });
    }

    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(
      new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).setHours(23, 59, 59, 999)
    );

    const storeSummaryRepository = AppDataSource.getRepository(StoreSummary);
    const summaries = await storeSummaryRepository
      .createQueryBuilder('store_summary')
      .where('store_summary.company_code = :companyCode', { companyCode })
      .andWhere('store_summary.date >= :startDate', { startDate })
      .andWhere('store_summary.date <= :endDate', { endDate })
      .orderBy('store_summary.date', 'ASC')
      .addOrderBy('store_summary.store_code', 'ASC')
      .getMany();

    res.json(summaries);
  } catch (error) {
    console.error('Error fetching store summaries:', error);
    res.status(500).json({ error: 'Failed to fetch store summaries' });
  }
});

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Error during database initialization:', error);
    process.exit(1);
  });
