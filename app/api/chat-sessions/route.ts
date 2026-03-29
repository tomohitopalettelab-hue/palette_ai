import { NextResponse } from 'next/server';
import {
  getChatSessions,
  upsertChatSession,
  deleteChatSession,
} from '../_lib/chat-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paletteId = searchParams.get('paletteId')?.trim().toUpperCase();

    if (!paletteId) {
      return NextResponse.json(
        { success: false, error: 'paletteId is required' },
        { status: 400 },
      );
    }

    const sessions = await getChatSessions(paletteId);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('GET /api/chat-sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'セッション一覧の取得に失敗しました。' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, paletteId, title, serviceMode, messages } = body;

    if (!id || !paletteId) {
      return NextResponse.json(
        { success: false, error: 'id and paletteId are required' },
        { status: 400 },
      );
    }

    const session = await upsertChatSession({
      id,
      paletteId: String(paletteId).trim().toUpperCase(),
      title: title || '',
      serviceMode: serviceMode || 'none',
      messages: Array.isArray(messages) ? messages : [],
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('POST /api/chat-sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの保存に失敗しました。' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 },
      );
    }

    await deleteChatSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/chat-sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの削除に失敗しました。' },
      { status: 500 },
    );
  }
}
