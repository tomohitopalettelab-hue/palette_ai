import { NextResponse } from 'next/server';
import { getBotConfigOrDefault, upsertBotConfig } from '../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../_lib/agency-scope';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

    const config = await getBotConfigOrDefault(paletteId);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('get bot config error:', error);
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
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

    const body = await req.json().catch(() => ({}));
    const config = await upsertBotConfig({
      paletteId,
      basic: body.basic,
      tone: body.tone,
      conversation: body.conversation,
      goals: body.goals,
      nurture: body.nurture,
      appearance: body.appearance,
      ngRules: body.ngRules,
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('put bot config error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
