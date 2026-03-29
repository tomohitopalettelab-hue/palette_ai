import { NextResponse } from 'next/server';
import { getChatSession } from '../../_lib/chat-store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 },
      );
    }

    const session = await getChatSession(id);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません。' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('GET /api/chat-sessions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの取得に失敗しました。' },
      { status: 500 },
    );
  }
}
