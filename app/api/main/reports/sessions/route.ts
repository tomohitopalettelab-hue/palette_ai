import { NextResponse } from 'next/server';
import { listSessions } from '../../../_lib/bot-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paletteId = String(searchParams.get('paletteId') || '').trim().toUpperCase();
    const minScore = Number(searchParams.get('minScore') || 0);
    const limit = Number(searchParams.get('limit') || 100);
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }

    const sessions = await listSessions(paletteId, { limit, minScore });
    const summaries = sessions.map((s) => ({
      id: s.id,
      stage: s.stage,
      buyIntentScore: s.buyIntentScore,
      selectedServiceId: s.selectedServiceId,
      closed: s.closed,
      closedAction: s.closedAction,
      leadName: s.lead?.name || '',
      firstMessage: s.messages.find((m) => m.role === 'visitor')?.content?.slice(0, 60) || '',
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    return NextResponse.json({ success: true, sessions: summaries });
  } catch (error: any) {
    console.error('reports sessions error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
