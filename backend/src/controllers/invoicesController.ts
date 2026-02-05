import type { Request, Response } from 'express';
import {
  getIssuedInvoices,
  getStoreSummaries,
  uploadInvoiceData,
  type UploadInvoiceRequestBody,
} from '../services/invoicesService';

export async function postUploadInvoice(req: Request, res: Response) {
  const result = await uploadInvoiceData(req.body as UploadInvoiceRequestBody);
  res.status(201).json(result);
}

export async function getIssuedInvoicesHandler(req: Request, res: Response) {
  const companyCode = req.query.companyCode as string | undefined;
  const invoices = await getIssuedInvoices(companyCode ?? '');
  res.json(invoices);
}

export async function getStoreSummariesHandler(req: Request, res: Response) {
  const companyCode = req.query.companyCode as string | undefined;
  const issuedDate = req.query.issuedDate as string | undefined;
  const result = await getStoreSummaries(companyCode ?? '', issuedDate ?? '');
  res.json(result);
}

