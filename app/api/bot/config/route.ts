import { NextResponse } from 'next/server';
import { getBotConfigOrDefault, listServices, listFaqs, isAccountSuspended } from '../../_lib/bot-store';
import { hasPaletteAixPlan } from '../../_lib/palette-aix-access';

// CORS: widget.jsから任意のオリジンで呼ばれる
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paletteId = (searchParams.get('paletteId') || searchParams.get('id') || '').trim().toUpperCase();

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400, headers: corsHeaders });
    }

    // 管理画面からの停止チェック（URL停止）
    const suspended = await isAccountSuspended(paletteId);
    if (suspended) {
      return NextResponse.json(
        { success: false, error: 'このBotは停止中です。', reason: 'suspended' },
        { status: 403, headers: corsHeaders },
      );
    }

    // Palette AIX プラン契約チェック
    const hasPlan = await hasPaletteAixPlan(paletteId);
    if (!hasPlan) {
      return NextResponse.json(
        { success: false, error: 'Palette AIX プランが必要です。ご契約内容をご確認ください。', reason: 'plan_required' },
        { status: 403, headers: corsHeaders },
      );
    }

    const [config, services, faqs] = await Promise.all([
      getBotConfigOrDefault(paletteId),
      listServices(paletteId, true),
      listFaqs(paletteId),
    ]);

    // widget向けにはサービス全データ、FAQ、公開可能な設定のみ返す
    return NextResponse.json({
      success: true,
      config: {
        paletteId,
        basic: config.basic,
        tone: config.tone,
        conversation: {
          welcomeMessage: config.conversation.welcomeMessage,
          cardCount: config.conversation.cardCount,
          cardShow: config.conversation.cardShow,
          leadFields: config.conversation.leadFields,
        },
        goals: config.goals,
        nurture: config.nurture,
        appearance: config.appearance,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        description: s.description,
        features: s.features,
        testimonial: s.testimonial,
      })),
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer, category: f.category })),
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('bot config error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { success: false, error: String(error?.message || 'internal error').slice(0, 200) },
      { status: 500, headers: corsHeaders },
    );
  }
}
