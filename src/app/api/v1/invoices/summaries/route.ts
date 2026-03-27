import { NextResponse, type NextRequest } from 'next/server';
import { jsonErrorFromUnknown } from '../../../../../services/server/http/routeHandlerUtils';
import { getStoreSummaries } from '../../../../../services/server/invoices/invoicesService';

export async function GET(req: NextRequest) {
  try {
    const companyCode = req.nextUrl.searchParams.get('companyCode') ?? '';
    const issuedDate = req.nextUrl.searchParams.get('issuedDate') ?? '';
    const result = await getStoreSummaries(companyCode, issuedDate);
    return NextResponse.json(result);
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}
