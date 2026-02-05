import type { Request, Response } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
} from '../services/customersService';

export async function getCustomers(_req: Request, res: Response) {
  const customers = await listCustomers();
  res.json(customers);
}

export async function getCustomer(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const customer = await getCustomerById(id);
  res.json(customer);
}

export async function postCustomer(req: Request, res: Response) {
  const customer = await createCustomer(req.body);
  res.status(201).json(customer);
}

export async function putCustomer(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const customer = await updateCustomer(id, req.body);
  res.json(customer);
}

export async function removeCustomer(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await deleteCustomer(id);
  res.json({ message: 'Customer deleted successfully' });
}

