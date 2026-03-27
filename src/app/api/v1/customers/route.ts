import { NextResponse, type NextRequest } from 'next/server';
import {
  jsonErrorFromUnknown,
  readJson,
} from '../../../../services/server/http/routeHandlerUtils';
import {
  createCustomer,
  listCustomers,
  type CustomerCreatePayload,
} from '../../../../services/server/customers/customersService';

export async function GET() {
  try {
    const customers = await listCustomers();
    return NextResponse.json(customers);
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Partial<CustomerCreatePayload>>(req);
    const customer = await createCustomer(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}
