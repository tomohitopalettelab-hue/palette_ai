import { NextResponse } from 'next/server';
import { getSession } from '../../../../../_lib/bot-store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const session = await getSession(id);
    if (!session || session.paletteId !== paletteId) {
      return NextResponse.json({ success: false, error: 'session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('get session error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
