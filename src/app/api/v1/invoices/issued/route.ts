import { NextResponse, type NextRequest } from 'next/server';
import { jsonErrorFromUnknown } from '../../../../../services/server/http/routeHandlerUtils';
import { getIssuedInvoices } from '../../../../../services/server/invoices/invoicesService';

export async function GET(req: NextRequest) {
  try {
    const companyCode = req.nextUrl.searchParams.get('companyCode') ?? '';
    const invoices = await getIssuedInvoices(companyCode);
    return NextResponse.json(invoices);
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}
