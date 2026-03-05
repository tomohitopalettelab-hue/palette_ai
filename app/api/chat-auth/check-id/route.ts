import { NextRequest, NextResponse } from 'next/server';
import { palDbGet } from '../../_lib/pal-db-client';

export async function GET(req: NextRequest) {
  try {
    const loginId = String(req.nextUrl.searchParams.get('paletteId') || '').trim().toUpperCase();
    if (!loginId) {
      return NextResponse.json({ success: false, error: 'loginId is required' }, { status: 400 });
    }

    const response = await palDbGet(`/api/chat-auth/check-id?loginId=${encodeURIComponent(loginId)}`);
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
