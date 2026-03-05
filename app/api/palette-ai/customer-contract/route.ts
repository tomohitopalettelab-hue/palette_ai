import { NextRequest, NextResponse } from 'next/server';
import { palDbGet } from '../../_lib/pal-db-client';

export async function GET(req: NextRequest) {
  try {
    const paletteCustomerId = req.nextUrl.searchParams.get('paletteCustomerId')?.trim() || '';
    const activeOn = req.nextUrl.searchParams.get('activeOn')?.trim() || undefined;

    if (!paletteCustomerId) {
      return NextResponse.json(
        { success: false, error: 'paletteCustomerId is required' },
        { status: 400 },
      );
    }

    const params = new URLSearchParams();
    params.set('paletteId', paletteCustomerId);
    if (activeOn) params.set('activeOn', activeOn);

    const response = await palDbGet(`/api/palette-summary?${params.toString()}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET /api/palette-ai/customer-contract Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
