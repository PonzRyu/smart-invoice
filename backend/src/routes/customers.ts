import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getCustomer,
  getCustomers,
  postCustomer,
  putCustomer,
  removeCustomer,
} from '../controllers/customersController';

export const customersRouter = Router();

customersRouter.get('/', asyncHandler(getCustomers));
customersRouter.get('/:id', asyncHandler(getCustomer));
customersRouter.post('/', asyncHandler(postCustomer));
customersRouter.put('/:id', asyncHandler(putCustomer));
customersRouter.delete('/:id', asyncHandler(removeCustomer));

