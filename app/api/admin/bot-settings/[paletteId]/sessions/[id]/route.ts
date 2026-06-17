import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '../../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../../_lib/agency-scope';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const deleted = await deleteSession(id, paletteId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('delete session error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
