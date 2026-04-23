import { NextResponse } from 'next/server';
import { getBotConfigOrDefault } from '../../../../_lib/bot-store';
import { sendBotNotifications } from '../../../../_lib/notification-sender';

/**
 * POST /api/admin/bot-settings/[paletteId]/notify-test
 * 保存済みのnotify設定で、ダミーリードを使ってテスト通知を送信
 */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();

    const config = await getBotConfigOrDefault(paletteId);
    if (!config.goals?.notify?.enabled) {
      return NextResponse.json(
        { success: false, error: 'AIヒアリング通知が無効です。有効にしてから保存してください。' },
        { status: 400 },
      );
    }

    const appUrl = process.env.APP_URL?.trim() || 'https://ai.palette-lab.com';

    // ダミーセッション
    const dummySession: any = {
      id: 'test-' + Date.now(),
      paletteId,
      visitorId: 'test-visitor',
      stage: 'closing',
      buyIntentScore: 5,
      matchedServiceIds: [],
      selectedServiceId: null,
      messages: [
        { role: 'visitor', content: 'こんにちは、サービスについて聞きたいです', timestamp: new Date().toISOString() },
        { role: 'bot', content: 'ご質問ありがとうございます！', timestamp: new Date().toISOString() },
        { role: 'visitor', content: '予約したいです', timestamp: new Date().toISOString() },
      ],
      lead: {
        name: 'テスト太郎',
        phone: '090-0000-0000',
        email: 'test@example.com',
        preferredTime: '明日の15時',
      },
      closedAction: 'notify',
      closed: true,
      userAgent: null,
      referrer: null,
      syncedToCrm: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sendBotNotifications({
      config,
      session: dummySession,
      conversationUrl: `${appUrl}/admin/bot-settings/${paletteId}/sessions/test`,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('notify-test error:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'internal error' }, { status: 500 });
  }
}
