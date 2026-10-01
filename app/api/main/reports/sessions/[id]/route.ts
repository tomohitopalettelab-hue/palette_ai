import { NextResponse } from 'next/server';
import { getSession } from '../../../../_lib/bot-store';
import { assertReportAccess } from '../../../../_lib/report-access';
import { hasPaletteAixPlan } from '../../../../_lib/palette-aix-access';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const paletteId = String(searchParams.get('paletteId') || '').trim().toUpperCase();

    if (!/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const access = await assertReportAccess(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const hasPlan = await hasPaletteAixPlan(paletteId);
    if (!hasPlan) {
      return NextResponse.json({ success: false, error: 'Palette AIX プランが必要です', reason: 'plan_required' }, { status: 403 });
    }
    const session = await getSession(id);
    if (!session || session.paletteId !== paletteId) {
      return NextResponse.json({ success: false, error: 'session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('get reports session error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
