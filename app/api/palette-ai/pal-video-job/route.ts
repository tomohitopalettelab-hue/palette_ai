import { NextRequest, NextResponse } from 'next/server';
import { palDbPost } from '../../_lib/pal-db-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paletteId = String(body?.paletteId || '').trim();
    if (!paletteId) {
      return NextResponse.json(
        { success: false, error: 'paletteId is required' },
        { status: 400 },
      );
    }

    const response = await palDbPost('/api/pal-video/jobs', body || {});
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/palette-ai/pal-video-job Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
