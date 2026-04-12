import { NextRequest, NextResponse } from 'next/server';

const getCrmBaseUrl = (): string =>
  process.env.PAL_CRM_BASE_URL?.trim() ||
  process.env.PAL_DB_BASE_URL?.trim() ||
  'http://localhost:3107';

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

    // palette_crm の video-jobs API に直接投稿
    const base = getCrmBaseUrl().replace(/\/$/, '');
    const response = await fetch(`${base}/api/crm/video-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/palette-ai/pal-video-job Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
