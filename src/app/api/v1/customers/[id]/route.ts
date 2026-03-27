import { NextResponse, type NextRequest } from 'next/server';
import {
  jsonErrorFromUnknown,
  readJson,
} from '../../../../../services/server/http/routeHandlerUtils';
import {
  deleteCustomer,
  getCustomerById,
  updateCustomer,
  type CustomerUpdatePayload,
} from '../../../../../services/server/customers/customersService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const customer = await getCustomerById(id);
    return NextResponse.json(customer);
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const body = await readJson<Partial<CustomerUpdatePayload>>(req);
    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    await deleteCustomer(id);
    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}
