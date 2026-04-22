import { NextResponse } from 'next/server';
import { getSession } from '../../../../_lib/bot-store';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const paletteId = String(searchParams.get('paletteId') || '').trim().toUpperCase();

    const session = await getSession(id);
    if (!session || (paletteId && session.paletteId !== paletteId)) {
      return NextResponse.json({ success: false, error: 'session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('get reports session error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
