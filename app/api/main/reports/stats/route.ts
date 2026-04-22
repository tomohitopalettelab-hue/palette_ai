import { NextResponse } from 'next/server';
import { getSessionStats } from '../../../_lib/bot-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paletteId = String(searchParams.get('paletteId') || '').trim().toUpperCase();
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const stats = await getSessionStats(paletteId);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('reports stats error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
