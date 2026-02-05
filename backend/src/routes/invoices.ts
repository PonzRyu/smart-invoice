import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getIssuedInvoicesHandler,
  getStoreSummariesHandler,
  postUploadInvoice,
} from '../controllers/invoicesController';

export const invoicesRouter = Router();

invoicesRouter.post('/upload', asyncHandler(postUploadInvoice));
invoicesRouter.get('/issued', asyncHandler(getIssuedInvoicesHandler));
invoicesRouter.get('/summaries', asyncHandler(getStoreSummariesHandler));

