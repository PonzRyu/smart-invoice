import { In } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { StoreSummary } from '../database/entities/StoreSummary';
import {
  customerInfoRepositoryFrom,
  issuedInvoiceRepositoryFrom,
  storeMasterRepositoryFrom,
  storeSummaryRepositoryFrom,
} from '../repositories/typeormRepos';
import { badRequest } from '../utils/httpError';

interface StoreSummaryPayload {
  day: string;
  company: string;
  store: string;
  name?: string;
  totalLabels: number;
  productUpdated: number;
}

export interface UploadInvoiceRequestBody {
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

function getMonthRange(issuedDate: string): { startDate: Date; endDate: Date } {
  const [year, month] = issuedDate.split('-');
  if (!year || !month) {
    throw new Error('利用年月の形式が不正です。');
  }

  const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);

  const nextMonth = parseInt(month, 10) + 1;
  const nextYear = nextMonth > 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
  const nextMonthStr = (nextMonth > 12 ? 1 : nextMonth).toString().padStart(2, '0');
  const endDate = new Date(`${nextYear}-${nextMonthStr}-01T00:00:00.000Z`);

  return { startDate, endDate };
}

export async function uploadInvoiceData(body: UploadInvoiceRequestBody) {
  const { companyId, companyCode, companyName, issuedDate, currency, ttm, summaries } = body;

  if (
    companyId === undefined ||
    !companyCode ||
    !companyName ||
    !issuedDate ||
    !currency ||
    !Array.isArray(summaries)
  ) {
    throw badRequest('Invalid request payload');
  }

  if (summaries.length === 0) {
    throw badRequest('お客様利用データにレコードが存在しません。');
  }

  const headerSet = new Set(
    Object.keys(summaries[0]).map((key) => {
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
  );

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
  if (missingHeaders.length > 0) {
    throw badRequest([
      'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
      `${missingHeaders.join(', ')}データが存在しません。`,
    ]);
  }

  const uniqueCompanies = new Set(summaries.map((s) => s.company));
  if (uniqueCompanies.size !== 1) {
    throw badRequest([
      'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
      'お客様利用データに複数の顧客(Company)が含まれています。お客様利用データは必ず1つの顧客を指定して出力してください。',
    ]);
  }

  const [csvCompany] = Array.from(uniqueCompanies);
  if (csvCompany !== companyCode) {
    throw badRequest([
      '利用顧客名とお客様利用データの顧客名が一致しないです。お客様利用データの中身をご確認ください。',
      `利用顧客名:${companyCode}`,
      `お客様利用データー：${csvCompany}`,
    ]);
  }

  const issuedDateMatch = issuedDate.match(/^(\d{4})-(\d{2})$/);
  if (!issuedDateMatch) {
    throw badRequest('利用年月の形式が不正です。(YYYY-MM)');
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
    const dayRaw = typeof summary.day === 'string' ? summary.day.trim() : String(summary.day ?? '');
    if (dayRaw.length < 7) throw badRequest('日付が不正です。');

    const normalizedDay = dayRaw.replace(/\//g, '-');
    if (normalizedDay.length < 10) throw badRequest('日付が不正です。');

    const csvMonth = normalizedDay.slice(0, 7);
    if (csvMonth !== issuedDate) {
      throw badRequest([
        '利用年月が正しくありません。',
        'お客様利用データの中身を確認して正しい利用年月を指定してください。',
      ]);
    }

    const parsedDate = new Date(`${normalizedDay}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw badRequest(`日付が不正です: ${dayRaw}`);
    }

    const storeCode =
      typeof summary.store === 'string'
        ? summary.store.trim()
        : summary.store !== undefined && summary.store !== null
          ? String(summary.store)
          : '';

    if (storeCode === '') {
      throw badRequest(`店舗コードが不正です: ${summary.store}`);
    }

    const totalLabels = Number(summary.totalLabels);
    const productUpdated = Number(summary.productUpdated);
    if (Number.isNaN(totalLabels) || Number.isNaN(productUpdated)) {
      throw badRequest('ラベル数または更新数が数値ではありません。');
    }

    const isoDate = normalizedDay.slice(0, 10);
    const key = `${companyCode}::${storeCode}::${isoDate}`;

    const storeName =
      typeof summary.name === 'string' && summary.name.trim() !== '' ? summary.name.trim() : null;

    storeSummaryMap.set(key, {
      storeCode,
      storeName,
      dateString: isoDate,
      totalLabels,
      productUpdated,
    });
  }

  const result = await AppDataSource.transaction(async (manager) => {
    const storeSummaryRepo = storeSummaryRepositoryFrom(manager);
    const issuedInvoiceRepo = issuedInvoiceRepositoryFrom(manager);
    const customerRepo = customerInfoRepositoryFrom(manager);
    const storeMasterRepo = storeMasterRepositoryFrom(manager);

    const customer = await customerRepo.findOne({
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
      const storeMasters = await storeMasterRepo.find({
        where: {
          company_code: companyCode,
          store_code: In(uniqueStoreCodes),
        },
      });

      const storeMasterMap = new Map<string, string>();
      for (const storeMaster of storeMasters) {
        if (storeMaster.company_code === companyCode) {
          storeMasterMap.set(storeMaster.store_code, storeMaster.store_name);
        }
      }

      for (const item of storeSummariesArray) {
        if (item.storeName === null) {
          const masterStoreName = storeMasterMap.get(item.storeCode);
          if (masterStoreName) item.storeName = masterStoreName;
        }
      }
    }

    // 該当月の該当company_codeのstore_summaryレコードを削除
    const { startDate, endDate } = getMonthRange(issuedDate);
    await storeSummaryRepo
      .createQueryBuilder()
      .delete()
      .from(StoreSummary)
      .where('company_code = :companyCode', { companyCode })
      .andWhere('date >= :startDate', { startDate })
      .andWhere('date < :endDate', { endDate })
      .execute();

    const storeSummariesToSave = storeSummariesArray.map((item) => {
      const entity = new StoreSummary();
      entity.company_code = companyCode;
      entity.store_code = item.storeCode;
      entity.store_name = item.storeName;
      entity.date = new Date(`${item.dateString}T00:00:00.000Z`);
      entity.total_labels = item.totalLabels;
      entity.product_updated = item.productUpdated;
      return entity;
    });

    if (storeSummariesToSave.length > 0) {
      await storeSummaryRepo.save(storeSummariesToSave);
    }

    const existingInvoice = await issuedInvoiceRepo.findOne({
      where: { company_code: companyCode, issued_date: issuedDate },
    });

    if (existingInvoice) {
      existingInvoice.ttm = ttm ?? null;
      existingInvoice.currency = currency;
      existingInvoice.company_name = companyName;
      return issuedInvoiceRepo.save(existingInvoice);
    }

    const lastInvoice = await issuedInvoiceRepo.findOne({
      where: { issued_date: issuedDate },
      order: { invoice_code: 'DESC' },
    });

    const nextInvoiceCode = lastInvoice ? lastInvoice.invoice_code + 1 : 1;

    const entity = issuedInvoiceRepo.create({
      company_code: companyCode,
      company_name: companyName,
      issued_date: issuedDate,
      invoice_code: nextInvoiceCode,
      currency,
      ttm: ttm ?? null,
    });

    return issuedInvoiceRepo.save(entity);
  });

  return {
    invoice: {
      id: result.id,
      invoice_code: result.invoice_code,
      issued_date: result.issued_date,
    },
  };
}

export async function getIssuedInvoices(companyCode: string) {
  if (typeof companyCode !== 'string' || companyCode.trim() === '') {
    throw badRequest('companyCode is required');
  }

  const repo = issuedInvoiceRepositoryFrom(AppDataSource.manager);
  const invoices = await repo.find({
    where: { company_code: companyCode },
    order: { issued_date: 'DESC', invoice_code: 'DESC' },
  });

  return invoices.map((invoice) => ({
    ...invoice,
    ttm: invoice.ttm !== null && invoice.ttm !== undefined ? Number(invoice.ttm) : null,
  }));
}

export async function getStoreSummaries(companyCode: string, issuedDate: string) {
  if (typeof companyCode !== 'string' || companyCode.trim() === '') {
    throw badRequest('companyCode is required');
  }
  if (typeof issuedDate !== 'string' || issuedDate.trim() === '') {
    throw badRequest('issuedDate is required');
  }

  const [year, month] = issuedDate.split('-');
  if (!year || !month) {
    throw badRequest('issuedDate format is invalid (YYYY-MM)');
  }

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

  return result.map((row: any) => ({
    store_code: row.store_code,
    store_name: row.store_name,
    start_date_of_use: row.start_date_of_use,
    usage_days: parseInt(row.usage_days, 10),
    avg_label_count: parseFloat(row.avg_label_count),
    avg_product_update_count: parseFloat(row.avg_product_update_count),
  }));
}

