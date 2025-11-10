import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { AppDataSource } from './database/data-source';
import { CustomerInfo } from './database/entities/CustomerInfo';
import { IssuedInvoice } from './database/entities/IssuedInvoice';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
