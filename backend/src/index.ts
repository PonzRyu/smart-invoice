import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { In } from 'typeorm';
import { AppDataSource } from './database/data-source';
import { CustomerInfo } from './database/entities/CustomerInfo';
import { IssuedInvoice } from './database/entities/IssuedInvoice';
import { StoreSummary } from './database/entities/StoreSummary';
import { StoreMaster } from './database/entities/StoreMaster';

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
      error: 'お客様利用データにレコードが存在しません。',
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
        'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
        `${missingHeaders.join(', ')}データが存在しません。`,
      ],
    });
  }

  const uniqueCompanies = new Set(summaries.map((summary) => summary.company));

  if (uniqueCompanies.size !== 1) {
    return res.status(400).json({
      error: [
        'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
        'お客様利用データに複数の顧客(Company)が含まれています。お客様利用データは必ず1つの顧客を指定して出力してください。',
      ],
    });
  }

  const [csvCompany] = Array.from(uniqueCompanies);

  if (csvCompany !== companyCode) {
    return res.status(400).json({
      error: [
        '利用顧客名とお客様利用データの顧客名が一致しないです。お客様利用データの中身をご確認ください。',
        `利用顧客名:${companyCode}`,
        `お客様利用データー：${csvCompany}`,
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
          'お客様利用データの中身を確認して正しい利用年月を指定してください。',
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
      const storeMasterRepository = manager.getRepository(StoreMaster);

      const customer = await customerRepository.findOne({
        where: { id: companyId, company_code: companyCode },
      });

      if (!customer) {
        throw new Error('指定された顧客が見つかりません。');
      }

      // storeNameがnullのレコードに対して、store_masterから取得
      const storeSummariesArray = Array.from(storeSummaryMap.values());
      const storeCodesNeedingName = storeSummariesArray
        .filter((item) => item.storeName === null)
        .map((item) => item.storeCode);

      if (storeCodesNeedingName.length > 0) {
        const uniqueStoreCodes = Array.from(new Set(storeCodesNeedingName));
        const storeMasters = await storeMasterRepository.find({
          where: {
            company_code: companyCode,
            store_code: In(uniqueStoreCodes),
          },
        });

        // store_codeでマップを作成
        const storeMasterMap = new Map<string, string>();
        for (const storeMaster of storeMasters) {
          if (storeMaster.company_code === companyCode) {
            storeMasterMap.set(storeMaster.store_code, storeMaster.store_name);
          }
        }

        // storeNameがnullのレコードを更新
        for (const item of storeSummariesArray) {
          if (item.storeName === null) {
            const masterStoreName = storeMasterMap.get(item.storeCode);
            if (masterStoreName) {
              item.storeName = masterStoreName;
            }
          }
        }
      }

      // 該当月の該当company_codeのデータをすべて削除
      const [year, month] = issuedDate.split('-');
      if (!year || !month) {
        throw new Error('利用年月の形式が不正です。');
      }

      // その月の最初の日（YYYY-MM-01）
      const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);

      // 次の月の最初の日（YYYY-MM+1-01）
      const nextMonth = parseInt(month, 10) + 1;
      const nextYear =
        nextMonth > 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
      const nextMonthStr = (nextMonth > 12 ? 1 : nextMonth)
        .toString()
        .padStart(2, '0');
      const endDate = new Date(`${nextYear}-${nextMonthStr}-01T00:00:00.000Z`);

      // 該当月の該当company_codeのstore_summaryレコードを削除
      await storeSummaryRepository
        .createQueryBuilder()
        .delete()
        .from(StoreSummary)
        .where('company_code = :companyCode', { companyCode })
        .andWhere('date >= :startDate', { startDate })
        .andWhere('date < :endDate', { endDate })
        .execute();

      const storeSummariesToSave = storeSummariesArray.map((item) => {
        const storeSummary = new StoreSummary();
        storeSummary.company_code = companyCode;
        storeSummary.store_code = item.storeCode;
        storeSummary.store_name = item.storeName;
        storeSummary.date = new Date(`${item.dateString}T00:00:00.000Z`);
        storeSummary.total_labels = item.totalLabels;
        storeSummary.product_updated = item.productUpdated;
        return storeSummary;
      });

      // 削除後に新しいデータを挿入
      if (storeSummariesToSave.length > 0) {
        await storeSummaryRepository.save(storeSummariesToSave);
      }

      // 同じ月に同じcompany_codeで既存の請求書があるか確認
      const existingInvoice = await issuedInvoiceRepository.findOne({
        where: {
          company_code: companyCode,
          issued_date: issuedDate,
        },
      });

      let savedIssuedInvoice: IssuedInvoice;

      if (existingInvoice) {
        // 既存の請求書が存在する場合は、ttm、currency、company_nameを更新
        existingInvoice.ttm = ttm ?? null;
        existingInvoice.currency = currency;
        existingInvoice.company_name = companyName;
        savedIssuedInvoice =
          await issuedInvoiceRepository.save(existingInvoice);
      } else {
        // 既存の請求書が存在しない場合は、新しい請求書番号を発行
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

        savedIssuedInvoice =
          await issuedInvoiceRepository.save(issuedInvoiceEntity);
      }

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

// 店舗別明細データ取得（集計済み）
app.get('/api/store-summaries', async (req, res) => {
  try {
    const { companyCode, issuedDate } = req.query;

    if (typeof companyCode !== 'string' || companyCode.trim() === '') {
      return res.status(400).json({ error: 'companyCode is required' });
    }

    if (typeof issuedDate !== 'string' || issuedDate.trim() === '') {
      return res.status(400).json({ error: 'issuedDate is required' });
    }

    // issuedDateはYYYY-MM形式
    const [year, month] = issuedDate.split('-');
    if (!year || !month) {
      return res
        .status(400)
        .json({ error: 'issuedDate format is invalid (YYYY-MM)' });
    }

    // プロンプトのSQLクエリに基づいた集計処理
    const query = `
      WITH started AS (
        SELECT 
          company_code,
          store_code,
          MIN(date) AS start_date_of_use
        FROM store_summary
        WHERE company_code = $1 
          AND total_labels > 0
        GROUP BY company_code, store_code
      )
      SELECT 
        b.store_code AS store_code,
        b.store_name AS store_name,
        s.start_date_of_use AS start_date_of_use,
        COUNT(DISTINCT CASE WHEN b.total_labels > 0 THEN b.date END) AS usage_days,
        ROUND(AVG(CASE WHEN b.total_labels > 0 THEN b.total_labels END), 3) AS avg_label_count,
        ROUND(AVG(CASE WHEN b.total_labels > 0 THEN b.product_updated END), 3) AS avg_product_update_count
      FROM store_summary b
      JOIN started s
        ON b.company_code = s.company_code
       AND b.store_code = s.store_code
      WHERE b.company_code = $1
        AND TO_CHAR(b.date, 'YYYY-MM') = $2
      GROUP BY b.store_code, b.store_name, s.start_date_of_use
      ORDER BY s.start_date_of_use, b.store_code
    `;

    const result = await AppDataSource.query(query, [companyCode, issuedDate]);

    // 結果を正規化
    const normalizedResult = result.map((row: any) => ({
      store_code: row.store_code,
      store_name: row.store_name,
      start_date_of_use: row.start_date_of_use,
      usage_days: parseInt(row.usage_days, 10),
      avg_label_count: parseFloat(row.avg_label_count),
      avg_product_update_count: parseFloat(row.avg_product_update_count),
    }));

    res.json(normalizedResult);
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
