import { NextResponse } from 'next/server';
import { processBotTurn } from '../../_lib/bot-engine';
import { hasPaletteAixPlan } from '../../_lib/palette-aix-access';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paletteId = String(body.paletteId || '').trim().toUpperCase();
    const message = String(body.message || '').trim();
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const visitorId = String(body.visitorId || `vis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400, headers: corsHeaders });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400, headers: corsHeaders });
    }

    // Palette AIX プラン契約チェック
    const hasPlan = await hasPaletteAixPlan(paletteId);
    if (!hasPlan) {
      return NextResponse.json(
        { success: false, error: 'Palette AIX プランが必要です', reason: 'plan_required' },
        { status: 403, headers: corsHeaders },
      );
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const referrer = req.headers.get('referer') || undefined;

    const result = await processBotTurn({
      paletteId,
      sessionId,
      message,
      visitorId,
      userAgent,
      referrer,
    });

    return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('bot chat error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'internal error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
