import { NextRequest, NextResponse } from 'next/server';
import { palDbGet } from '../../_lib/pal-db-client';

export async function GET(req: NextRequest) {
  try {
    const paletteId = req.nextUrl.searchParams.get('paletteId')?.trim() || '';
    const activeOn = req.nextUrl.searchParams.get('activeOn')?.trim() || undefined;

    if (!paletteId) {
      return NextResponse.json(
        { success: false, error: 'paletteId is required' },
        { status: 400 },
      );
    }

    const params = new URLSearchParams();
    params.set('paletteId', paletteId);
    if (activeOn) params.set('activeOn', activeOn);

    const response = await palDbGet(`/api/palette-services?${params.toString()}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET /api/palette-ai/services-by-palette-id Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
