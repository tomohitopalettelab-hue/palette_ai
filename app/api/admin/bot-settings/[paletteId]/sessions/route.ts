import { NextResponse } from 'next/server';
import { listSessions, getSessionStats, deleteAllSessions } from '../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../_lib/agency-scope';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const { searchParams } = new URL(req.url);
    const minScore = Number(searchParams.get('minScore') || 0);
    const limit = Number(searchParams.get('limit') || 100);
    const closedOnly = searchParams.get('closedOnly') === '1';

    const [sessions, stats] = await Promise.all([
      listSessions(paletteId, { limit, minScore, closedOnly }),
      getSessionStats(paletteId),
    ]);

    // Summary list (no full messages)
    const summaries = sessions.map((s) => ({
      id: s.id,
      paletteId: s.paletteId,
      visitorId: s.visitorId,
      stage: s.stage,
      buyIntentScore: s.buyIntentScore,
      selectedServiceId: s.selectedServiceId,
      closed: s.closed,
      closedAction: s.closedAction,
      syncedToCrm: s.syncedToCrm,
      leadName: s.lead?.name || '',
      firstMessage: s.messages.find((m) => m.role === 'visitor')?.content?.slice(0, 60) || '',
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({ success: true, sessions: summaries, stats });
  } catch (error: any) {
    console.error('list sessions error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const count = await deleteAllSessions(paletteId);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('delete all sessions error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
