import { NextResponse } from 'next/server';
import { getReceptionDid, setReceptionDid, clearReceptionDid } from '../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../_lib/agency-scope';

// AI電話受付: この paletteId に割り当てる Twilio 着信DID の取得/設定/解除

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const did = await getReceptionDid(paletteId);
    return NextResponse.json({ success: true, did: did || '' });
  } catch (error: any) {
    console.error('get reception did error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const body = await req.json().catch(() => ({}));
    const did = String(body.did || '').trim();
    if (did) {
      await setReceptionDid(paletteId, did);
    } else {
      await clearReceptionDid(paletteId);
    }
    return NextResponse.json({ success: true, did });
  } catch (error: any) {
    console.error('set reception did error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
