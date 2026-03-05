import { NextRequest, NextResponse } from 'next/server';
import { palDbGet, palDbPost } from '../../_lib/pal-db-client';
import { listPaletteAiAccountsFromPalDb } from '../../_lib/palette-ai-accounts';

export async function GET() {
  try {
    const accounts = await listPaletteAiAccountsFromPalDb();
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error('GET /api/admin/accounts Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      paletteId: body?.paletteId || body?.paletteCustomerId,
    };
    const response = await palDbPost('/api/accounts', payload);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/admin/accounts Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
