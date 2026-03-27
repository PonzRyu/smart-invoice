import { NextResponse, type NextRequest } from 'next/server';
import {
  jsonErrorFromUnknown,
  readJson,
} from '../../../../../services/server/http/routeHandlerUtils';
import {
  uploadInvoiceData,
  type UploadInvoiceRequestBody,
} from '../../../../../services/server/invoices/invoicesService';

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<UploadInvoiceRequestBody>(req);
    const result = await uploadInvoiceData(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return jsonErrorFromUnknown(e);
  }
}
