import { NextRequest, NextResponse } from 'next/server';
import { palDbGet, palDbPost } from '../../_lib/pal-db-client';

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId') || undefined;
    const paletteCustomerId = req.nextUrl.searchParams.get('paletteCustomerId') || undefined;
    const activeOn = req.nextUrl.searchParams.get('activeOn') || undefined;

    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (paletteCustomerId) params.set('paletteId', paletteCustomerId);
    if (activeOn) params.set('activeOn', activeOn);

    const response = await palDbGet(`/api/contracts?${params.toString()}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET /api/admin/contracts Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await palDbPost('/api/contracts', body || {});
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/admin/contracts Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
